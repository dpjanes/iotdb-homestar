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

const iotdb = require('iotdb');
const _ = iotdb._;

const path = require('path')
const fs = require('fs')

exports.command = "configuration";
exports.summary = "list stuff about configuration";

exports.help = function () {
    console.log("usage: homestar configuration");
    console.log("");
};

exports.run = function (ad) {
    const self = this;

    const keystore = iotdb.keystore();
    console.log("== Keystore");
    console.log("");
    console.log(JSON.stringify(keystore.d, undefined, 2).replace(/^/mg, "  "));
    console.log("");

    console.log("== OS / Installation");
    console.log("");
    console.log("Home☆Star location:", path.join(__dirname, "..", ".."));
    console.log("");

    /*
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
        var version = null;
        try {
            var pd = JSON.parse(fs.readFileSync(path.join(m.module_folder, "package.json")));
            version = pd.version;
        } catch (x) {
        }

        console.log("*", m.module_name, "(version: " + version + "; folder:", m.module_folder + ")");
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
    */

    setTimeout(() => process.exit(0), 500);
};
