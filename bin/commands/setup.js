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

exports.command = "setup";
exports.summary = "setup your local Home☆Star Runner";

exports.help = function () {
    console.log("usage: homestar setup");
    console.log("");
    console.log("Setup your local Home☆Star Runner");
    console.log("Run this only once!");
};

exports.run = function (ad) {
    iotdb.iot({
        envd: {
            IOTDB_PROJECT: process.cwd()
        },
    });
};
