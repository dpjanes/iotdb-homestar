/*
 *  homestar.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
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
var timers = require('iotdb-timers');
var data = require('./app/data');

var iot = function(initd) {
    return iotdb.iot(initd);
};

var _group_default = "My Cookbook";
var _cookbook_name = _group_default;
var _cookbook_id;

var recipe = function(initd) {
    if (_cookbook_name) {
        initd.group = _cookbook_name;
    }
    if (_cookbook_id) {
        initd.cookbook_id = _cookbook_id;
    }

    iot().data("recipe", initd);
};

var cookbook = function(cookbook_name, cookbook_id) {
    if (cookbook_name) {
        _cookbook_name = cookbook_name;
    } else {
        _cookbook_name = _group_default;
    }

    if (cookbook_id) {
        _cookbook_id = cookbook_id;
    }
};

/*
 *  API
 */
exports.iotdb = iotdb;
exports.iotdb.recipe = recipe;
exports.iotdb.cookbook = cookbook;
exports.iotdb.timers = timers;

exports.iot = iot;
exports.recipe = recipe;
exports.cookbook = cookbook;

exports.cfg = iotdb.cfg;
exports._ = iotdb.helpers;
exports.keystore = iotdb.keystore;
exports.Keystore = iotdb.Keystore;
exports.upnp = iotdb.upnp;
exports.make_model = iotdb.make_model;

for (var key in iotdb.definitions.attribute) {
    exports[key] = iotdb.definitions.attribute[key];
}

exports.make_wrap = function(name, bindings, initd) {
    var model_code = exports._.id.to_dash_case(name);
    for (var bi in bindings) {
        var binding = bindings[bi];
        if (!binding.model) {
            continue
        }

        var model = new binding.model();
        if (model_code !== model.code) {
            continue;
        }

        return exports._.bridge_wrapper(binding, initd);
    }
};
