/*
 *  recipe.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-14
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

var settings = require('./settings');
var interactors = require('./interactors');
var auth = require('./auth');
var users = require('./users');

var RecipeTransport = require('./RecipeTransport').RecipeTransport;
var MQTTTransport = require('iotdb-transport-mqtt').Transport;
var ExpressTransport = require('iotdb-transport-express').Transport;

var events = require('events');
var util = require('util');
var path = require('path');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/recipe',
});

var recipe_to_id;

/**
 *  The "Context" is basically does the work of
 *  managing a running Recipe. You make them
 *  using the 'context' function below.
 *  <p>
 *  Might be horrible idea. Stop judging me.
 */
var Context = function (reciped) {
    var self = this;

    self.reciped = reciped;
    self.id = recipe_to_id(reciped);

    self.reciped._context = self;
    self.reciped.state = {};

    self.created_timestamp = _.timestamp.make();
    self.modified_timestamp = _.timestamp.make();
    self.execute_timestamp = _.timestamp.make();

    self.status = {
        running: false,
        text: null,
        html: null,
        number: null,
        message: null,
    };

    events.EventEmitter.call(self);

    self.setMaxListeners(0);
};

util.inherits(Context, events.EventEmitter);

/*
 *  This is how you get Context objects
 */
var make_context = function (reciped) {
    if (reciped._context) {
        return reciped._context;
    } else {
        return new Context(reciped);
    }
};

/*
 *  Format and emit a message (this will be picked up by MQTT elsewhere)
 *  This message should reflect the running state.
 */
Context.prototype.message = function (first) {
    var self = this;
    var old_running = self.status.running;
    var od = _.shallowCopy(self.status);

    if (first === undefined) {
        self.status.running = false;
        self.status.message = null;
    } else {
        self.status.running = true;
        self.status.message = util.format.apply(util.apply, Array.prototype.slice.call(arguments));
    }

    var changed = false;
    if (self.status.running !== od.running) {
        changed = true;
    } else if (self.status.message !== od.message) {
        changed = true;
    }

    if (!changed) {
        return;
    }

    /*
     *  Unfortunately we are sharing 'running' on 'ostate' also.
     *  Therefore, a change in running status must change
     *  our execute_timestamp
     */
    if (old_running !== self.status.running) {
        self.execute_timestamp = _.timestamp.make();
    }

    self.modified_timestamp = _.timestamp.make();
    self.emit("status");
};

/*
 *  Change (and emit) the state of this recipe. Typically
 *  this will be a string or whatever. It does not
 *  change the running state.
 */
Context.prototype.state = function (state) {
    var self = this;

    var od = _.shallowCopy(self.status);

    if ((state === undefined) || (state === null)) {
        self.status.text = null;
        self.status.html = null;
        self.status.number = null;
    } else if (_.isString(state)) {
        self.status.text = state;
        self.status.html = null;
        self.status.number = null;
    } else if (_.isBoolean(state)) {
        self.status.text = null;
        self.status.html = null;
        self.status.number = state ? 1 : 0;
    } else if (_.isNumber(state)) {
        self.status.text = null;
        self.status.html = null;
        self.status.number = state;
    } else if (!_.isObject(state)) {
        self.status.text = null;
        self.status.html = null;
        self.status.number = null;
    } else if (state) {
        _.extend(self.status, state);
    }

    var changed = false;
    if (self.status.text !== od.text) {
        changed = true;
    } else if (self.status.html !== od.html) {
        changed = true;
    } else if (self.status.number !== od.number) {
        changed = true;
    }

    if (changed) {
        self.modified_timestamp = _.timestamp.make();
        self.emit("status");
    }
};

/*
 *  Call the validate function on a recipe.
 *  Typically you'll just 'watch' to watch things,
 *  which will call validate when anyhing
 *  interesting changes
 */
Context.prototype.validate = function () {
    var self = this;
    if (self.reciped.onvalidate) {
        self.reciped.onvalidate(self);
    }
};

