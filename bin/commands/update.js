/*
 *  bin/commands/update.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-06-15
 *
 *  Update Install a HomeStar Package
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

var util = require('util');
var path = require('path');
var os = require('os');
var fs = require('fs');
var child_process = require('child_process');

var folder = "node_modules";

exports.command = "update";
exports.summary = "update installed packages";

exports.help = function () {
    console.log("usage: homestar update");
    console.log("");
    console.log("Update all installed homestar packages in node_modules/*");
    console.log("Always use this in preference to 'npm install' or 'npm update'");
};

exports.run = function (ad) {
    require('./install').run({
        "update-all": true,
    });
};
