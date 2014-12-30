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
            local: true,
            verbose: true,
            prefix: null,
            host: null,
            port: 1883,
            websocket: 8000
        },
        homestar: {
            url: "https://homestar.io",
            ping: true,
            profile: true,
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
        secrets: {
            host: null,     // not really a secret, as published on MQTT
            session: null,
        },
        debug: {
            requests: null,
            urls: null,
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

    /* all secrets must be set */
    var sd = settings.d.secrets;
    for (var key in sd) {
        var value = sd[key];
        if (!value) {
            logger.error({
                method: "setup",
                cause: "admin hasn't completed setup",
            }, "missing secret: do $ iotdb set homestar/runner/secrets/" + key + " 0 --uuid");
            process.exit(1);
        }
    }

    /* MQTT */
    if (!settings.d.mqttd.prefix) {
        settings.d.mqttd.prefix = util.format("/runners/%s/", settings.d.host);
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
        } catch (x) {}
    }
};

/*
 *  API
 */
exports.setup = setup;
exports.d = settings.d;
