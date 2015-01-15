/*
 *  helpers.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-01-15
 *
 *  Copyright [2013-2014] [David P. Janes]
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
var edit_add_chapter_ids = function(filename) {
    if (!fs.existsSync(filename)) {
        logger.error({
            method: "edit_add_chapter_ids",
            filename: filename
        }, "file does not exist");
    }
};

/**
 *  API
 */
exports.edit_add_chapter_ids = edit_add_chapter_ids;
