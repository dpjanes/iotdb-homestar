/*
 *  homestar.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-28
 *
 *  Manage communications with HomeStar.io
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
var _ = iotdb._;

const unirest = require('unirest');

const settings = require('./settings');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/homestar',
});

var bearer;
var API_ROOT;
var API_CONSUMER;
var API_PING;
var API_PROFILE;

/**
 *  Ping the server that I'm alive
 */
var ping = function () {
    unirest
        .put(API_PING)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .json({
            'name': settings.d.name,
            'url': settings.d.webserver.url,
            'controller': _.ld.compact(iotdb.controller_meta()),
        })
        .type('json')
        .end(function (result) {
            if (result.error) {
                logger.error({
                    url: API_PING,
                    error: _.error.message(result.error),
                }, "ping failed");
            } else if (result.body) {
                logger.info({
                    url: API_PING,
                }, "pinged");
            } else {
                logger.error({
                    status: result.statusCode,
                    url: API_PING,
                }, "ping failed");
            }
        });
};

/*
 *  Fetch owner's profile, as determined by Bearer token
 */
var profile = function () {
    unirest
        .get(API_PROFILE)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .type('json')
        .end(function (result) {
            if (result.body) {
                logger.info({
                    body: result.body,
                }, "profile");

                const app = require("./app");
                app.extensions_apply("on_profile", function(worker, locals) {
                    worker(locals, result.body);
                });
            } else {
                logger.error({
                    status: result.statusCode,
                    url: API_PROFILE,
                    error: _.error.message(result.error),
                }, "profile failed");
            }
        });
};

var setup = function () {
    if (!settings.d.keys.homestar.bearer) {
        logger.error({
            method: "setup",
            cause: "no bearer token",
        }, "no HomeStar ping service");
        return;
    }

    /* setup variables */
    bearer = 'Bearer ' + settings.d.keys.homestar.bearer;
    API_ROOT = settings.d.homestar.url + '/api/1.0';
    API_CONSUMER = API_ROOT + '/consumers/' + settings.d.keys.homestar.key;
    API_PING = API_CONSUMER;
    API_PROFILE = API_ROOT + '/profile';

    /* ping now and forever */
    if (settings.d.homestar.ping) {
        ping();
        setInterval(ping, 5 * 60 * 1000);
    } else {
        logger.error({
            method: "setup",
            cause: "disabled in settings",
        }, "no HomeStar ping service");
    }

    /* fetch my profile */
    profile();
};

/*
 *  API
 */
exports.setup = setup;