/**
 *  Finished. The message is sent to empty
 *  and the running state is set to false.
 *  All after a short delay.
 */
Context.prototype.done = function (timeout) {
    var self = this;

    if (timeout === undefined) {
        timeout = 0.8;
    }

    setTimeout(function () {
        self.message();
    }, timeout * 1000);
};

Context.prototype.onclick = function (value) {
    var self = this;

    self.status.running = false;

    if (self.reciped.onclick) {
        if (self.reciped._valued !== undefined) {
            value = self.reciped._valued[value];
        }

        _.timestamp.update(self, {
            key: 'execute_timestamp',
        });

        // self.execute_timestamp = _.timestamp.make();
        // console.log("HERE:ONCLICK", self.execute_timestamp);
        self.reciped.onclick(self, value);
    } else {
        logger.info({
            method: "onclick",
            cause: "attempt by the user to 'click' a recipe that doesn't want to be clicked",
        }, "no 'onclick' method");
    }
};

/**
 *  Use this to load recipes
 *  <p>
 *  They end up in iot.data('recipes')
 */
var load_recipes = function (initd) {
    var self = this;

    initd = _.defaults(initd, {
        cookbooks_path: settings.d.cookbooks_path,
    });

    logger.info({
        method: "_load_recipes",
        cookbooks_path: initd.cookbooks_path,
    }, "loading recipes");

    var filenames = cfg.cfg_find(iotdb.iot().envd, initd.cookbooks_path, /[.]js$/);
    cfg.cfg_load_js(filenames, function (paramd) {
        if (paramd.error !== undefined) {
            if (paramd.filename) {
                logger.error({
                    method: "_load_recipes",
                    filename: paramd.filename,
                    error: paramd.error,
                    exception: paramd.exception ? "" + paramd.exception : "",
                }, "error loading JS Model");
            }
            return;
        }

        logger.debug({
            method: "_load_recipes",
            filename: paramd.filename
        }, "found Model");

        // this resets the groups and ID for every file
        iotdb.cookbook();
    });
};

/**
 *  Call me once
 */
var _init_recipe;
var init_recipes = function () {
    var iot = iotdb.iot();
    var cds = iot.data("recipe");
    if (!cds || !cds.length) {
        return;
    }

    for (var ci in cds) {
        _init_recipe(cds[ci]);
    }
};

var _init_recipe = function (reciped) {
    reciped._id = recipe_to_id(reciped);
    reciped.state = {};

    /* enabled: if false, do not use */
    if (reciped.enabled === false) {
        return;
    }

    /* this handles manipulating the recipe */
    var context = make_context(reciped);

    /* IOTDB types */
    var keys = ["value", "type", "format", "unit", ];
    for (var ki in keys) {
        var key = keys[ki];

        var value = reciped[key];
        if (value === undefined) {
            continue;
        }

        value = _.ld.compact(reciped[key], {
            json: true,
            scrub: true
        });

        if (_.isObject(value)) {
            var vkeys = ["iot:type", "iot:format", "iot:unit", "iot:purpose", ];
            for (var vi in vkeys) {
                var vkey = vkeys[vi];
                var vvalue = value[vkey];
                if ((vvalue !== undefined) && (_.isArray(vvalue) || !_.isObject(vvalue))) {
                    reciped[vkey] = vvalue;
                }
            }
        } else {
            reciped[key] = value;
        }
    }


    delete reciped.value;
    if (reciped.type) {
        reciped['iot:type'] = reciped.type;
        delete reciped.type;
    }
    if (reciped.format) {
        reciped['iot:format'] = reciped.format;
        delete reciped.format;
    }
    if (reciped.type) {
        reciped['iot:unit'] = reciped.unit;
        delete reciped.unit;
    }
    if (reciped.purpose) {
        reciped['iot:purpose'] = reciped.purpose;
        delete reciped.purpose;
    }

    reciped._name = reciped.name;

    /* JavaScript types */
    var type = reciped['iot:type'];
    if (type === undefined) {
        if (reciped.values) {
            reciped['iot:type'] = 'iot:string';
        } else {
            reciped['iot:type'] = 'iot:null';
        }
    }

    /* run: old name for onclick: */
    if ((reciped.run !== undefined) && (reciped.onclick === undefined)) {
        reciped.onclick = reciped.run;
    }

    /* watch: ThingArrays we need to monitor for reachable changes */
    if (reciped.watch) {
        if (!_.isArray(reciped.watch)) {
            reciped.watch = [reciped.watch];
        }

        var _validate = function () {
            context.validate();
        };

        for (var wi in reciped.watch) {
            var things = reciped.watch[wi];

            things.on_thing(_validate);
            things.on_meta(_validate);
        }
    }

    /* validation function default */
    if (reciped.watch && !reciped.onvalidate) {
        reciped.onvalidate = function (context) {
            for (var wi in reciped.watch) {
                var things = reciped.watch[wi];
                if (things.reachable() === 0) {
                    context.state("Some Things have not been found (yet)");
                    return;
                }
            }

            context.state("");
        };
    }

    /* oninit: initialization function */
    if (reciped.oninit) {
        reciped.oninit(context);
    }

    context.validate();
};

