/*
 *  transport.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-25
 *
 *  Manage communications with Transports
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

var unirest = require('unirest');
var FirebaseTransport = require('iotdb-transport-firebase').Transport;

var settings = require('./settings');
var recipe = require('./recipe');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/transport',
});

/**
 *  Also: There'll probably be a transport for each individual client
 *  out on the web so we can encrypt the packets
 */
var _setup_firebase_transport = function () {
    /*
     *  This transporter is for metadata editing.
     */
    var homestar_transporter = new FirebaseTransport({
        prefix: settings.d.keys.homestar.key + "/homestar",
    });

    var iot = iotdb.iot()
    iotdb.transport(homestar_transporter, iot.things(), {
        meta: true,
        model: true,
        istate: false,
        ostate: false,
        verbose: true,
    });
    /*
    iotdb.transport(transporter, recipe.recipes(), {
        istate: false,
        ostate: false,
    });
     */
};

var setup = function () {
    if (!settings.d.keys.homestar.bearer) {
        logger.error({
            method: "setup",
            cause: "no bearer token",
        }, "no HomeStar ping service");
        return;
    }

    try {
        _setup_firebase_transport();
    } catch (x) {
        logger.error({
            method: "setup",
            cause: "likely not configured",
            error: x,
        }, "Firebase setup failed");
        return;
    }
};

/*
 *  API
 */
exports.setup = setup;
