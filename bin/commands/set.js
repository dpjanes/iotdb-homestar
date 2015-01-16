/*
 *  bin/commands/set.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
 *
 *  HomeStar command line control: "set" command
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
var settings = require("../../app/settings");

var fs = require('fs');
var uuid = require('uuid');

exports.command = "set";
exports.boolean = [ "list", "boolean", "number", "integer", "uuid" ];
exports.summary = "set a value in the keystore";

exports.help = function () {
    console.log("usage: homestar set [--list|boolean|number|integer|uuid] <key> <value> [<value>...]");
    console.log("");
    console.log("Set a key/value in '.iotdb/keystore.json'");
    console.log("");
    console.log("* If you need to set multiple values, use --list");
    console.log("* If you need to set a random UUID, use --uuid");
    console.log("* Hierarchy is expressed by a '/' in the key");
};

exports.run = function (ad) {
    if (ad._.length < 3) {
        console.log("missing arguments");
        console.log("");
        exports.help();
        process.exit(1);
    } else if (!ad.list && ad._.length > 3) {
        console.log("too many arguments -- make sure to use '--list' if you want to set multiple items");
        console.log("");
        exports.help();
        process.exit(1);
    }

    var key = ad._[1];
    if (key.indexOf('/') === 0) {
        key = key.substring(1);
    } else {
        key = "homestar/runner/" + key;
    }

    var value;
    if (ad.list) {
        value = ad._.slice(2);
    } else if (ad.boolean) {
        value = ad._[2] ? true : false;
    } else if (ad.number) {
        value = parseFloat(ad._[2]);
    } else if (ad.integer) {
        value = parseInt(ad._[2]);
    } else if (ad.uuid) {
        value = uuid.v4();
    } else {
        value = ad._[2];
    }

    var keystored = {};
    var filename = ".iotdb/keystore.json";

    cfg.cfg_load_json([ filename ], function(paramd) {
        for (var key in paramd.doc) {
            keystored[key] = paramd.doc[key];
        }
    });

    var d = keystored;
    var subkeys = key.split('/');
    var lastkey = subkeys[subkeys.length - 1];

    for (var ski = 0; ski < subkeys.length - 1; ski++) {
        var subkey = subkeys[ski];
        var subd = d[subkey];
        if (!_.isObject(subd)) {
            subd = {};
            d[subkey] = subd;
        }

        d = subd;
    }

    d[lastkey] = value;

    fs.writeFile(filename, JSON.stringify(keystored, null, 2));
    console.log("homestar: added key/value to keystore",
        "\n  key", key,
        "\n  value", value
    );
};