/**
 *  Use this for the standard ordering of Actions
 */
var order_recipe = function (a, b) {
    if (a.group < b.group) {
        return -1;
    } else if (a.group > b.group) {
        return 1;
    }

    if (a.name < b.name) {
        return -1;
    } else if (a.name > b.name) {
        return 1;
    }

    return 0;
};

/**
 *  Make a unique ID for an Action
 */
var recipe_to_id = function (reciped) {
    if (reciped.group_id) {
        return "urn:iotdb:recipe:" + reciped.group_id;
    } else {
        return "urn:iotdb:recipe:" + _.hash.md5("2014-12-13T06:34:00", reciped.group, reciped.name);
    }
};

/**
 *  Find an Action by ID
 */
var recipe_by_id = function (id) {
    var iot = iotdb.iot();
    var cds = iot.data("recipe");
    if (!cds || !cds.length) {
        return null;
    }

    for (var ci in cds) {
        var reciped = cds[ci];
        if (reciped.enabled === false) {
            continue;
        }
        if (recipe_to_id(reciped) === id) {
            return reciped;
        }
    }

    return null;
};

/**
 *  Group recipes by their group,
 *  then sort by name. The
 *  returned datastructure looks
 *  something like:
 *  <pre>
 *  {
 *      "Group 1": [
 *          {
 *              "name": "Action 1",
 *          },
 *          {
 *              "name": "Action 2",
 *          },
 *      ],
 *      "Group 2": [
 *      ],
 *  }
 *  </pre>
 */
var group_recipes = function () {
    var iot = iotdb.iot();
    var cds = iot.data("recipe");
    if (!cds || !cds.length) {
        cds = [];
    }

    cds.sort(order_recipe);

    var gdsd = {};

    for (var ci in cds) {
        var reciped = cds[ci];
        if (reciped.enabled === false) {
            continue;
        }

        var gds = gdsd[reciped.group];
        if (gds === undefined) {
            gds = gdsd[reciped.group] = [];
        }

        gds.push(reciped);
    }

    return gdsd;
};

/**
 *  Return all the recipes, ordered
 */
var recipes = function () {
    var iot = iotdb.iot();
    var recipeds = iot.data("recipe");
    if (!recipeds || !recipeds.length) {
        return [];
    }

    var rds = [];
    for (var ri in recipeds) {
        var reciped = recipeds[ri];
        if (reciped.enabled === false) {
            continue;
        }

        rds.push(reciped);
    }

    rds.sort(order_recipe);
    return rds;
};

/**
 *  Archive entire cookbooks
 */
