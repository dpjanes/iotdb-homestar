/*
 *  bin/commands/configuration.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-02-18
 *
 *  Print out stuff about the current configuration
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
var helpers = require("../../app/helpers");
var settings = require("../../app/settings");

var child_process = require('child_process')
var path = require('path')

exports.command = "configuration";
exports.summary = "list stuff about configuration";

exports.help = function () {
    console.log("usage: homestar configuration");
    console.log("");
    console.log("Add IDs to your Cookbook");
    console.log("");
    console.log("This will go through all your recipies in cookbook/*.js");
    console.log("and add IDs to any homestar.cookbook() declarations");
    console.log("that don't have them.");
    console.log("");
    console.log("This will allow Homestar to add permissions so they");
    console.log("Can be shared with other Homestar users");
};

exports.run = function (ad) {
    var self = this;

    var keystore = iotdb.keystore();
    console.log("== Keystore");
    console.log("");
    console.log(JSON.stringify(keystore.d, undefined, 2).replace(/^/mg, "  "));
    console.log("");

    console.log("== OS / Installation");
    console.log("");
    console.log("Home☆Star location:", path.join(__dirname, "..", ".."));
    console.log("");

    console.log("== Installed Modules");
    console.log("");

    var modules = iotdb.modules().modules();
    modules.sort(function(am, bm) {
        if (am.module_name < bm.module_name) {
            return -1;
        } else if (am.module_name > bm.module_name) {
            return 1;
        } else {
            return 0;
        }
    });
    for (var mi in modules) {
        var m = modules[mi];
        console.log("*", m.module_name, "(folder:", m.module_folder + ")");
    }

    console.log("");

    console.log("== Installed Bridges");
    console.log("");

    var bridges = iotdb.modules().bridges();
    bridges.sort(function(ab, bb) {
        if (ab.bridge_name < bb.bridge_name) {
            return -1;
        } else if (ab.bridge_name > bb.bridge_name) {
            return 1;
        } else {
            return 0;
        }
    });

    for (var bi in bridges) {
        var b = bridges[bi];
        console.log("*", b.bridge_name, "(module:", b.module_name + ")");
    }

    console.log("");

    console.log("== Available Models");
    console.log("");

    var bindings = iotdb.modules().bindings();
    bindings.sort(function(ab, bb) {
        if (ab.model_code < bb.model_code) {
            return -1;
        } else if (ab.model_code > bb.model_code) {
            return 1;
        } else {
            return 0;
        }
    });
    for (var bi in bindings) {
        var binding = bindings[bi];

        console.log("*", binding.model_code, "(bridge:", binding.bridge.bridge_name + ")");
    }

    console.log("");

    process.exit(0)
};
