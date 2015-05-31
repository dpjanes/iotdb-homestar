/*
 *  RecipeTransport.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-05-13
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
var _ = iotdb._;
var bunyan = iotdb.bunyan;

var path = require('path');

var util = require('util');
var url = require('url');

var recipe = require('./recipe');

var logger = bunyan.createLogger({
    name: "iotdb-homestar",
    module: 'app/RecipeTransport',
});

/* --- constructor --- */
/**
 *  <p>
 *  See {iotdb.transporter.Transport#Transport} for documentation.
 *
 *  @constructor
 */
var RecipeTransport = function () {
    var self = this;

    self.initd = _.defaults(
        iotdb.keystore().get("/transports/RecipeTransport/initd"),
        {}
    );
};

RecipeTransport.prototype = new iotdb.transporter.Transport();

/* --- methods --- */
/**
 *  See {iotdb.transporter.Transport#list} for documentation.
 */
RecipeTransport.prototype.list = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_list(paramd, callback);

    var rds = recipe.recipes();
    for (var rdi = 0; rdi < rds.length; rdi++) {
        var rd = rds[rdi];
        if (callback({
                id: recipe.recipe_to_id(rd),
            })) {
            break;
        }
    }

    callback({
        end: true,
    });
};

/**
 *  See {iotdb.transporter.Transport#added} for documentation.
 */
RecipeTransport.prototype.added = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_added(paramd, callback);
};

/**
 *  See {iotdb.transporter.Transport#about} for documentation.
 */
RecipeTransport.prototype.about = function (paramd, callback) {
    var self = this;

    self._validate_about(paramd, callback);

    /*
    var thing = recipe.recipe_by_id(paramd.id);
    if (!thing) {
        return callback({
            id: paramd.id,
        });
    }
    */

    return callback({
        id: paramd.id,
        bands: ["istate", "ostate", "model", "meta", ],
    });
};

/**
 *  See {iotdb.transporter.Transport#get} for documentation.
 */
RecipeTransport.prototype.get = function (paramd, callback) {
    var self = this;

    self._validate_get(paramd, callback);

    var rd = recipe.recipe_by_id(paramd.id);
    if (!rd) {
        return callback({
            id: paramd.id,
            band: paramd.band,
            value: null,
        });
    }

    if (paramd.band === "istate") {
        var d = recipe.recipe_istate(rd);
        delete d["@id"];

        return callback({
            id: paramd.id,
            band: paramd.band,
            value: d,
        });
    } else if (paramd.band === "ostate") {
        var d = recipe.recipe_ostate(rd);
        delete d["@value"]; // we're executing
        delete d["@id"];

        return callback({
            id: paramd.id,
            band: paramd.band,
            value: d,
        });
    } else if (paramd.band === "model") {
        var d = recipe.recipe_model(rd);
        delete d["@id"];

        return callback({
            id: paramd.id,
            band: paramd.band,
            value: d,
        });
    } else if (paramd.band === "meta") {
        var context = recipe.make_context(rd);
        var d = {
            "@timestamp": context.created_timestamp,
            "schema:name": rd._name,
            "iot:cookbook": rd.group || "",
        };

        return callback({
            id: paramd.id,
            band: paramd.band,
            value: d,
        });
    } else {
        return callback({
            id: paramd.id,
            band: paramd.band,
            error: new Error("no such Band"),
        });
    }
};

/**
 *  See {iotdb.transporter.Transport#update} for documentation.
 *  <p>
 *  NOT FINISHED
 */
RecipeTransport.prototype.update = function (paramd, callback) {
    var self = this;

    self._validate_update(paramd, callback);

    if (!paramd.id.match(/^urn:iotdb:recipe:/)) {
        return;
    }

    var rd = recipe.recipe_by_id(paramd.id);
    if (!rd) {
        logger.error({
            method: "update",
            cause: "hard to say - may not be important",
            thing_id: paramd.id,
        }, "Recipe not found");

        return;
    }

    if (paramd.band === "ostate") {
        var context = recipe.make_context(rd);

        var new_timestamp = paramd.value["@timestamp"];
        var old_timestamp = context.execute_timestamp;

        if (!_.timestamp.check.values(old_timestamp, new_timestamp)) {
            return;
        }

        context.execute_timestamp = new_timestamp;
        context.onclick(paramd.value.value);
    }
};

/**
 *  See {iotdb.transporter.Transport#updated} for documentation.
 */
RecipeTransport.prototype.updated = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_updated(paramd, callback);

    var _monitor_band = function (_band) {
        if ((_band === "istate") || (_band === "ostate") || (_band === "meta")) {
            var _handle_status = function (context) {
                context.on("status", function () {
                    if (paramd.id && (context.id !== paramd.id)) {
                        return;
                    }

                    self.get({
                        id: context.id,
                        band: _band,
                    }, callback);
                });
            };

            var recipeds = recipe.recipes();
            for (var ri in recipeds) {
                var reciped = recipeds[ri];
                var context = recipe.make_context(reciped);

                _handle_status(context);
            }
        } else if (_band === "model") {} else {}
    };

    if (paramd.band) {
        _monitor_band(paramd.band);
    } else {
        var bands = ["istate", "ostate", "meta", "model"];
        for (var bi in bands) {
            _monitor_band(bands[bi]);
        }
    }
};

/**
 *  API
 */
exports.RecipeTransport = RecipeTransport;
