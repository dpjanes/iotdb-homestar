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

var homestar = require('../homestar');
var settings = require('./settings');

var events = require('events');
var util = require('util');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'context',
});

/**
 *  The "Context" is basically does the work of
 *  managing a running Recipe. You make them
 *  using the 'context' function below.
 *  <p>
 *  Might be horrible idea. Stop judging me.
 */
var Context = function (reciped) {
    var self = this;

    self.running = false;
    self.reciped = reciped;
    self.id = recipe_to_id(reciped);

    self.reciped._context = self;
    self.reciped.state = {};

    events.EventEmitter.call(self);
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
 */
Context.prototype.message = function () {
    var self = this;

    self.running = true;

    self.emit("message", self.id, self.reciped,
        util.format.apply(util.apply, Array.prototype.slice.call(arguments)));
};

/*
 *  Change (and emit) the state of this recipe
 */
Context.prototype.state = function (state) {
    var self = this;

    if ((state === undefined) || (state === null)) {
        self.reciped.state._text = null;
        self.reciped.state._html = null;
        self.reciped.state._number = null;
    } else if (_.isString(state)) {
        self.reciped.state._text = state;
        self.reciped.state._html = null;
        self.reciped.state._number = null;
    } else if (_.isBoolean(state)) {
        self.reciped.state._text = null;
        self.reciped.state._html = null;
        self.reciped.state._number = state ? 1 : 0;
    } else if (_.isNumber(state)) {
        self.reciped.state._text = null;
        self.reciped.state._html = null;
        self.reciped.state._number = state;
    } else if (!_.isObject(state)) {
        self.reciped.state._text = null;
        self.reciped.state._html = null;
        self.reciped.state._number = null;

        self.reciped._logger.error({
            method: "state",
        }, "don't know what to do with this state");
        return;
    } else if (state) {
        _.extend(self.reciped.state, state);
    }

    self.emit("state", self.id, self.reciped.state);
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

Context.prototype.done = function (timeout) {
    var self = this;

    if (timeout === undefined) {
        timeout = 0.8;
    }

    setTimeout(function () {
        self.running = false;
        self.emit("running", self.id, self.reciped);
    }, timeout * 1000);

};

Context.prototype.onclick = function (value) {
    var self = this;

    self.running = false;
    if (self.reciped.onclick) {
        if (self.reciped._valued !== undefined) {
            value = self.reciped._valued[value];
        }

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
        homestar.cookbook();
    });
    // console.log("HERE:BBBB ----------");
    // process.exit(0)
};

/**
 *  Call me once
 */
var init_recipes = function () {
    var iot = iotdb.iot();
    var cds = iot.data("recipe");
    if (!cds || !cds.length) {
        return;
    }

    for (var ci in cds) {
        init_recipe(cds[ci]);
    }
};

var _add = function(reciped, key, value) {

}

var init_recipe = function (reciped) {
    reciped._id = recipe_to_id(reciped);
    reciped.state = {};

    /* enabled: if false, do not use */
    if (reciped.enabled === false) {
        return;
    }

    /* this handles manipulating the recipe */
    var context = make_context(reciped);

    /* IOTDB types */
    var keys = [ "value", "type", "format", "unit", ];
    for (var ki in keys) {
        var key = keys[ki];

        var value = reciped[key];
        if (value === undefined) {
            continue
        }

        value = _.ld.compact(reciped[key], { json: true, scrub: true });

        if (_.isObject(value)) {
            var vkeys = [ "iot:type", "iot:format", "iot:unit", "iot:purpose", ];
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
    } else {
        type = _.ld.compact(_.ld.expand(type, "iot:"))
        if (type === "iot:boolean") {
            reciped.values = [ "Off", "On", ]
            reciped._valued = {
                "Off": false,
                "On": true,
            };
        }
    }

    /* run: old name for onclick: */
    if ((reciped.run !== undefined) && (reciped.onclick === undefined)) {
        reciped.onclick = reciped.run;
    }

    /* watch: ThingArrays we need to monitor for reachable changes */
    if (reciped.watch) {
        if (!_.isArray(reciped.watch)) {
            reciped.watch = [ reciped.watch ]
        }

        var _validate = function() {
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
        reciped.onvalidate = function(context) {
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
        return "urn:iotdb:recipe:" + _.md5_hash("2014-12-13T06:34:00", reciped.group, reciped.name);
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

    var rds = []
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
var archive = function() {
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

/**
 *  API
 */
exports.make_context = make_context;
exports.order_recipe = order_recipe;
exports.load_recipes = load_recipes;
exports.init_recipes = init_recipes;
exports.recipes = recipes;
exports.group_recipes = group_recipes;
exports.recipe_to_id = recipe_to_id;
exports.recipe_by_id = recipe_by_id;
