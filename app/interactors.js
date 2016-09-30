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

"use strict";

const iotdb = require('iotdb');
const _ = iotdb._;

const settings = require('./settings');

const events = require('events');
const util = require('util');
const path = require('path');
const fs = require('fs');
const express = require('express');

const logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/interactors',
});

const htmlsd = {};
const htmld = {};
const moduled = {};

// find the best interactor for an attribute
const interactor = attributed => 
    _.reduce(
        _.pairs(moduled)
            .map(kv => ({ key: kv[0], module: kv[1] }))
            .filter(d => d.module.attribute)
            .map(d => _.d.add(d, "interactor", d.module.attribute(attributed)))
            .filter(d => d.interactor)
            .map(d => _.d.add(d, "/interactor/_interactor", d.key))
            .map(d => _.d.add(d, "_q", d.interactor._q || (0.66 + (d.interactor._qd || 0)))),
        ( b, d ) => (b && (b._q > d._q)) ? b : d,
    { _q: 0, interactor: null }).interactor;

// Setup static routes for ExpressJS
const setup_app = app => 
    _.values(moduled)
        .map(module => app.use('/static/interactors/' + module.name, express.static(module.path)));

//
const _add_interactor = function (interactor_key, interactor_path) {
    var files = fs.readdirSync(interactor_path);
    for (var fi in files) {
        var src_file = files[fi];
        var src_path = path.join(interactor_path, src_file);
        var src_ext = path.extname(src_file);
        if (src_ext.length === 0) {
            continue;
        }
        var src_core = path.basename(src_file, src_ext);
        var src_content = "";

        if (src_file === "interactor.js") {
            /* not included */
            try {
                const module = require(src_path);
                module.path = interactor_path;
                module.name = interactor_key;

                moduled[interactor_key] = module;
            } catch (x) {
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
};

const _interactord = {};

/**
 *  These come with iotdb-homestar. 
 */
const _setup_builtin_interactors = function () {
    var interactor_root = path.join(__dirname, "../interactors");
    var interactor_folders = fs.readdirSync(interactor_root);
    for (var ifi in interactor_folders) {
        var interactor_relative = interactor_folders[ifi];
        var interactor_path = path.join(interactor_root, interactor_relative);
        try {
            if (!fs.lstatSync(interactor_path).isDirectory()) {
                continue;
            }
        } catch (x) {
            console.log(x);
            continue;
        }

        var interactor_key = path.basename(interactor_relative);

        _interactord[interactor_key] = interactor_path;
    }
};

/**
 *  These are loaded by the user via "homestar install"
 */
const _setup_module_interactors = function () {};

/**
 */
const setup = function () {
    _setup_builtin_interactors();
    _setup_module_interactors();

    _.mapObject(_interactord, ( interactor_path, interactor_key ) => _add_interactor(interactor_key, interactor_path));
    _.mapObject(htmlsd, ( htmls, key ) => htmld[key] = htmls.join("\n"))
};

/**
 *  API
 */
exports.setup = setup;
exports.setup_app = setup_app;
exports.htmld = htmld;
exports.interactors = _.keys(_interactord);
exports.interactor = interactor;
