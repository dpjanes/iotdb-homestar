/*
 *  bin/commands/configure.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-02-15
 *
 *  Configure a Bridge
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

var express = require('express');
var swig = require('swig');
var open = require('open');
var util = require('util');
var path = require('path');
var bodyParser = require('body-parser')

exports.command = "configure";
exports.summary = "configure a bridge";

exports.help = function () {
    console.log("usage: homestar configure [<bridge-module>|<model>]");
    console.log("");
    console.log("Configure a Bridge");
    console.log("");
    console.log("Use 'homestar configuration' to see what's installed");
    console.log("Use 'homestar install' to install new Bridges");
};

exports.run = function (ad) {
    if (ad._.length != 2) {
        console.log("homestar configure takes a single argument");
        console.log("");
        exports.help();
        process.exit(1);
    }

    var name = ad._[1];

    var Bridge = iotdb.modules().bridge(name)
    if (Bridge === undefined) {
        console.log("# no bridge named %s", name);
        process.exit(1);
    } else if (Bridge === undefined) {
        console.log("# module %s does not export a Bridge", name);
        process.exit(1);
    }
    var app = express();

    var templates = path.join(__dirname, 'configure');

    swig.setDefaults({
        loader: swig.loaders.fs(templates)
    });

    app.engine('html', swig.renderFile);
    app.swig = swig;
    app.use(bodyParser.urlencoded({ extended: false }))

    var bridge = new Bridge();
    if (bridge.configure) {
        bridge.configure(app);
    }
    /*
    */

    for (var fi in settings.d.webserver.folders.static) {
        var folder = settings.d.webserver.folders.static[fi];
        app.use('/', 
            express.static(cfg.cfg_expand(settings.envd, folder))
        );
    }

    var server = app.listen(9998);
    server.on('listening', function() {
        var port = server.address().port
        app.html_root = util.format("http://localhost:%s", port);
        open(app.html_root);
    })
};
