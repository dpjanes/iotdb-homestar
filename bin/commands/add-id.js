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
var settings = require("../../app/settings");

var child_process = require('child_process')
var path = require('path')

/**
 *  This will edit a file and add UDIDs to Chapters
 *
 *  <p>
 *  This is synchronous
 */
var edit_add_cookbook_ids = function (filename) {
    if (!fs.existsSync(filename)) {
        logger.error({
            method: "edit_add_cookbook_ids",
            filename: filename
        }, "file does not exist");
        return;
    }

    var encoding = 'utf8';
    var changed = false;
    var contents = fs.readFileSync(filename, encoding);
    var _replacer = function (full, cookbook_name) {
        changed = true;
        return util.format('homestar.cookbook(%s, "%s");', cookbook_name, uuid.v4());
    };

    contents = contents.replace(/^\s*homestar\s*.\s*cookbook\s*[(]\s*("[^"]*")\s*[)](\s*;)?/mg, _replacer);
    contents = contents.replace(/^\s*homestar\s*.\s*cookbook\s*[(]\s*('[^"]*')\s*[)](\s*;)?/mg, _replacer);

    if (changed) {
        fs.writeFileSync(filename, contents, {
            encoding: encoding
        });
        logger.info({
            method: "edit_add_cookbook_ids",
            filename: filename
        }, "updated recipe");
    }
};

exports.command = "add-id";
exports.summary = "Add IDs to your Cookbook";

exports.help = function () {
    console.log("usage: homestar add-id");
    console.log("");
    console.log("Add IDs to your Cookbook");
    console.log("");
    console.log("This will go through all your recipies in cookbook/*.js");
    console.log("and add IDs to any homestar.cookbook() declarations");
    console.log("that don't have them.");
    console.log("");
    console.log("This will allow Homestar to add permissions so they");
    console.log("Can be shared with other Homestar users");
};

exports.run = function (ad) {
    var self = this;

    var initd = {
        cookbooks_path: settings.d.cookbooks_path,
    };

    var filenames = cfg.cfg_find(iotdb.iot().envd, initd.cookbooks_path, /[.]js$/);

    for (var fi in filenames) {
        edit_add_cookbook_ids(filenames[fi]);
    }
};
