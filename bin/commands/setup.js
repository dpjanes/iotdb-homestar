/*
 *  bin/commands/setup.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
 *
 *  HomeStar command line control: "homestar setup"
 *  Do initial 1-itme setup of your Home☆Star installation.
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

var fs = require('fs');
var uuid = require('uuid');
var unirest = require("unirest")

exports.command = "setup";
exports.summary = "setup your local Home☆Star Runner";

exports.help = function () {
    console.log("usage: homestar setup");
    console.log("");
    console.log("Setup your local Home☆Star Runner");
    console.log("Run this only once!");
};

var _set = function(d, key, value) {
    if (value === undefined) {
        return;
    }

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

    if (d[lastkey] === undefined) {
        d[lastkey] = value;
        console.log("change: %s → %s", lastkey, value);
        return true;
    }
};

exports.run = function (ad) {
    /* required folders */
    try {
        fs.mkdirSync(".iotdb");
    } catch (err) {

    }
    try {
        fs.mkdirSync("cookbook");
    } catch (err) {
    }

    /* load keystore */
    var keystored = {};
    var filename = ".iotdb/keystore.json";

    cfg.cfg_load_json([ filename ], function(paramd) {
        for (var key in paramd.doc) {
            keystored[key] = paramd.doc[key];
        }
    });

    /* secrets */
    var is_changed = false;
    is_changed |= _set(keystored, "homestar/runner/secrets/host", uuid.v4());
    is_changed |= _set(keystored, "homestar/runner/secrets/session", uuid.v4());

    /* location */
    unirest
        .get("http://ip-api.com/json")
        .end(function (result) {
            if (result.body && (result.body.status === "success")) {
                is_changed |= _set(keystored, "homestar/runner/location/latitude", result.body.lat);
                is_changed |= _set(keystored, "homestar/runner/location/longitude", result.body.lon);
                is_changed |= _set(keystored, "homestar/runner/location/locality", result.body.city);
                is_changed |= _set(keystored, "homestar/runner/location/country", result.body.countryCode || result.body.county);
                is_changed |= _set(keystored, "homestar/runner/location/region", result.body.region || result.body.regionName);
                is_changed |= _set(keystored, "homestar/runner/location/timezone", result.body.timezone);
                is_changed |= _set(keystored, "homestar/runner/location/postal_code", result.body.zip);
            }

            if (is_changed) {
                fs.writeFile(filename, JSON.stringify(keystored, null, 2));
            }

            console.log("homestar: setup complete -- make sure to add API keys: https://homestar.io/runners");
        });

};
