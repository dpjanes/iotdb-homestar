/*
 *  settings.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-28
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
var _ = iotdb.helpers;
var cfg = iotdb.cfg;

var os = require('os');
var open = require('open');
var path = require('path');
var util = require('util');
var fs = require('fs');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'settings',
});

var settings = {
    d: {
        ip: "127.0.0.1",
        folders: {
            sessions: ".sessions",
            users: ".users",
        },
        mqttd: {
            local: false,
            verbose: true,
            prefix: null,
            host: 'mqtt.iotdb.org',
            port: 1883,
            websocket: 8000
        },
        homestar: {
            url: "https://homestar.io",
            ping: true,
            key: null,
            secret: null,
            bearer: null,
        },
        webserver: {
            secret: null,
            scheme: "http",
            host: null,
            port: 3000
        },
        open_browser: true,
        name: null
    }
};

var setup = function () {
    var iot = iotdb.iot();
    var d = iot.cfg_get("homestar/runner");
    if (d) {
        _.smart_extend(settings.d, d);
    }

    if (!settings.d.webserver.secret) {
        logger.fatal({
            method: "setup_settings",
            cause: "please $ run iotdb set homestar/runner/webserver/secret 0 --uuid"
        }, "no secret for cookies");
        process.exit(0);
    }

    if (!settings.d.mqttd.prefix) {
        var username = iot.username;
        if (username === "nobody") {
            logger.fatal({
                method: "setup_settings",
                cause: "please run $ iotdb oauth-iotdb",
            }, "no 'username' - this may cause MQTT conflicts");
            process.exit(0);
        }

        var machine_id = iot.cfg_get('machine_id');
        if (!machine_id) {
            logger.fatal({
                method: "setup_settings",
                cause: "please run $ iotdb machine-id",
            }, "no 'machine_id' - this may cause MQTT conflicts");
            process.exit(0);
        }

        settings.d.mqttd.prefix = util.format("/u/%s/%s/", username, machine_id);
    }

    var ipv4 = _.ipv4();
    if (ipv4) {
        settings.d.ip = ipv4;
    }

    if (!settings.d.webserver.host) {
        settings.d.webserver.host = settings.d.ip;
    }

    if (!settings.d.webserver.url) {
        if (((settings.d.webserver.scheme === "https") && (settings.d.webserver.port === 443)) ||
            ((settings.d.webserver.scheme === "http") && (settings.d.webserver.port === 80))) {
            settings.d.webserver.url = util.format("%s://%s",
                settings.d.webserver.scheme, settings.d.webserver.host
            );
        } else {
            settings.d.webserver.url = util.format("%s://%s:%s",
                settings.d.webserver.scheme, settings.d.webserver.host, settings.d.webserver.port
            );
        }
    }

    if (!settings.d.name) {
        settings.d.name = os.hostname();
    }

    /* make folders - should be changed to make recursive */
    for (var key in settings.d.folders) {
        var folder = settings.d.folders[key];

        try {
            fs.mkdirSync(folder);
        } catch (x) {
        }
    }
};

/*
 *  API
 */
exports.setup = setup;
exports.d = settings.d;
