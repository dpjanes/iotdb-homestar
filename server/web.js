/*
 *  web.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-12
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

var express = require('express');
var express_session = require('express-session');
var express_cookie_parser = require('cookie-parser');
var express_body_parser = require('body-parser');
var express_session_file_store = require('session-file-store')(express_session);

var swig = require('swig');

var passport = require('passport');
var passport_twitter = require('passport-twitter').Strategy;

var os = require('os');
var open = require('open');
var path = require('path');
var util = require('util');
var fs = require('fs');

var mqtt = require('./mqtt');
var recipe = require('./recipe');
var data = require('./data');
var settings = require('./settings');
var homestar = require('./homestar');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'web',
});

/**
 *  Serve the home page - dynamically created
 */
var webserver_home = function (request, result) {
    logger.info({
        method: "webserver_home",
        user: request.user,
    }, "called");

    /*
     *  Render
     */
    var home_template = path.join(__dirname, '..', 'client', 'index.html');
    var home_page = swig.renderFile(home_template, {
        cdsd: recipe.group_recipes(),
        settings: settings.d,
        user: request.user,
    });

    result.set('Content-Type', 'text/html');
    result.send(home_page);
};

/**
 *  Run a particular recipe. This is always
 *  the result of a PUT
 */
var webserver_recipe = function (request, result) {
    logger.info({
        method: "webserver_recipe",
        recipe_id: request.params.recipe_id
    }, "called");

    var reciped = recipe.recipe_by_id(request.params.recipe_id);
    if (!reciped) {
        logger.error({
            method: "webserver_recipe",
            recipe_id: request.params.recipe_id
        }, "recipe not found");

        result.set('Content-Type', 'application/json');
        result.status(404).send(JSON.stringify({
            error: "recipe not found",
            recipe_id: request.params.recipe_id
        }, null, 2));
        return;
    }

    if (reciped._context) {
        logger.error({
            method: "webserver_recipe",
            recipe_id: request.params.recipe_id,
            cause: "user sent the request before a previous version finished",
        }, "recipe is still running");

        result.set('Content-Type', 'application/json');
        result.status(409).send(JSON.stringify({
            error: "recipe is still running",
            recipe_id: request.params.recipe_id
        }, null, 2));
        return;
    }

    var context = new recipe.Context(request.params.recipe_id, reciped);
    context.on("message", function (id, reciped, message) {
        var topic = settings.d.mqttd.prefix + "api/cookbook/" + id;
        var payload = {
            message: message
        };

        mqtt.publish(settings.d.mqttd, topic, payload);
    });
    context.on("running", function (id, reciped) {
        var topic = settings.d.mqttd.prefix + "api/cookbook/" + id;
        var payload = {
            running: context.running
        };

        mqtt.publish(settings.d.mqttd, topic, payload);

        if (!context.running) {
            reciped._context = undefined;
        }
    });
    context.run(request.body.value);

    result.set('Content-Type', 'application/json');
    result.send(JSON.stringify({
        running: context.running
    }, null, 2));

    if (context.running) {
        reciped._context = context;
    }
};

exports.app = null;

var setup_express = function (app) {
    app.use(express_body_parser.json());
    app.use(express_cookie_parser());
    app.use(express_body_parser());
    app.use(express_session({
        secret: settings.d.secrets.session,
        resave: false,
        saveUninitialized: true,
        store: new express_session_file_store({
            path: settings.d.folders.sessions,
            ttl: 7 * 24 * 60 * 60,
        })
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    if (settings.d.debug.requests) {
        app.use(function (request, response, next) {
            logger.info({
                request: {
                    url: request.url,
                    method: request.method,
                    params: request.params,
                    query: request.query,
                    headers: request.headers,
                },
            }, "----------------");
            next();
        });
    } else if (settings.d.debug.urls) {
        app.use(function (request, response, next) {
            logger.info({
                url: request.url,
            }, request.method);
            next();
        });
    }
};

var setup_pages = function (app) {
    app.get('/', webserver_home);
    app.use('/', express.static(path.join(__dirname, '..', 'client')));
    app.use('/', express.static(path.join(__dirname, '..', 'client', 'flat-ui')));
    app.put('/api/cookbook/:recipe_id', webserver_recipe);

    app.get('/auth/logout', function (request, response) {
        request.logout();
        response.redirect('/');
    });
    app.get('/auth/homestar', passport.authenticate('twitter'));
    app.get('/auth/homestar/callback',
        passport.authenticate('twitter', {
            successRedirect: '/',
            failureRedirect: '/'
        })
    );
};

/**
 *  We use 'twitter' auth but it's actually HomeStar
 *  talking the same protocol
 */
var setup_passport = function () {
    var iot = iotdb.iot();

    var server_url = settings.d.homestar.url;
    var client_url = settings.d.webserver.url;
    passport.use(
        new passport_twitter({
                consumerKey: settings.d.homestar.key,
                consumerSecret: settings.d.homestar.secret,
                callbackURL: client_url + "/auth/homestar/callback",
                requestTokenURL: server_url + '/oauth/request_token',
                accessTokenURL: server_url + '/oauth/access_token',
                userAuthorizationURL: server_url + '/oauth/authenticate',
                userProfileURL: server_url + '/api/1.0/profile'
            },
            function (token, token_secret, profile, done) {
                var user = {
                    id: profile.id,
                    username: profile.username,
                    service: "homestar",
                    oauth: {
                        token: token,
                        token_secret: token_secret,
                    },
                };
                done(null, user);
            })
    );

    passport.serializeUser(function (user, done) {
        logger.info({
            user: user,
        }, "passport/serialize");

        /* rehash ID just in case */
        var id_hash = _.md5_hash(user.id);
        var user_path = path.join(settings.d.folders.users, id_hash + ".json");

        fs.writeFileSync(user_path, JSON.stringify(user, null, 2) + "\n");

        done(null, user.id);
    });

    passport.deserializeUser(function (user_id, done) {
        var id_hash = _.md5_hash(user_id);
        var user_path = path.join(settings.d.folders.users, id_hash + ".json");

        try {
            var user = JSON.parse(fs.readFileSync(user_path));
            logger.info({
                user: user,
                user_id: user_id,
            }, "passport/deserialize");

            done(null, user);
        } catch (x) {
            // console.log("HERE:A", x);
            // process.exit(0);
            done(null, null);
        }
    });
};

/*
 *  Start IOTDB
 */
var iot = iotdb.iot();
iot.on_thing(function (thing) {
    logger.info({
        thing: thing.thing_id(),
        meta: thing.meta().state(),
    }, "found new thing");
});

/*
 *  Load Actions
 */
recipe.load_recipes();

/**
 *  Setup the web server
 */
settings.setup();
setup_passport();

var app = express();
exports.app = app;

setup_express(app);
setup_pages(app);

/*
 *  Run the web server
 */
var wsd = settings.d.webserver;
app.listen(wsd.port, wsd.host);

logger.info({
    method: "main",
    url: settings.d.webserver.url,
}, "listening for connect");

if (settings.d.open_browser) {
    open(settings.d.webserver.url);
}

/*
 *  Other servers
 */
mqtt.setup();
homestar.setup();
