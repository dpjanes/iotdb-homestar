/*
 *  firebase.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-05-07
 *
 *  Manage FireBase connection
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

var unirest = require('unirest');
var firebase = require('firebase'); // NOTE: the real thing, not this module
var FirebaseTransport = require('iotdb-transport-firebase').Transport;

var settings = require('./settings');
var recipe = require('./recipe');
var things = require('./things');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/firebase',
});

/**
 */
var _connect = function() {
    /* check the timestamp */
    var firebase_transporter_check = new FirebaseTransport({
        firebase: _firebase,
        prefix: _cfg.path + "/" + settings.d.keys.homestar.key + "/things",
        add_timestamp: true,
        check_timestamp: true,
    });
    iotdb.transporter.bind(things.iotdb_transporter, firebase_transporter_check, {
        bands: [ "meta", "istate", "model", ],
        updated: [ "meta", ],
    });

    /* don't check the timestamp */
    var firebase_transporter_nocheck = new FirebaseTransport({
        firebase: _firebase,
        prefix: _cfg.path + "/" + settings.d.keys.homestar.key + "/things",
        add_timestamp: true,
        check_timestamp: false,
    });
    iotdb.transporter.bind(things.iotdb_transporter, firebase_transporter_nocheck, {
        bands: [ "ostate", ],
        updated: [ "ostate", ],
    });
};

var _firebase = null
var _cfg = null;

var _setup = function () {
    if (_firebase) {
        return;
    }

    _firebase = new firebase(_cfg.host);
    _firebase.auth(_cfg.token, 
        function() {
            logger.info({
                method: "_setup/auth",
                firebase: {
                    host: _cfg.host,
                    path: _cfg.path,
                }
            }, "connected to FireBase");
            _connect();
        },
        function(error) {
            logger.error({
                method: "_setup/auth/error",
                error: error,
                cause: "see the message - maybe network?",
            }, "could not auth with FireBase");
            _firebase = null;
            return;
        }
    );
};

/**
 *  This is called by homestar.profile
 */
var firebase_cfg = function (cfgd) {
    if (cfgd === null) {
    } else if (_cfg === null) {
        _cfg = cfgd;
        _setup();
    } else if (!_.isEqual(_cfg, cfgd)) {
        _cfg = cfgd;
        _restart();
    } else {
    }
};

/*
 *  API
 */
exports.firebase_cfg = firebase_cfg;
