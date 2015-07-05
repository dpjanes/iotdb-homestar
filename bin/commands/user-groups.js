/*
 *  bin/commands/user-groups.js
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
var _ = iotdb.helpers;
var cfg = iotdb.cfg;
var settings = require("../../app/settings");
var users = require("../../app/users");

var child_process = require('child_process')
var path = require('path')

exports.command = "user-groups";
exports.summary = "add a user to groups";

exports.help = function () {
    console.log("usage: homestar user-groups <identity> <admin|family|friend|stranger>");
    console.log("");
    console.log("Add a user to a group");
    console.log("  admin - can see and do everything");
    console.log("  family - can see and do everything, except change metadata");
    console.log("  friend - can see everything, can only do recipes");
    console.log("  stranger - can see everything, can't do anything");
};

exports.run = function (ad) {
    settings.setup();
    users.setup();

    if (ad._.length < 3) {
        console.log("homestar slice requires at least two arguments");
        console.log("");
        exports.help();
        process.exit(1);
    }
    
    var user = ad._[1];
    var groups = ad._.slice(2)
    if (groups.length === 1) {
        groups = groups[0];
    }

    var uds = []
    users.user_by_identity(user, function(error, ud) {
        if (error) {
            console.log("#", "user not found", error);
            process.exit(1);
        } else if (!ud) {
            console.log("#", "user not found");
            process.exit(1);
        } 

        ud.groups = groups;
        users.update(ud, function(error) {
            if (error) {
                console.log("#", "error saving user", error);
                process.exit(1);
            } 

            console.log("+", "user updated!");
        })

        console.log(ud);
    });
};