/*
var archive = function () {
    initd = _.defaults(initd, {
        cookbooks_path: settings.d.cookbooks_path,
    });

    logger.info({
        method: "archive",
        cookbooks_path: initd.cookbooks_path,
    }, "loading recipes");

    var filenames = cfg.cfg_find(iotdb.iot().envd, initd.cookbooks_path, /[.]js$/);
    cfg.cfg_load_js(filenames, function (paramd) {
        if (paramd.error !== undefined) {
            if (paramd.filename) {
                logger.error({
                    method: "_load_recipes",
                    filename: paramd.filename,
                    error: paramd.error,
                    exception: paramd.exception,
                }, "error loading JS Model");
            }
            return;
        }

        logger.debug({
            method: "_load_recipes",
            filename: paramd.filename
        }, "found Model");
    });
};
 */

/**
 */
var recipe_model = function (recipe) {
    var context = make_context(recipe);

    var value_attribute = {
        "@type": "iot:Attribute",
        "@id": "#value",
        "iot:purpose": recipe["iot:purpose"],
        "schema:name": "value",
        "iot:type": recipe["iot:type"],
        "iot:role": ["iot-attribute:role-control", "iot-attribute:role-reading", ],
    };
    if (recipe.values) {
        value_attribute['iot:enumeration'] = recipe.values;
    }

    return {
        "@context": {
            "iot": _.ld.namespace["iot"],
            "iot-unit": _.ld.namespace["iot-unit"],
            "iot-attribute": _.ld.namespace["iot-attribute"],
            "schema": _.ld.namespace["schema"],
        },
        "@id": "/api/recipes/" + recipe._id + "/model",
        "@type": ["iot:Model", "iot:Recipe", ],
        "@timestamp": context.created_timestamp,
        "schema:name": recipe._name,
        "iot:attribute": [
            value_attribute, {
                "@type": "iot:Attribute",
                "@id": "#message",
                "iot:purpose": "iot-attribute:message.html",
                "schema:name": "text",
                "iot:type": "iot:string",
                "iot:role": ["iot-attribute:role-reading", ],
            }, {
                "@type": "iot:Attribute",
                "@id": "#text",
                "iot:purpose": "iot-attribute:message.text",
                "schema:name": "text",
                "iot:type": "iot:string",
                "iot:role": ["iot-attribute:role-reading", ],
            }, {
                "@type": "iot:Attribute",
                "@id": "#running",
                "iot:purpose": "iot-attribute:sensor.running",
                "schema:name": "text",
                "iot:type": "iot:boolean",
                "iot:role": ["iot-attribute:role-reading", ],
            },
        ]
    };
};

/**
 */
var recipe_recipe = function (recipe) {
    var base = "/api/recipes/" + recipe._id;
    return {
        "@id": base,
        "schema:name": recipe._name,
        "cookbook": recipe.group,
        "istate": base + "/ibase",
        "ostate": base + "/obase",
        "model": base + "/model",
        "status": base + "/status",
    };
};

/**
 */
var recipe_istate = function (recipe, context) {
    if (!context) {
        context = make_context(recipe);
    }

    var d = _.defaults({
            "@timestamp": context.modified_timestamp,
        },
        recipe.state, {
            value: null,
            "@id": "/api/recipes/" + recipe._id + "/istate",
        }
    );
    d["value"] = null;


    if (context.status.text) {
        d["text"] = context.status.text;
    }
    if (context.status.message) {
        d["message"] = context.status.message;
    }

    return d;
};

/**
 */
var recipe_ostate = function (recipe, context) {
    if (!context) {
        context = make_context(recipe);
    }

    var d = {
        value: null,
        "@timestamp": context.execute_timestamp,
        "@id": "/api/recipes/" + recipe._id + "/ostate",
    };

    /* really should be istate, but this makes everything work automatically */
    if (context.status.running) {
        d["running"] = true;
    }

    return d;
};

/**
 */
var recipe_status = function (recipe, context) {
    var self = this;

    if (!context) {
        context = make_context(recipe);
    }

    var d = _.deepCopy(context.status);
    d["@id"] = "/api/recipes/" + recipe._id + "/status";

    return d;
};

