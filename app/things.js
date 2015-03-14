/*
 *  things.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-01-08
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var iotdb = require('iotdb');
var _ = iotdb.helpers;
var cfg = iotdb.cfg;

var mqtt = require('./mqtt');
var settings = require('./settings');
var helpers = require('./helpers');
var interactors = require('./interactors');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'things',
});

/**
 *  Returns a Thing by thing_id
 */
var _get_thing = function(thing_id) {
    var iot = iotdb.iot();
    var things = iot.things()
    for (var ti = 0; ti < things.length; ti++) {
        var t = things[ti];
        if (t.thing_id() == thing_id) {
            return t
        }
    }

    console.log("# _get_thing: thing not found", thing_id)
    return null
}

var scrub_id = function(v) {
    if (!v) {
        return ""
    } else {
        return v.replace(/.*#/, '')
    }
}

var structured = {};

/**
 *  Clean up the structure. You can do this whenever
 *  you want - it will be rebuilt when need in
 *  _structure_thing. Specifically, you'll want to
 *  clear structures when the metadata changes.
 */
var _clear_structure = function(thing) {
    if (thing === undefined) {
        structured = {}; 
    } else {
        structured[thing.thing_id()] = undefined;
    }
}

/*
 *  Preprocess attributes
 *  - compact everything
 *  - find out if control or reading attibute
 */
var _structure_thing = function(thing) {
    var s = structured[thing.thing_id()];
    if (s) {
        return s;
    }

    var meta = thing.meta();
    var thing_name = meta.get('schema:name') || thing.name;

    /*
     *  Do initial pre-processing on attributes
     */
    var catd = {};
    var tats = thing.attributes()
    for (var tax in tats) {
        var tat = tats[tax]

        var cat = _.ld.compact(tat)
        cat._code = tat.get_code()

        var name = _.ld.first(cat, 'schema:name')
        cat['@id'] = "/api/things/" + thing.thing_id() + "/#" + cat._code;
        cat._name = name || cat._code;
        cat._thing_id = thing.thing_id();
        cat._thing_name = thing_name;
        cat._thing_group = thing_name + "@@" + thing.thing_id();
        cat._id = thing.thing_id() + "/#" + cat._code;
        cat.group = thing_name;

        var cid = scrub_id(_.ld.first(cat, "@id", ""))
        if (_.ld.list(cat, 'iot:role') === undefined) {
            cat._out = cid
            cat._in = cid
        } 
        if (_.ld.contains(cat, 'iot:role', 'iot-attribute:role-control')) {
            cat._out = cid
        }
        if (_.ld.contains(cat, 'iot:role', 'iot-attribute:role-reading')) {
            cat._in = cid
        }

        catd[cid] = cat
    }

    /**
     *  Group related control/reading attributes together
     */
    for (var cid in catd) {
        var cat = catd[cid]
        if (cat._use === undefined) {
            cat._use = true
        }

        var rids = _.ld.list(cat, "iot:related-role", [])
        for (var rix in rids) {
            var rid = scrub_id(rids[rix])
            var rat = catd[rid]
            if (rat === undefined) {
                continue
            }

            if (rat._use === undefined) {
                rat._use = false
            }
            if (cat._out && !rat._out) {
                rat._out = cat._out
            }
            if (cat._in && !rat._in) {
                rat._in = cat._in
            }
        }

    }

    var cats = [];
    for (var ci in catd) {
        var cat = catd[ci];
        if (!cat._use) {
            continue;
        }

        cats.push(cat);
    }

    s = {
        thing_id: thing.thing_id(),
        cats: cats
    };
    structured[thing.thing_id()] = s;

    return s;
};


var structured = function() {
    var things = iotdb.iot().things();

    // order things by thing_name first
    var tts = [];
    for (var ti = 0; ti < things.length; ti++) {
        var thing = things[ti];
        var meta = thing.meta();
        var thing_name = meta.get('schema:name') || thing.name;
        if (thing_name === undefined) {
            continue
        }

        tts.push([ thing_name, thing ]);
    }

    tts.sort();

    // then get all the compressed attributes
    var cats = [];
    for (var ti in tts) {
        var tt = tts[ti];
        var thing = tt[1];
        var state = thing.state();
        var s = _structure_thing(thing);

        for (var ci in s.cats) {
            var cat = s.cats[ci];
            cat.state = state;

            cats.push(cat);
        }
    }

    return cats;
};

var _make_thing = function(f) {
    return function (request, response) {
        logger.info({
            method: "_make_thing",
            recipe_id: request.params.thing_id,
            body: request.body,
        }, "called");

        var thing = _get_thing(request.params.thing_id);
        if (!thing) {
            return response
                .set('Content-Type', 'application/json')
                .status(404)
                .send(JSON.stringify({
                    error: "thing not found",
                    thing_id: request.params.thing_id
                }, null, 2))
                ;
        }

        response.set('Content-Type', 'application/json');
        response.send(JSON.stringify(f(thing, request, response), null, 2));
    };
};

/**
 */
var thing_istate = function(thing) {
    return _.extend(
        thing.state({ istate: true, ostate: false }),
        {
            "@id": "/api/things/" + thing.thing_id() + "/istate",
        }
    );
};

/**
 */
var thing_ostate = function(thing) {
    return _.extend(
        thing.state({ istate: false, ostate: true }),
        {
            "@id": "/api/things/" + thing.thing_id() + "/ostate",
        }
    );
};

/**
 */
var thing_meta = function(thing) {
    return _.ld.compact(
        thing.meta().state(),
        {
            "@id": "/api/things/" + thing.thing_id() + "/meta",
        }
    );
};

/**
 */
var thing_model = function(thing) {
    var md = _.ld.compact(thing.jsonld({
        // base: "/api/things/" + thing.thing_id() + "/model",
    }));

    md["@context"] = {
        "iot": _.ld.namespace["iot"],
        "iot-unit": _.ld.namespace["iot-unit"],
        "iot-attribute": _.ld.namespace["iot-attribute"],
        "schema": _.ld.namespace["schema"],
    },
    md["@id"] = "/api/things/" + thing.thing_id() + "/model";

    var meta = thing.meta();
    md._id = thing.thing_id();
    md._name = meta.get("schema:name");

    var ads = _.ld.list(md, "iot:attribute", []);
    for (var adi in ads) {
        var ad = ads[adi];
        ad._code = ad["@id"].replace(/^.*#/, '');
        ad._control = false;
        ad._reading = false;
        ad._name = _.ld.first(ad, "schema:name");

        var roles = _.ld.list(ad, 'iot:role');
        if (!roles) {
            ad._control = true;
            ad._reading = true;
        } else {
            for (var ri in roles) {
                var role = roles[ri];
                if (role === 'iot-attribute:role-control') {
                    ad._control = true;
                } else if (role === 'iot-attribute:role-reading') {
                    ad._reading = true;
                }
            }
        }

        interactors.assign_interactor_to_attribute(ad);
    }

    return md;
};

/*
 */
var things = function() {
    var tds = [];
    var things = iotdb.iot().things();

    for (var ti = 0; ti < things.length; ti++) {
        var thing = things[ti];
        var td = {};
        var tmodel = thing_model(thing);

        td["_id"] = tmodel._id;
        td["_name"] = tmodel._name;
        td["_sort"] = tmodel._name + "@@" + tmodel._id;
        td["_section"] = "things";
        td["model"] = tmodel;
        td["istate"] = thing_istate(thing);
        td["ostate"] = thing_ostate(thing);
        td["meta"] = thing_meta(thing);

        tds.push(td);
    }

    tds.sort(function(a, b) {
        if (a._sort < b._sort) {
            return -1;
        } else if (a._sort > b._sort) {
            return 1
        } else {
            return 0;
        }
    });

    return tds;
};

/**
 *   get '/api/things/:thing_id/istate'
 */
var get_istate = _make_thing(thing_istate);

/**
 *   get '/api/things/:thing_id/ostate'
 */
var get_ostate = _make_thing(thing_ostate);

/**
 *   put '/api/things/:thing_id/ostate'
 */
var put_ostate = _make_thing(function(thing, request, response) {
    thing.update(request.body, { notify: true });

    return {};
});

/**
 *   get '/api/things/:thing_id/meta'
 */
var get_meta = _make_thing(thing_meta);

/**
 *   get '/api/things/:thing_id/model'
 */
var get_model = _make_thing(thing_model);

/**
 */
var setup = function() {
    var iot = iotdb.iot();
    var things = iot.connect();

    things.on_thing(function(thing) {
        thing.on("state", function(thing) {
            var topic = settings.d.mqttd.prefix + "api/things/" + thing.thing_id() + "/istate";
            var payload = thing_istate(thing);

            mqtt.publish(settings.d.mqttd, topic, payload);
        });
        thing.on("meta", function(thing) {
            var topic = settings.d.mqttd.prefix + "api/things/" + thing.thing_id() + "/meta";
            var payload = thing_meta(thing);

            mqtt.publish(settings.d.mqttd, topic, payload);
            
            // _clear_structure(thing);
            // someday publish a metadata change
        });
    });
};

/**
 *  API
 */
exports.setup = setup;

exports.get_istate = get_istate;
exports.get_ostate = get_ostate;
exports.put_ostate = put_ostate;
exports.get_meta = get_meta;
exports.get_model = get_model;

exports.thing_istate = thing_istate;
exports.thing_ostate = thing_ostate;
exports.thing_meta = thing_meta;
exports.thing_model = thing_model;

exports.things = things;
