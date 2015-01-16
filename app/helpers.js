/*
 *  helpers.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-01-15
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

var homestar = require('../homestar');

var fs = require('fs');
var path = require('path');
var util = require('util');

var uuid = require('uuid');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'helpers',
});

/**
 *  This will edit a file and add UDIDs to Chapters
 *
 *  <p>
 *  This is synchronous
 */
var edit_add_cookbook_ids = function(filename) {
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
    var _replacer = function(full, cookbook_name) {
        changed = true;
        return util.format('homestar.cookbook(%s, "%s");', cookbook_name, uuid.v4());
    };

    contents = contents.replace(/^\s*homestar\s*.\s*cookbook\s*[(]\s*("[^"]*")\s*[)](\s*;)?/mg, _replacer);
    contents = contents.replace(/^\s*homestar\s*.\s*cookbook\s*[(]\s*('[^"]*')\s*[)](\s*;)?/mg, _replacer);

    if (changed) {
        fs.writeFileSync(filename, contents, { encoding: encoding });
        logger.info({
            method: "edit_add_cookbook_ids",
            filename: filename
        }, "updated recipe");
    }
};

/**
 *  How the user interacts with this control
 */
var interactor = function(rd) {
    if (rd._thing_name) {
        rd._group = rd._thing_name
    } else if (rd.group) {
        rd._group = rd.group
    } else {
        rd._group = "Ungrouped";
    }

    var values = rd.values;
    if (values) {
        rd._interactor = "enumeration";
        rd._values = [];
        for (var vi in values) {
            rd._values.push({
                name: values[vi],
                value: values[vi],
            });
        }
        return;
    }

    var format = rd['iot-js:format'];
    if (format === "iot-js:color") {
        rd._interactor = "color";
        return;
    } else if (format === "iot-js:date") {
        rd._interactor = "date";
        return;
    } else if (format === "iot-js:datetime") {
        rd._interactor = "datetime";
        return;
    } else if (format === "iot-js:time") {
        rd._interactor = "time";
        return;
    }

    var type = rd['iot-js:type'];
    if (type === "iot-js:boolean") {
        rd._values = [ 
            {
                name: "Off",
                value: 0
            },
            {
                name: "On",
                value: 1
            },
        ];
        rd._interactor = "enumeration";
        return;
    }

    rd._interactor = "click";
};

/**
 *  API
 */
exports.edit_add_cookbook_ids = edit_add_cookbook_ids;
exports.interactor = interactor;
