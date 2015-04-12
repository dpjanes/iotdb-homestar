/*
 *  bin/commands/set.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-15
 *
 *  Produce JSIN-LD output for a Model
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

var fs = require('fs');
var uuid = require('uuid');
var unirest = require('unirest');

exports.command = "jsonld";
exports.boolean = [ "stdout", "compact", "upload", ];
exports.defaults = {
    compact: true
}
exports.summary = "produce JSON-LD for a Model";

exports.help = function () {
    console.log("usage: homestar jsonld [--stdout] [--no-compact] [--url <url>] <model-code>");
};

exports.run = function (ad) {
    if (ad._.length != 2) {
        console.log("wrong number of arguments");
        console.log("");
        exports.help();
        process.exit(1);
    }

    var name = ad._[1];
    var model_code = _.identifier_to_dash_case(name);
    var model = null;

    var bindings = iotdb.modules().bindings();
    for (var bi in bindings) {
        var binding = bindings[bi];
        if (binding.model_code !== model_code) {
            continue;
        }

        model = new binding.model();
        break;
    }

    if (!model) {
        console.log("# model not found", model_code);
        process.exit(1)
    }

    var jsonld_paramd = {};
    if (ad.url) {
        jsonld_paramd.base = ad.url;
    }

    var jsonld = model.jsonld(jsonld_paramd);
    var jsonld$ = null;
    if (ad.compact) {
        jsonld$ = JSON.stringify(_.ld.compact(jsonld), null, 2) + "\n";
    } else {
        jsonld$ = JSON.stringify(jsonld, null, 2) + "\n";
    }

    if (ad.upload) {
        settings.setup();
        if (!settings.d.keys.homestar.bearer) {
            console.log({
                method: "setup",
                cause: "no bearer token",
            }, "cannot talk to HomeStar");
            return;
        }

        var URL_MODELS = settings.d.homestar.url + '/api/1.0/models';
        
        unirest
            .post(URL_MODELS)
            .headers({
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + settings.d.keys.homestar.bearer,
            })
            .json(jsonld)
            .type('json')
            .end(function (result) {
                if (result.error) {
                    console.log({
                        url: URL_MODELS,
                        error: result.error,
                    }, "upload failed");
                    process.exit(1);
                } else if (result.body) {
                    process.stdout.write(result.body.model_url);
                    process.stdout.write("\n");
                    process.exit(0);
                } else {
                    console.log({
                        status: result.statusCode,
                        url: URL_MODELS,
                    }, "upload failed");
                    process.exit(1);
                }
            });
    } else if (ad.stdout) {
        process.stdout.write(jsonld$);
    } else {
        var filename = model_code + ".jsonld";
        fs.writeFile(filename, jsonld$, function(error) {
            if (error) {
                console.log("+ ERROR writing file:", filename, error);
            } else {
                console.log("+ wrote:", filename);
            }
        });
    }

};
