/*
 *  bin/commands/add.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-31
 *
 *  HomeStar command line control: "homestar add"
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
var _ = iotdb._;
var settings = require("../../app/settings");

var child_process = require('child_process')
var path = require('path')

exports.command = "pretty";
exports.summary = "pretty print homestar output"

exports.help = function () {
    console.log("usage: homestar pretty");
    console.log("");
    console.log("pretty print homestar output (using bunyan)");
};

exports.run = function (ad) {
    var bunyan_path = path.join(__dirname, "../../node_modules/bunyan/bin/bunyan");

    child_process.spawn(bunyan_path, {
        stdio: 'inherit'
    });
};
