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
var iotdb_transport = require('iotdb-transport');
var _ = iotdb.helpers;
var cfg = iotdb.cfg;

var url_join = require('url-join')
var iotdb_recipe = require('iotdb-recipes').recipe;
var settings = require('./settings');
var interactors = require('./interactors');
var auth = require('./auth');
var users = require('./users');

var RecipeTransport = require('iotdb-recipes').Transport;
var MQTTTransport = require('iotdb-transport-mqtt').Transport;
var ExpressTransport = require('iotdb-transport-express').Transport;

var events = require('events');
var util = require('util');
var path = require('path');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/recipe',
});

/**
 */
var cookbooks = function () {
    var groups = [];

    var group_name = null;
    var attributes = null;
    var in_recipies = iotdb_recipe.recipes();
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
        out_recipe["model"] = iotdb_recipe.recipe_model(in_recipe);
        out_recipe["istate"] = iotdb_recipe.recipe_istate(in_recipe);
        out_recipe["ostate"] = iotdb_recipe.recipe_ostate(in_recipe);
        out_recipe["status"] = iotdb_recipe.recipe_status(in_recipe);

        interactors.assign_interactor_to_attribute(out_recipe);
    }

    return groups;
};

/**
 *  This will make a new Recipe Transporter,
 *  with the proper authentication set up
 */
var make_recipe_transporter = function(paramd) {
    paramd = _.defaults(paramd, {
        open: false,
    });
    return new RecipeTransport({
        authorize: function (authd, callback) {
            if (paramd.open) {
                return callback(null, true);
            }

            authd = _.defaults({}, authd);
            authd.store = "recipes";

            users.authorize(authd, callback);
        },
    });
};

/**
 *  MQTT messages - notifications, only on ISTATE and META 
 *
 *  Right now this is "open", meaning anyone can read the messages.
 *  We have to lock this down in the future, but MQTT auth
 *  is a real nuicance.
 */
var _transport_mqtt = function (app) {
    var client_id;
    var owner = users.owner();
    if (owner) {
        client_id = auth.make_token_mqtt(owner);
    }

    var recipe_transporter = make_recipe_transporter({ open: true });
    recipe_transporter.__magic = "TO-MQTT";
    var mqtt_transporter = new MQTTTransport({
        prefix: url_join(settings.d.mqttd.prefix, "api", "recipes"),
        host: settings.d.mqttd.host,
        port: settings.d.mqttd.port,
        client_id: client_id,
    });
    iotdb_transport.bind(recipe_transporter, mqtt_transporter, {
        bands: ["meta", "istate", "ostate", "status", ],
    });
};

/**
 *  Express interface - get & put. Put only on OSTATE
 */
var _transport_express = function (app) {
    var recipe_transporter = make_recipe_transporter();
    recipe_transporter.__magic = "TO-EXPRESS";
    var express_transporter = new ExpressTransport({
        prefix: url_join("/", "api", "recipes"),
        key_things: "thing",
    }, app);
    iotdb_transport.bind(recipe_transporter, express_transporter, {
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
    _transport_mqtt(app);
    _transport_express(app);
};

/**
 *  API
 */
exports.init_recipes = iotdb_recipe.init_recipes;
exports.load_recipes = iotdb_recipe.load_recipes;
exports.recipes = iotdb_recipe.recipes;
exports.recipe_by_id = iotdb_recipe.recipe_by_id;

exports.setup = setup;
exports.make_recipe_transporter = make_recipe_transporter;

exports.cookbooks = cookbooks;
