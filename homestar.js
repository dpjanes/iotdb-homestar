/*
 *  homestar.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
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
var data = require('./server/data');

var iot = function(initd) {
    return iotdb.iot(initd);
};

var recipe = function(initd) {
    iot().data("recipe", initd);
};

/*
 *  API
 */
exports.iotdb = iotdb;
exports.iot = iot;
exports.recipe = recipe;

exports.cfg = iotdb.cfg;
exports._ = iotdb.helpers;
