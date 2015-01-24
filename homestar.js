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
var timers = require('iotdb-timers');
var data = require('./app/data');

var iot = function(initd) {
    return iotdb.iot(initd);
};

var _group_default = "My Cookbook";
var _cookbook_name = _group_default;
var _cookbook_id;

var recipe = function(initd) {
    if (_cookbook_name) {
        initd.group = _cookbook_name;
    }
    if (_cookbook_id) {
        initd.cookbook_id = _cookbook_id;
    }

    iot().data("recipe", initd);
};

var cookbook = function(cookbook_name, cookbook_id) {
    if (cookbook_name) {
        _cookbook_name = cookbook_name;
    } else {
        _cookbook_name = _group_default;
    }

    if (cookbook_id) {
        _cookbook_id = cookbook_id;
    }
};

/*
 *  API
 */
exports.iotdb = iotdb;
exports.timers = timers;
exports.iot = iot;
exports.recipe = recipe;
exports.cookbook = cookbook;

exports.cfg = iotdb.cfg;
exports._ = iotdb.helpers;

for (var key in iotdb.definitions.attribute) {
    exports[key] = iotdb.definitions.attribute[key];
}

/*
 *  For recipes
 */
exports.value = {
    "boolean": {
        "type": "iot-js:boolean",
        "on_off": {
            "type": "iot-js:boolean",
            "values": [ "Off", "On", ],
        },
        "up_down": {
            "type": "iot-js:boolean",
            "values": [ "Down", "Up", ],
        },
        "true_false": {
            "type": "iot-js:boolean",
            "values": [ "False", "True", ],
        },
    },
    "integer": {
        "type": "iot-js:integer",
        "percent": {
            "type": "iot-js:integer",
            "minumum": 0,
            "maximum": 100,
            "iot-js:format": "iot-unit:math.fraction.percent",
        },
    },
    "number": {
        "type": "iot-js:number",
        "unit": {
            "type": "iot-js:number",
            "minumum": 0,
            "maximum": 1,
            "iot-js:format": "iot-unit:math.fraction.unit",
        },
        "percent": {
            "type": "iot-js:number",
            "minumum": 0,
            "maximum": 100,
            "iot-js:format": "iot-unit:math.fraction.percent",
        },
        "fahrenheit": {
            "type": "iot-js:number",
            "unit": "iot-unit:temperature.imperial.fahrenheit",
        },
        "celsius": {
            "type": "iot-js:number",
            "unit": "iot-unit:temperature.metrix.celsius",
        },
    },
    "string": {
        "type": "iot-js:string",
    },
    "date": {
        "type": "iot-js:string",
        "iot-js:format": "iot-js:date",
    },
    "datetime": {
        "type": "iot-js:string",
        "iot-js:format": "iot-js:datetime",
    },
    "time": {
        "type": "iot-js:string",
        "iot-js:format": "iot-js:time",
    },
    "color": {
        "type": "iot-js:string",
        "iot-js:format": "iot-js:color",
    },
};
