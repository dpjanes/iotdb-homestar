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
 */

/**
 */
var assign_interactor = function (rd) {
};

/**
 *  API
 */
exports.edit_add_cookbook_ids = edit_add_cookbook_ids;
exports.assign_interactor = assign_interactor;
exports.assign_group = assign_group;
