/*
 *  bin/commands/install.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
 *
 *  HomeStar command line control: "homestar install"
 *  Add a recipe from the web to your HomeStar installation
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

exports.command = "install";
exports.summary = "install a recipe to your Runner";

exports.help = function () {
    console.log("usage: homestar install [<url>|<recipe_name>]");
    console.log("");
    console.log("Add a recipe to your Home☆Star Runner");
};

exports.run = function (ad) {
    /*
    iotdb.iot({
        envd: {
            IOTDB_PROJECT: process.cwd()
        },
    });
    */
};
