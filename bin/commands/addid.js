/*
 *  bin/commands/addid.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-31
 *
 *  HomeStar command line control: "homestar add-id"
 *  Add a IDs to Groups
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
var helpers = require("../../app/helpers");

var child_process = require('child_process')
var path = require('path')

exports.command = "add-id";
exports.summary = "Add IDs to your Cookbook";

exports.help = function () {
    console.log("usage: homestar add-id");
    console.log("");
    console.log("Add IDs to your Cookbook");
    console.log("");
    console.log("This will go through all your recipies in cookbook/*.js");
    console.log("and add IDs to any homestar.chapter() declarations");
    console.log("that don't have them.");
    console.log("");
    console.log("This will allow Homestar to add permissions so they");
    console.log("Can be shared with other Homestar users");
};

exports.run = function (ad) {
    console.log("HI!");
};
