/*
 *  bin/commands/runner.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
 *
 *  HomeStar command line control: "homestar runner"
 *  Start your local instance
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

var fs = require('fs');
var path = require('path');
var child_process = require('child_process')

exports.command = "runner";
exports.summary = "start your local Home☆Star Runner";

exports.help = function () {
    console.log("usage: homestar runner");
    console.log("");
    console.log("Start your local Home☆Star Runner");
};

exports.run = function (ad) {
    var node_path = process.execPath;
    var app_path = path.join("node_modules", "homestar", "app", "index.js");
    if (fs.stat(app_path, function(error) {
        if (error) {
            app_path = path.join("app", "index.js");
        }

        var argv = [ app_path ].concat(process.argv.slice(3));

        child_process.spawn(node_path, argv, {
            stdio: 'inherit'
        });
    }));
};
