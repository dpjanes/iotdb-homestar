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

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'interactors',
});

/* raw interactor data - ideally this would be loaded
 * from IOTDB module data
 */
var interactord = {
	"click": "../interactors/click",
	"color": "../interactors/color",
	"enumeration": "../interactors/enumeration",
	"otherwise": "../interactors/otherwise",
};

var htmlsd = {}
var htmld = {};

var setup = function () {
    for (var interactor_key in interactord) {
        var interactor_relative = interactord[interactor_key];
        var interactor_path = path.join(__dirname, interactor_relative);

        var files = fs.readdirSync(interactor_path);
        for (var fi in files) {
            var src_file = files[fi];
            var src_ext = path.extname(src_file);
            var src_core = path.basename(src_file, src_ext);
            var src_path = path.join(interactor_path, src_file);
            var src_content = fs.readFileSync(src_path);

            if (src_file === "attribute.html") {
                var prefix = "{% if a._interactor == '" + interactor_key + "' %}";
                var postfix = "{% endif %}";

                src_content = prefix + src_content + postfix;
            } else if (src_ext === ".js") {
                var prefix = "<script>";
                var postfix = "</script>";

                src_content = prefix + src_content + postfix;
            } else if (src_ext === ".css") {
                var prefix = "<style type='text/css'>";
                var postfix = "</style>"

                src_content = prefix + src_content + postfix;
            } else {
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
exports.htmld = htmld;
exports.interactors = _.keys(interactord);
