/*
 *  bin/commands/user-list.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-07-05
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
var users = require("../../app/users");

var child_process = require('child_process')
var path = require('path')

exports.command = "user-list";
exports.summary = "list known users"

exports.help = function () {
    console.log("usage: homestar user-list");
    console.log("");
    console.log("list known users");
};

exports.run = function (ad) {
    settings.setup();
    users.setup();

    var uds = []
    users.users(function(error, ud) {
        if (error) {
        } else if (ud) {
            uds.push(ud);
        } else {
            console.log(uds);
        }
    });
};
