/*
 *  bin/commands/get.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-09-17
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

const fs = require('fs');

exports.command = "get";
exports.boolean = [ "json" ]
exports.summary = "get a value from the keystore";

exports.help = function () {
    console.log("usage: homestar get [--json] <key>");
    console.log("");
    console.log("Get a key from '.iotdb/keystore.json'");
};

exports.run = function (ad) {
    if (ad._.length < 1) {
        console.log("missing arguments");
        console.log("");
        exports.help();
        process.exit(1);
    }

    let key = ad._[1];
    if (key.indexOf('/') === 0) {
        key = key.substring(1);
    } else {
        key = "homestar/runner/" + key;
    }

    const value = iotdb.settings().get(key)
    if (ad.json) {
        console.log(JSON.stringify(value, null, 2));
    } else if (_.is.Atomic(value)) {
        console.log(value);
    } else {
        console.log(JSON.stringify(value, null, 2));
    }
};
