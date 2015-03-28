/*
 *  settings.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-28
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
var timers = require('iotdb-timers');
var _ = iotdb.helpers;

var os = require('os');
var open = require('open');
var path = require('path');
var util = require('util');
var fs = require('fs');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/settings',
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
        },
        webserver: {
            secret: null,
            scheme: "http",
            host: null,
            port: 3000,
            folders: {
                static: [
                    path.join('$HOMESTAR_INSTALL', 'static'),
                    path.join('$HOMESTAR_INSTALL', 'static', 'flat-ui'),
                    // path.join('$HOMESTAR_INSTALL', 'static', 'bootstrap-colorpicker'),
                    // path.join('$HOMESTAR_INSTALL', 'static', 'jquery-minicolors'),
                ],
                dynamic: [
                    path.join('$HOMESTAR_INSTALL', 'dynamic'),
                ]
            }
        },
        secrets: {
            host: null,     // not really a secret, as published on MQTT
            session: null,
        },
        keys: {
            homestar: {
                key: null,
                secret: null,
                bearer: null,
            }
        },
        debug: {
            requests: null,
            urls: null,
            pre: null, // homestar/runner/debug/pre
        },
        location: {
            latitude: null,
            longitude: null,
            locality: null,
            country: null,
            region: null,
            timezone: null,
            postal_code: null,
        },
        cookbooks_path: "cookbooks",
        browser: true,
        name: null
    }
};

var _set = function (key, value) {
    var d = settings.d;
    var subkeys = key.split('/');
    var lastkey = subkeys[subkeys.length - 1];

    for (var ski = 0; ski < subkeys.length - 1; ski++) {
        var subkey = subkeys[ski];
        var subd = d[subkey];
        if (!_.isObject(subd)) {
            subd = {};
            d[subkey] = subd;
        }

        d = subd;
    }

    var ovalue = d[lastkey];
    if (_.isBoolean(ovalue)) {
        value = parseInt(value) ? true : false;
    } else if (_.isInteger(ovalue)) {
        value = parseInt(value);
    } else if (_.isNumber(ovalue)) {
        value = parseFloat(value);
    } else if (_.isArray(ovalue)) {
        logger.fatal({
            method: "_set",
            key: key,
            value: value,
            cause: "sorry - cannot set an array value here",
        }, "can't set an array");
    } else if (_.isArray(ovalue)) {
        logger.fatal({
            method: "_set",
            key: key,
            value: value,
            cause: "sorry - cannot set a dictionary value here",
        }, "can't set a dictionary");
    }

    d[lastkey] = value;
};

var setup = function (av) {
    var iot = iotdb.iot();
    var d = iotdb.keystore().get("/homestar/runner");
    if (d) {
        _.smart_extend(settings.d, d);
    }

    /* command line arguments - homestar/runner prefix not needed (or desired) */
    if (av !== undefined) {
        for (var ai in av) {
            var a = av[ai];
            var amatches = a.match(/^([^=]*)=(.*)/);
            if (amatches) {
                _set(amatches[1], amatches[2]);
            }
        }
    }

    /* all secrets must be set  - note that this is done automatically by $ homestar setup */
    var sd = settings.d.secrets;
    for (var key in sd) {
        var value = sd[key];
        if (!value) {
            logger.error({
                method: "setup",
                cause: "admin hasn't completed setup",
                fix: "$ homestar set secrets/" + key + " 0 --uuid",
            }, "missing secret");
            process.exit(1);
        }
    }

    /* Homestar.io */
    if (!settings.d.keys.homestar.key || !settings.d.keys.homestar.secret || !settings.d.keys.homestar.bearer) {
        logger.error({
            method: "setup",
            cause: "HomeStar.io API keys not added",
            fix: "get a keys from https://homestar.io/runners/",
        }, "HomeStar.io API keys not added - you should do this");
    }

    /* MQTT */
    if (!settings.d.mqttd.prefix) {
        settings.d.mqttd.prefix = util.format("/runners/%s/", settings.d.secrets.host);
    }

    /* Location for Timers */
    if ((settings.d.location.latitude !== null) && (settings.d.location.longitude !== null)) {
        timers.setLocation(settings.d.location.latitude, settings.d.location.longitude);
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
exports.envd = {
    "HOMESTAR_INSTALL": path.join(__dirname, ".."),
};
