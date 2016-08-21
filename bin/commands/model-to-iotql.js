/*
 *  bin/commands/model-to-iotql.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-11-23
 *
 *  Produce IoTQL output for a Model
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
var cfg = iotdb.cfg;
var settings = require("../../app/settings");

var fs = require('fs');
var uuid = require('uuid');
var unirest = require('unirest');

var cmd_jsonld = require('./model-to-jsonld');

exports.command = "model-to-iotql";
exports.boolean = cmd_jsonld.boolean;
exports.defaults = cmd_jsonld.defaults;
exports.summary = "produce IoTQL for a Model";

exports.help = function () {
    console.log("usage: homestar model-to-iotql [--stdout] [--url <url>] <model-code>");
    console.log("");
    console.log("--url         base URL for the Model");
    console.log("--stdout      write to stdout (rather than appropriately named file)");
    console.log("");
    console.log("This command will produce a '.iotql' file for a Model.");
    console.log("Note that the Model must be known to IOTDB.");
    console.log("A list of known model can be found by 'homestar configuration'.");
    console.log("");
};

exports.run = function (ad) {
    ad.iotql = true;
    cmd_jsonld.help = exports.help;
    cmd_jsonld.run(ad);
};
