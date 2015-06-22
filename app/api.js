/*
 *  api.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-06-21
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

var path = require('path');
var util = require('util');

var settings = require('./settings');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/api',
});

/**
 *  Root of API. Things and Recipes
 *  are magically served elsewhere using Transporters
 */
var get_api = function (request, response) {
    var d = {
        "@context" : "https://iotdb.org/pub/iot",
        "@id": "/api",
        "things": "/api/things",
        "recipes": "/api/recipes",
    };
    _.extend(d, _.ld.compact(iotdb.controller_meta()));
    d["iot:controller.runner"] = settings.d.keys.homestar.key;

    d["_mqtt"] = util.format("tcp://%s:%s%s", 
        settings.d.mqttd.host, settings.d.mqttd.port, 
        path.join(settings.d.mqttd.prefix, "api", "#"))

    response
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(d, null, 2));
};

/**
 */
var setup = function (app) {
    app.get('/api/', get_api);
};

/**
 *  API
 */
exports.setup = setup;
