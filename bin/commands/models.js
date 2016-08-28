/*
 *  bin/commands/models.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-08-28
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

const iotdb = require('iotdb');
const _ = iotdb._;

const path = require('path')
const fs = require('fs')

exports.command = "models";
exports.summary = "list models belonging to a Bridge";

exports.help = function () {
    console.log("usage: homestar about [bridge-module]");
    console.log("");
};

exports.run = function (ad) {
    const self = this;

    if (ad._.length < 2) {
        console.log("error: 'homestar models' takes the name of a bridge as an argument");
        console.log("");
        exports.help();
        process.exit(1);
    }

    const module_name = ad._[1];
    iotdb.use(module_name);

    _.flatten(iotdb
        .modules()
        .modules()
        .filter(module => module.module_name === module_name)
        .map(module => module.bindings), true)
        .filter(binding => binding.bridge)
        .map(binding => binding.model)
        .map(model => model)
        .map(model => _.d.first(model, "iot:model-id"))
        .map(model_id => model_id)
        .forEach(model_id => console.log("*", model_id));
};
