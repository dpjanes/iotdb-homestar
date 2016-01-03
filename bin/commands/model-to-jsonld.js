/*
 *  bin/commands/model-to-jsonld.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-15
 *
 *  Produce JSON-LD output for a Model
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

exports.command = "model-to-jsonld";
exports.boolean = [ "stdout", "compact", "upload", "iotql", ];
exports.defaults = {
    compact: true
}
exports.summary = "produce JSON-LD for a Model";

exports.help = function () {
    console.log("usage: homestar model-to-jsonld [--stdout] [--no-compact] [--url <url>] <model-code>");
    console.log("");
    console.log("--url         base URL for the Model");
    console.log("--stdout      write to stdout (rather than appropriately named file)");
    console.log("--no-compact  don't compact URIs in the JSON-LD");
    console.log("");
    console.log("This command will produce a '.iotql' file for a Model.");
    console.log("Note that the Model must be known to IOTDB.");
    console.log("A list of known model can be found by 'homestar configuration'.");
    console.log("");
};

exports.run = function (ad) {
    if (ad._.length != 2) {
        console.log("%s: Wrong number of arguments", ad._[0]);
        console.log();
        exports.help();
        process.exit(1);
    }

    var name = ad._[1];
    var model_code = _.id.to_dash_case(name);
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

    var jsonld$ = null;
    if (ad.iotql) {
        jsonld$ = model.iotql(jsonld_paramd);
    } else {
        var jsonld = model.jsonld(jsonld_paramd);
        if (ad.compact) {
            jsonld = _.ld.compact(jsonld);
            jsonld = _ld_patchup(jsonld);
            jsonld$ = JSON.stringify(_.ld.compact(jsonld), null, 2) + "\n";
        } else {
            jsonld$ = JSON.stringify(jsonld, null, 2) + "\n";
        }
    }

    if (ad.upload && !ad.iotql) {
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
        process.exit(0);
    } else {
        var filename;
        if (ad.iotql) { 
            filename = _.id.to_camel_case(model_code) + ".iotql";
        } else {
            filename = model_code + ".jsonld";
        }

        fs.writeFile(filename, jsonld$, function(error) {
            if (error) {
                console.log("+ ERROR writing file:", filename, error);
            } else {
                console.log("+ wrote:", filename);
            }
            process.exit(0);
        });
    }

};

/**
 *  This make sure all name spaces and @id types
 *  we are aware of are properly represented 
 *  in the @context
 */
var _ld_patchup = function (v, paramd) {
    var nd = {};

    var _add = function(v) {
        if (!_.is.String(v)) {
            return false;
        }

        var vmatch = v.match(/^([-a-z0-9]*):.+/);
        if (!vmatch) {
            return false;
        }
        
        var nshort = vmatch[1];
        var nurl = _namespace[nshort];
        if (!nurl) {
            return false;
        }

        nd[nshort] = nurl;

        return true;
    };
    var _walk = function(o) {
        if (_.is.Object(o)) {
            for (var key in o) {
                if (!_add(key)) {
                    continue;
                } else if (!key.match(/^iot/)) {
                    continue;
                } else if (key === "iot:help") {
                    continue;
                }

                var sv = o[key];
                if (_walk(sv)) {
                    nd[key] = {
                        "@id": _ld_expand(key),
                        "@type": "@id"
                    };
                }
            }
        } else if (_.is.Array(o)) {
            var any = false;
            o.map(function(sv) {
                _add(sv);
                any |= _walk(sv);
            });
            return any;
        } else if (_.is.String(o)) {
            if (_add(o)) {
                return true;
            }
        }
    };

    _walk(v);

    if (!v["@context"]) {
        v["@context"] = {};
    }

    _.extend(v["@context"], nd);

    return v;
};
