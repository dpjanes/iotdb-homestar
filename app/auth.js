/*
 *  auth.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-06-21
 *
 *  Specifically dealing with /auth/* and not authentication
 *  in general
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

const swig = require('swig');

const passport = require('passport');

const path = require('path');
const util = require('util');
const uuid = require('uuid');

const settings = require('./settings');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/auth',
});

var webserver_auth_thing = function (request, response) {
    logger.info({
        method: "webserver_auth_thing",
        metadata_id: request.params.metadata_id
    }, "called");

    response.redirect(
        util.format("%s/things/%s?from=%s", settings.d.homestar.url, request.params.metadata_id, request.headers.referer)
    );
};

/**
 */
var setup = function (app, make_dynamic) {
    app.get('/auth/things/:metadata_id', webserver_auth_thing);

    /*
    app.get('/sign/in', make_dynamic({
        template: path.join(__dirname, "..", "dynamic", "signin.html"),
        require_login: false,
        content_type: "text/html",
        locals: {
            digits: _.d.get(settings.d, "/keys/digits", null),
        },
    }));
     */
    app.get('/auth/logout', function (request, response) {
        request.logout();
        response.redirect('/');
    });
    app.get('/auth/homestar',
        passport.authenticate('twitter'),
        function (error, request, response, next) {
            make_dynamic({
                template: path.join(__dirname, "..", "dynamic", "500.html"),
                require_login: false,
                status: 500,
                locals: {
                    error: _.error.message(error),
                    // error: "HomeStar.io is not available right now - try again later",
                },
                content_type: "text/html",
            })(request, response);
        }
    );
    app.get('/auth/homestar/callback',
        passport.authenticate('twitter', {
            successRedirect: '/',
            failureRedirect: '/'
        })
    );
};

/**
 *  API
 */
exports.setup = setup;