/**
 */
var cookbooks = function () {
    var groups = [];

    var group_name = null;
    var attributes = null;
    var in_recipies = recipes();
    var out_recipes = [];

    for (var ri in in_recipies) {
        var in_recipe = in_recipies[ri];

        if (in_recipe.group !== group_name) {
            group_name = in_recipe.group;

            var group = {};
            groups.push(group);

            group["_id"] = util.format("urn:iotdb:cookbook:%s", in_recipe.cookbook_id);
            group["_name"] = in_recipe.group;
            group["_section"] = "cookbooks";

            out_recipes = [];
            group["recipes"] = out_recipes;
        }

        var out_recipe = {};
        out_recipes.push(out_recipe);

        out_recipe["@type"] = "iot:Recipe";
        out_recipe["schema:name"] = in_recipe.name;
        out_recipe["iot:type"] = in_recipe["iot:type"];
        if (in_recipe.values) {
            out_recipe['iot:enumeration'] = in_recipe.values;
        }
        out_recipe["_id"] = in_recipe._id;
        out_recipe["_code"] = "value";
        out_recipe["_name"] = in_recipe.name;
        out_recipe["_control"] = true;
        out_recipe["_reading"] = false;
        out_recipe["model"] = recipe_model(in_recipe);
        out_recipe["istate"] = recipe_istate(in_recipe);
        out_recipe["ostate"] = recipe_ostate(in_recipe);
        out_recipe["status"] = recipe_status(in_recipe);

        interactors.assign_interactor_to_attribute(out_recipe);
    }

    return groups;
};

/**
 *  MQTT messages - notifications, only on ISTATE and META 
 */
var _transport_mqtt = function (app, iotdb_transporter) {
    var client_id;
    var owner = users.owner();
    if (owner) {
        client_id = auth.make_token_mqtt(owner);
    }

    var mqtt_transporter = new MQTTTransport({
        prefix: path.join(settings.d.mqttd.prefix, "api", "recipes"),
        host: settings.d.mqttd.host,
        port: settings.d.mqttd.port,
        client_id: client_id,
    });
    iotdb.transporter.bind(iotdb_transporter, mqtt_transporter, {
        bands: ["meta", "istate", "ostate", "status", ],
    });
};

/**
 *  Express interface - get & put. Put only on OSTATE
 */
var _transport_express = function (app, iotdb_transporter) {
    var express_transporter = new ExpressTransport({
        prefix: path.join("/", "api", "recipes"),
        key_things: "thing",
    }, app);
    iotdb.transporter.bind(iotdb_transporter, express_transporter, {
        bands: ["meta", "istate", "ostate", "model", "status", ],
        updated: ["ostate", ],
    });
};

/**
 *  The Transporter will brodcast all istate/meta
 *  changes to Things to MQTT path 
 *  the same as the REST API
 */
var setup = function (app) {
    exports.recipe_transporter = new RecipeTransport({
        authorize: function (authd, callback) {
            // console.log("RECIPE:AUTHORIZE:", authd);
            authd = _.defaults({}, authd);
            authd.store = "recipes";

            users.authorize(authd, callback);
        },
    });

    _transport_mqtt(app, exports.recipe_transporter);
    _transport_express(app, exports.recipe_transporter);
};

/**
 *  API
 */
exports.setup = setup;
exports.recipe_transporter = null;

exports.make_context = make_context;
exports.order_recipe = order_recipe;
exports.load_recipes = load_recipes;
exports.init_recipes = init_recipes;
exports.recipes = recipes;
exports.group_recipes = group_recipes;
exports.recipe_to_id = recipe_to_id;
exports.recipe_by_id = recipe_by_id;

exports.recipe_istate = recipe_istate;
exports.recipe_ostate = recipe_ostate;
exports.recipe_model = recipe_model;
exports.recipe_status = recipe_status;

exports.cookbooks = cookbooks;
