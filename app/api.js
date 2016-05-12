/*
 *  api.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-06-21
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

var path = require('path');
var util = require('util');
var jwt = require('jsonwebtoken');
var unirest = require('unirest');

var settings = require('./settings');
var users = require('./users');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/api',
});

var tud = {};

/*
var authenticate_bearer = function (required) {
    return function (request, response, next) {
        if (request.user) {
            return next();
        }

        if (!request.headers.authorization) {
            return next();
        }

        var match = request.headers.authorization.match(/^Bearer (.*)/);
        if (!match) {
            return next();
        }

        var user_token = match[1];
        var user = tud[user_token];
        if (user) {
            request.user = user;
            return next();
        } else if (user === null) {
            return next();
        } else {
            var requestd = {
                user_token: user_token,
            };

            var url_homestar_validate_user = settings.d.homestar.url + "/api/1.0/consumers/:consumer_id/validate-user-token";
            var validate_user_url = url_homestar_validate_user.replace(/:consumer_id/, settings.d.keys.homestar.key);
            unirest.put(validate_user_url)
                .type('json')
                .json(requestd)
                .headers({
                    "Authorization": "Bearer " + settings.d.keys.homestar.bearer,
                })
                .end(function (result) {
                    logger.info({
                        method: "authenticate_bearer",
                        error: result.error,
                        status: result.status,
                        user_identity: result.body && result.body.identity,
                    }, "authentication result");

                    if (result.status === 200) {
                        tud[user_token] = result.body;
                        request.user = result.body;
                    }

                    next();
                });
        }
    };
};
*/

/**
 *  See document "2015-07 HomeStar-Runner-Client Auth Flow.md"
    PUT https://<RUNNER-IP>/api/authenticate
    {
        "user-identity": "https://homestar.io/identity/something"
    }
    -
    {
        "consumer-id": "<consumer-id of RUNNER>",
        "user-identity": "<user-identity of CLIENT>"
        "consumer-signature": "<JWT(CONSUMER-ID,USER-ID,SIGNED(CLIENT SECRET))>"
    }
 */
/*
var put_create_consumer_signature = function (request, response) {
    var user_identity = request.body.user_identity;
    if (!user_identity || !user_identity.match(/^https?:\/\//)) {
        return response
            .set('Content-Type', 'application/json')
            .status(400)
            .send(JSON.stringify({
                "error": "no or malformed user identity",
            }, null, 2));
    }

    var payload = {
        user_identity: user_identity,
        consumer_id: settings.d.keys.homestar.key,
    };
    var options = {
        expiresInMinutes: 5,
    };
    payload.consumer_signature = jwt.sign(payload, settings.d.keys.homestar.secret, options);

    return response
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(payload));
};
*/

/**
 *  What can I do as a user
 */
/*
var get_auth = function (request, response) {
    var user = request.user;
    var groups = _.ld.list(user, "groups", []);

    var rd = {
        "permissions": {
            "things": users.allowed(user, groups, "things"),
            "recipes": users.allowed(user, groups, "recipes"),
            "users": users.allowed(user, groups, "users"),
        },
        "access": {
            "login": _.d.get(settings.d, "/access/login") ? true : false,
            "open": _.d.get(settings.d, "/access/open") ? true : false,
        },
    };

    if (user) {
        rd.user = user;
    }

    return response
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(rd, null, 2));
};
*/

/**
 *  Root of API. Things and Recipes
 *  are magically served elsewhere using Transporters
 */
var get_api = function (request, response) {
    var d = {
        "@context": "https://iotdb.org/pub/iot",
        "@id": "/api",
        "@timestamp": _.timestamp.make(),
        "things": "/api/things",
        "recipes": "/api/recipes",
    };
    _.extend(d, _.ld.compact(iotdb.controller_meta()));
    d["iot:controller.runner"] = settings.d.keys.homestar.key;

    d["_mqtt"] = util.format("tcp://%s:%s%s",
        settings.d.mqttd.host, settings.d.mqttd.port,
        _.net.url.join(settings.d.mqttd.prefix, "api", "#"));

    return response
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(d, null, 2));
};

/**
 */
var setup = function (app) {
    // app.all('/api/*', authenticate_bearer());
    app.get('/api/', get_api);
    // app.get('/api/auth', get_auth);
    // app.put('/api/auth/create-user-signature', put_create_consumer_signature);
};

/**
 *  API
 */
exports.setup = setup;
