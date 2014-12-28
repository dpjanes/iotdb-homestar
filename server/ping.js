/*
 *  ping.js
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

var unirest = require('unirest');

var settings = require('./settings');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'web',
});

var bearer;
var server_url;

var ping = function () {
    unirest
        .put(server_url)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .json({
            'name': settings.d.name,
            'url': settings.d.webserver.url,
        })
        .type('json')
        .end(function (result) {
            if (result.body) {
                logger.info({
                    url: server_url,
                }, "pinged");
            } else {
                logger.error({
                    status: result.statusCode,
                    url: server_url,
                }, "ping failed");
            }
        });
};

var setup = function () {
    if (!settings.d.homestar.ping) {
        logger.error({
            method: "setup",
            cause: "disabled in settings",
        }, "no HomeStar ping service");
        return;
    }

    if (!settings.d.homestar.bearer) {
        logger.error({
            method: "setup",
            cause: "no bearer token",
        }, "no HomeStar ping service");
        return;
    }

    /* setup variables */
    bearer = 'Bearer ' + settings.d.homestar.bearer;
    server_url = settings.d.homestar.url + '/api/1.0/consumers/' + settings.d.homestar.key;

    /* ping now and forever */
    ping();
    setInterval(ping, 5 * 60 * 1000);
};

/*
 *  API
 */
exports.setup = setup;
