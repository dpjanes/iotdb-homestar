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
var express_session = require('express-session')
var express_cookie_parser = require('cookie-parser')
var express_body_parser = require('body-parser')
var swig = require('swig');

var passport = require('passport')
var passport_twitter = require('passport-twitter').Strategy;

var os = require('os');
var open = require('open');
var path = require('path');
var util = require('util');

var mqtt = require('./mqtt');
var action = require('./action');
var data = require('./data');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'web',
});

var settingsd = {
    ip: "127.0.0.1",
    mqttd: {
        local: false,
        verbose: true,
        prefix: null,
        host: 'mqtt.iotdb.org',
        port: 1883,
        websocket: 8000
    },
    twitter: {
        key: null,
        secret: null,
    },
    webserver: {
        secret: null,
        scheme: "http",
        host: null,
        port: 3000
    },
    open_browser: true
};
var serverd = {
    webserver: {
        scheme: "http",
        host: null,
        port: 3001
    },
}

/**
 */
var setup_settings = function() {
    var iot = iotdb.iot();
    var d = iot.cfg_get("homestar/client");
    if (d) {
        _.smart_extend(settingsd, d);
    }

    if (!settingsd.webserver.secret) {
        logger.fatal({
            method: "setup_settings",
            cause: "please $ run iotdb set homestar/client/webserver/secret 0 --uuid"
        }, "no secret for cookies");
        process.exit(0);
    }

    if (!settingsd.mqttd.prefix) {
        var username = iot.username;
        if (username === "nobody") {
            logger.fatal({
                method: "setup_settings",
                cause: "please run $ iotdb oauth-iotdb",
            }, "no 'username' - this may cause MQTT conflicts");
            process.exit(0);
        }

        var machine_id = iot.cfg_get('machine_id');
        if (!machine_id) {
            logger.fatal({
                method: "setup_settings",
                cause: "please run $ iotdb machine-id",
            }, "no 'machine_id' - this may cause MQTT conflicts");
            process.exit(0);
        }

        settingsd.mqttd.prefix = util.format("/u/%s/%s/", username, machine_id);
    };

    var d = iot.cfg_get("homestar/server");
    if (d) {
        _.smart_extend(serverd, d);
    }

    var ipv4 = _.ipv4();
    if (ipv4) {
        settingsd.ip = ipv4;
    }

    if (!settingsd.webserver.host) {
        settingsd.webserver.host = settingsd.ip;
    }
    if (!serverd.webserver.host) {
        serverd.webserver.host = settingsd.ip;
    }

    if (!settingsd.webserver.url) {
        settingsd.webserver.url = util.format("%s://%s:%s", 
            settingsd.webserver.scheme, settingsd.webserver.host, settingsd.webserver.port
        );
    }

    if (!serverd.webserver.url) {
        serverd.webserver.url = util.format("%s://%s:%s", 
            serverd.webserver.scheme, serverd.webserver.host, serverd.webserver.port
        );
    }
}

/**
 *  Serve the home page - dynamically created
 */
var webserver_home = function(request, result) {
    logger.info({
        method: "webserver_home",
        user: request.user,
    }, "called");

    /*
     *  Render
     */
    var home_template = path.join(__dirname, '..', 'client', 'index.html')
    var home_page = swig.renderFile(home_template, {
        cdsd: action.group_actions(),
        settingsd: settingsd,
        user: request.user,
    })

    // console.log(home_page)
    result.set('Content-Type', 'text/html');
    result.send(home_page)
}

/**
 *  Run a particular action. This is always
 *  the result of a PUT
 */
