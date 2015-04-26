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
var interactors = require('./interactors');

var fs = require('fs');
var path = require('path');
var util = require('util');

var uuid = require('uuid');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/helpers',
});

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

/**
 */
var assign_group = function (rd) {
    if (rd._thing_group) {
        rd._group = rd._thing_group;
    } else if (rd._thing_name) {
        rd._group = rd._thing_name;
    } else if (rd.group) {
        rd._group = rd.group;
    } else {
        rd._group = "Ungrouped";
    }
};

/**
 */
var assign_interactor = function (rd) {
    interactors.assign_interactor_to_attribute(rd);
};

/*
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

var format = rd['iot:format'];
if (format === "iot:color") {
    rd._interactor = "color";
    return;
} else if (format === "iot:date") {
    rd._interactor = "date";
    return;
} else if (format === "iot:datetime") {
    rd._interactor = "datetime";
    return;
} else if (format === "iot:time") {
    rd._interactor = "time";
    return;
}

var type = rd['iot:type'];
if (type === "iot:boolean") {
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

if (rd.onclick) {
    rd._interactor = "click";
    return;
}

rd._interactor = "otherwise";
*/

/**
 *  API
 */
exports.edit_add_cookbook_ids = edit_add_cookbook_ids;
exports.assign_interactor = assign_interactor;
exports.assign_group = assign_group;
