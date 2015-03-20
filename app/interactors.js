/*
 *  interactors.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-05
 *
 *  This is all kinda spec
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

var iotdb = require('iotdb');
var _ = iotdb._;
var cfg = iotdb.cfg;

var settings = require('./settings');

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');
var express = require('express');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'interactors',
});

/* raw interactor data - ideally this would be loaded
 * from IOTDB module data
 */
var _interactord = {
	"boolean": "../interactors/boolean",
	"click": "../interactors/click",
	"color": "../interactors/color",
	"enumeration": "../interactors/enumeration",
	"select": "../interactors/select",
	"slider": "../interactors/slider",
	"otherwise": "../interactors/otherwise",
};

var htmlsd = {}
var htmld = {};
var moduled = {};

/**
 */
var assign_interactor_to_attribute = function(attributed) {
    var bestd = null;

    for (var interactor_key in moduled) {
        var module = moduled[interactor_key];
        if (!module.attribute) {
            continue;
        }

        var overlayd = module.attribute(attributed)
        if (overlayd === undefined) {
            continue;
        }

        overlayd._interactor = interactor_key;
        overlayd._q = overlayd._q || ( 0.66 + (overlayd._qd || 0));

        if (!bestd) {
            bestd = overlayd;
        } else if (overlayd._q > bestd._q) {
            bestd = overlayd;
        }
    }

    if (bestd) {
        _.extend(attributed, bestd);
        delete attributed._q;
        delete attributed._qd;
    }
};

/**
 *  Setup static routes for ExpressJS
 */
var setup_app = function(app) {
    for (var interactor_key in moduled) {
        var module = moduled[interactor_key];
        app.use('/static/interactors/' + module.name, express.static(module.path));
    }
}

/**
 */
var setup = function () {
    for (var interactor_key in _interactord) {
        var interactor_relative = _interactord[interactor_key];
        var interactor_path = path.join(__dirname, interactor_relative);

        var files = fs.readdirSync(interactor_path);
        for (var fi in files) {
            var src_file = files[fi];
            var src_path = path.join(interactor_path, src_file);
            var src_ext = path.extname(src_file);
            if (src_ext.length === 0) {
                continue
            }
            var src_core = path.basename(src_file, src_ext);
            var src_content = "";

            if (src_file === "interactor.js") {
                /* not included */
                try {
                    module = require(src_path);
                    module.path = interactor_path;
                    module.name = interactor_key;

                    moduled[interactor_key] = module;
                }
                catch (x) {
                    logger.error({
                        method: "setup",
                        interactor: interactor_key,
                        path: interactor_path,
                        x: x,
                    }, "unexpected exception loading interactor.js");
                }

                continue;
            } else if (src_file === "attribute.html") {
                var prefix = "{% if attribute._interactor == '" + interactor_key + "' %}";
                var postfix = "{% endif %}";

                src_content = fs.readFileSync(src_path);
                src_content = prefix + src_content + postfix;
            } else if (src_ext === ".js") {
                src_core = "js";
                src_content = "<script src='/static/interactors/" + interactor_key + "/" + src_file + "'></script>";
            } else if (src_ext === ".css") {
                src_core = "css";
                src_content = "<link rel='stylesheet' href='/static/interactors/" + interactor_key + "/" + src_file + "' />";
            } else {
                continue;
            }

            var htmls = htmlsd[src_core];
            if (htmls === undefined) {
                htmls = [];
                htmlsd[src_core] = htmls;
            }

            htmls.push(src_content);
        }
    }

    for (var key in htmlsd) {
        htmls = htmlsd[key];
        htmld[key] = htmls.join("\n");
    }
};

/**
 *  API
 */
exports.setup = setup;
exports.setup_app = setup_app;
exports.htmld = htmld;
exports.interactors = _.keys(_interactord);
exports.assign_interactor_to_attribute = assign_interactor_to_attribute;
