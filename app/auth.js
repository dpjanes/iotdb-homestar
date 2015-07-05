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

var iotdb = require('iotdb');
var _ = iotdb.helpers;
var cfg = iotdb.cfg;

var swig = require('swig');

var passport = require('passport');

var path = require('path');
var util = require('util');
var uuid = require('uuid');

var settings = require('./settings');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/auth',
});

/**
 *  Edit the permissions of a recipe - i.e. who can use it.
 *  We actually do all the editing on HomeStar
 */
var webserver_auth_cookbook = function (request, response) {
    logger.info({
        method: "webserver_auth_cookbook",
        metadata_id: request.params.metadata_id,
    }, "called");

    response.redirect(
        util.format("%s/cookbooks/%s?from=%s", settings.d.homestar.url, request.params.metadata_id, request.headers.referer)
    );
};

var webserver_auth_thing = function (request, response) {
    logger.info({
        method: "webserver_auth_thing",
        metadata_id: request.params.metadata_id
    }, "called");

    response.redirect(
        util.format("%s/things/%s?from=%s", settings.d.homestar.url, request.params.metadata_id, request.headers.referer)
    );
};

var mqtt_tokend = {};

/**
 *  This will return a token that can be used as a MQTT
 *  Client ID. 
 */
var get_token_mqtt = function (request, response) {
    var client_id = make_token_mqtt(request.user);

    return response
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ client_id: client_id }, null, 2));
}

/**
 */
var make_token_mqtt = function(user) {
    if (!user) {
        return "anon-" + uuid.v4();
    }

    var client_id = "homestar-" + uuid.v4();
    mqtt_tokend[client_id] = {
        client_id: client_id,
        when: (new Date()).getTime(),
        user: user,
    };

    return client_id;
};

/**
 */
var redeem_token_mqtt = function(client_id) {
    var now = (new Date()).getTime();
    var removes = [];
    var user = null;

    // can't be a user
    if (client_id.indexOf("homestar-") !== 0) {
        return user;
    }

    // find user, ignoring expired results
    for (var key in mqtt_tokend) {
        var id = mqtt_tokend[key];
        if ((now - id.when) > 60 * 1000) {
            removes.push(key);
        } else if (id.client_id === client_id) {
            removes.push(key);
            user = id.user;
        }
    }
    
    // remove expired results
    for (var ri in removes) {
        delete mqtt_tokend[removes[ri]];
    }

    return user;
}

/**
 */
var setup = function (app) {
    app.get('/auth/cookbooks/:metadata_id', webserver_auth_cookbook);
    app.get('/auth/things/:metadata_id', webserver_auth_thing);

    app.get('/auth/logout', function (request, response) {
        request.logout();
        response.redirect('/');
    });
    app.get('/auth/homestar',
        passport.authenticate('twitter'),
        function (error, request, response, next) {
            require('./app').make_dynamic({
                template: path.join(__dirname, "..", "dynamic", "500.html"),
                require_login: false,
                status: 500,
                locals: {
                    error: "HomeStar.io is not available right now - try again later",
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
    // app.get('/auth/mqtt-token', get_token_mqtt);
    app.put('/auth/mqtt-token', get_token_mqtt);
};

/**
 *  API
 */
exports.setup = setup;
exports.redeem_token_mqtt = redeem_token_mqtt;
exports.make_token_mqtt = make_token_mqtt;