var webserver_action = function(request, result) {
    logger.info({
        method: "webserver_action",
        action_id: request.params.action_id
    }, "called");

    var actiond = action.action_by_id(request.params.action_id)
    if (!actiond) {
        logger.error({
            method: "webserver_action",
            action_id: request.params.action_id
        }, "action not found");

        result.set('Content-Type', 'application/json');
        result.status(404).send(JSON.stringify({
            error: "action not found",
            action_id: request.params.action_id
        }, null, 2))
        return;
    }

    if (actiond._context) {
        logger.error({
            method: "webserver_action",
            action_id: request.params.action_id,
            cause: "user sent the request before a previous version finished",
        }, "action is still running");

        result.set('Content-Type', 'application/json');
        result.status(409).send(JSON.stringify({
            error: "action is still running",
            action_id: request.params.action_id
        }, null, 2))
        return;
    }

    var context = new action.Context(request.params.action_id, actiond);
    context.on("message", function(id, actiond, message) {
        var topic = settingsd.mqttd.prefix + "api/actions/" + id;
        var payload = {
            message: message
        };

        mqtt.publish(settingsd.mqttd, topic, payload);
    });
    context.on("running", function(id, actiond) {
        var topic = settingsd.mqttd.prefix + "api/actions/" + id;
        var payload = {
            running: context.running
        };

        mqtt.publish(settingsd.mqttd, topic, payload);

        if (!context.running) {
            actiond._context = undefined;
        }
    });
    context.run(request.body.value);

    result.set('Content-Type', 'application/json');
    result.send(JSON.stringify({
        running: context.running
    }, null, 2))

    if (context.running) {
        actiond._context = context;
    }
}

exports.app = null;

/**
 *  Set up the web server
 */
var setup_webserver = function() {
    var wsd = settingsd.webserver
    if (wsd.host == null) {
        wsd.host = settingsd.ip
    }

    var app = express();
    exports.app = app;

    app.use(express_body_parser.json()); 
    app.use(express_cookie_parser());
    app.use(express_body_parser());
    app.use(express_session({
        secret: settingsd.webserver.secret,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false
        }
    }))
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/', webserver_home);
    app.use('/', express.static(path.join(__dirname, '..', 'client')));
    app.use('/', express.static(path.join(__dirname, '..', 'client', 'flat-ui')));
    app.put('/api/actions/:action_id', webserver_action);

    app.get('/auth/logout', function(request, response) {
        request.logout();
        response.redirect('/');
    });
    app.get('/auth/homestar', passport.authenticate('twitter'));
    app.get('/auth/homestar/callback', 
        passport.authenticate('twitter', {
            successRedirect: '/',
            failureRedirect: '/login' }
        )
    );

    app.listen(wsd.port);
};

/**
 */
var userd = {};
var setup_passport = function() {
    var iot = iotdb.iot();

    var server_url = serverd.webserver.url;
    var client_url = settingsd.webserver.url;
    passport.use(
        new passport_twitter({
            consumerKey: settingsd.twitter.api_key,
            consumerSecret: settingsd.twitter.api_secret,
            callbackURL: client_url + "/auth/homestar/callback", 
            requestTokenURL: server_url + '/oauth/request_token',
            accessTokenURL: server_url + '/oauth/access_token',
            userAuthorizationURL: server_url + '/oauth/authenticate',
            userProfileURL: server_url + '/oauth/show.json'
        },
        function(token, tokenSecret, profile, done) {
            console.log("HERE:XXX", token, tokenSecret, profile);
            var user = {
                id: profile.id,
                username: profile.username,
                service: "twitter"
            };
            done(null, user);
        })
    );

    passport.serializeUser(function(user, done) {
        console.log("SERIALIZE", user);
        userd[user.id] = user;
        done(null, user.id);
    });

    passport.deserializeUser(function(user_id, done) {
        var user = userd[user_id];
        console.log("DESERIALIZE", user);
        done(null, user);
    });
}

/*
 *  Start IOTDB
 */
var iot = iotdb.iot();
iot.on_thing(function(thing) {
    logger.info({
        thing: thing.thing_id(),
        meta: thing.meta().state(),
    }, "found new thing");
});

/*
 *  Load Actions
 */
action.load_actions();

/**
 *  Setup the web server
 */
setup_settings();
setup_passport();
setup_webserver();

/*
 *  Run the web server
 */
logger.info({
    method: "main",
    url: settingsd.webserver.scheme,
}, "listening for connect");

if (settingsd.open_browser) {
    open(settingsd.webserver.scheme);
}

/*
 *  Run the MQTT server (not working yet)
 */
if (settingsd.mqttd.local) {
    logger.info({
        method: "main",
        paramd: settingsd.mqttd,
    }, "setting up MQTT server");

    if (settingsd.mqttd.host) {
        settingsd.mqttd.host = settingsd.webserver.host;
    }

    mqtt.create_server(settingsd.mqttd);
    mqtt.create_bridge({
        mqtt: {
            host: settingsd.mqttd.host,
            port: settingsd.mqttd.port
        },
        websocket: {
            port: settingsd.mqttd.websocket
        }
    });
}

