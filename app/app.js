/*
 *  app.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-12
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
var node_path = require('path');
var util = require('util');
var fs = require('fs');

var mqtt = require('./mqtt');
var recipe = require('./recipe');
var data = require('./data');
var settings = require('./settings');
var homestar = require('./homestar');
var things = require('./things');
var helpers = require('./helpers');
var interactors = require('./interactors');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'web',
});

/*
 *  Filter to make printing JSON easy
 */
swig.setFilter('scrub', function (input) {
    return _.scrub_circular(input);
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

/**
 *  Run a particular recipe. This is always
 *  the eesult of a PUT
 */
var webserver_recipe_update = function (request, response) {
    logger.info({
        method: "webserver_recipe_update",
        recipe_id: request.params.recipe_id
    }, "called");

    var reciped = recipe.recipe_by_id(request.params.recipe_id);
    if (!reciped) {
        logger.error({
            method: "webserver_recipe_update",
            recipe_id: request.params.recipe_id
        }, "recipe not found");

        response.set('Content-Type', 'application/json');
        response.status(404).send(JSON.stringify({
            error: "recipe not found",
            recipe_id: request.params.recipe_id
        }, null, 2));
        return;
    }

    var context = recipe.make_context(reciped);
    if (context.running) {
        logger.error({
            method: "webserver_recipe_update",
            recipe_id: request.params.recipe_id,
            cause: "user sent the request before a previous version finished",
        }, "recipe is still running");

        response.set('Content-Type', 'application/json');
        response.status(409).send(JSON.stringify({
            error: "recipe is still running",
            recipe_id: request.params.recipe_id
        }, null, 2));

        return;
    }

    context.onclick(request.body.value);

    response.set('Content-Type', 'application/json');
    response.send(JSON.stringify({
        running: context.running
    }, null, 2));
};

/**
 *  Set up all the events around connecting events to MQTT
 */
var setup_recipe_mqtt = function() {
    var recipeds = recipe.recipes();
    for (var ri in recipeds) {
        var reciped = recipeds[ri];
        var context = recipe.make_context(reciped);

        context.on("message", function (id, reciped, message) {
            var topic = settings.d.mqttd.prefix + "api/cookbook/" + id;
            var payload = {
                message: message
            };

            mqtt.publish(settings.d.mqttd, topic, payload);
        });
        context.on("state", function (id, state) {
            var topic = settings.d.mqttd.prefix + "api/cookbook/" + id;
            var payload = {
                state: state,
            };

            mqtt.publish(settings.d.mqttd, topic, payload);
        });
        context.on("running", function (id, reciped) {
            var topic = settings.d.mqttd.prefix + "api/cookbook/" + id;
            var payload = {
                running: context.running
            };

            mqtt.publish(settings.d.mqttd, topic, payload);
        });
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

var _template_things = function() {
    return things.things();
};

var _template_upnp = function() {
    var ds = [];
    var devices = iotdb.module('iotdb-upnp').devices();
    for (var di in devices) {
        var device = devices[di];
        var d = {};
        for (var key in device) {
            var value = device[key];
            if (key.match(/^[^_]/) && (_.isNumber(value) || _.isString(value))) {
                d[key] = value;
            }
        }

        ds.push(d);
    }

    ds.sort(function(a, b) {
        if (a.friendlyName < b.friendlyName) {
            return -1;
        } else if (a.friendlyName > b.friendlyName){
            return 1;
        } else {
            return 0;
        }

    });

    return {
        devices: ds
    };
};

var _template_cookbook = function() {
    var rds = [];
    var recipes = recipe.recipes()
    for (var ri in recipes) {
        var rd = _.clone(recipes[ri]);
        rd._context = undefined;
        rd._valued = undefined;
        rd.watch = undefined;

        helpers.assign_group(rd);
        helpers.assign_interactor(rd);

        rds.push(rd);
    }

    return rds;
};

var _template_cookbooks = function() {
    return recipe.cookbooks();
}

var _template_settings = function() {
    var sd = _.smart_extend({}, settings.d);
    delete sd["secrets"];
    delete sd["keys"];

    return sd;
};

/**
 *  Dynamic pages - we decide at runtime
 *  what these are based on our paths
 */
var make_dynamic = function(template, mount, content_type) {
    return function (request, result) {
        logger.info({
            method: "make_dynamic/(page)",
            template: template,
            mount: mount,
            user: request.user,
        }, "called");

        /*
         *  We use two-phase rendering, to bring in
         *  all the interactor data
         *
         *  The outer renderer uses different tags
         *  and data, see the definition of swig_outer
         */
        var home_template = swig_outer.renderFile(template);
        var home_page = swig.render(home_template, {
            filename: template,
            locals: {
                things: _template_things,
                upnp: _template_upnp,
                cookbook: _template_cookbook,
                cookbooks: _template_cookbooks,
                settings: _template_settings,
                user: request.user,
                homestar_configured: settings.d.keys.homestar.key && settings.d.keys.homestar.secret && settings.d.homestar.url,
            },
        });

        result
            .set('Content-Type', 'text/html')
            .send(home_page);
    };
};

var setup_dynamic = function (app) {
    var mapped = {};

    for (var fi in settings.d.webserver.folders.dynamic) {
        var folder = settings.d.webserver.folders.dynamic[fi];
        folder = cfg.cfg_expand(settings.envd, folder)

        var files = fs.readdirSync(folder) 
        for (var fi in files) {
            var file = files[fi];
            var match = file.match(/^(.*)[.](js|html)$/);
            if (!match) {
                continue;
            }

            var base = match[1];
            var ext = match[2];

            if (base === 'index') {
                base = '';
            }

            if (mapped[file] !== undefined) {
                continue;
            }

            var template = node_path.join(folder, file);

            if (ext === "html") {
                app.get(util.format("/%s", base), make_dynamic(template, base, "text/html"));
            } else if (ext === "js") {
                app.get(util.format("/%s.%s", base, ext), make_dynamic(template, file, "text/plain"));
            }
        }
    }
};

var setup_pages = function (app) {
    /* _the_ home page - always dynamic */
    // app.get('/', webserver_home);

    /* static files - before internal dynamic pages */
    for (var fi in settings.d.webserver.folders.static) {
        app.use('/static', 
            express.static(
                cfg.cfg_expand(settings.envd, settings.d.webserver.folders.static[fi])
            )
        );
    }
    // app.use('/', express.static(node_path.join(__dirname, '..', 'client')));
    // app.use('/', express.static(node_path.join(__dirname, '..', 'client', 'flat-ui')));

    /* cookbooks API */
    // app.put('/api/cookbook/:recipe_id', webserver_recipe_update);
    app.get('/api/recipes/:recipe_id/istate', recipe.get_istate);
    app.get('/api/recipes/:recipe_id/ostate', recipe.get_ostate);
    app.put('/api/recipes/:recipe_id/ostate', recipe.put_ostate);
    app.get('/api/recipes/:recipe_id/model', recipe.get_model);

    /* things API */
    app.get('/api/things/:thing_id/istate', things.get_istate);
    app.get('/api/things/:thing_id/ostate', things.get_ostate);
    app.put('/api/things/:thing_id/ostate', things.put_ostate);
    app.get('/api/things/:thing_id/meta', things.get_meta);
    app.get('/api/things/:thing_id/model', things.get_model);

    /* auth related */
    app.get('/auth/cookbooks/:metadata_id', webserver_auth_cookbook);
    app.get('/auth/things/:metadata_id', webserver_auth_thing);

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

    if (!settings.d.keys.homestar.key || !settings.d.keys.homestar.secret || !settings.d.homestar.url) {
        logger.info({
            key: settings.d.keys.homestar.key ? "ok": "missing",
            secret: settings.d.keys.homestar.secret ? "ok": "missing",
            url: settings.d.homestar.url ? "ok": "missing",
        }, "HomeStar.io is not configured");
        return;
    }

    passport.use(
        new passport_twitter({
                consumerKey: settings.d.keys.homestar.key,
                consumerSecret: settings.d.keys.homestar.secret,
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

                // fetch user's permissions
                homestar.permissions(user, function(error, permissions) {
                    user.permissions = permissions;
                    /*
                    console.log("-------------");
                    console.log(profile);
                    console.log(permissions);
                    console.log("-------------");
                     */

                    done(null, user);
                });
            })
    );

    passport.serializeUser(function (user, done) {
        logger.info({
            user: user,
        }, "passport/serialize");

        /* rehash ID just in case */
        var id_hash = _.md5_hash(user.id);
        var user_path = node_path.join(settings.d.folders.users, id_hash + ".json");

        fs.writeFileSync(user_path, JSON.stringify(user, null, 2) + "\n");

        done(null, user.id);
    });

    passport.deserializeUser(function (user_id, done) {
        var id_hash = _.md5_hash(user_id);
        var user_path = node_path.join(settings.d.folders.users, id_hash + ".json");

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
iot.on("thing", function (thing) {
    logger.info({
        thing: thing.thing_id(),
        meta: thing.meta().state(),
    }, "found new thing");
});

/*
 *  Load the Cookbook
 */
recipe.load_recipes();
recipe.init_recipes();

setup_recipe_mqtt();

/**
 *  Settings
 */
settings.setup(process.argv);
interactors.setup();

/**
 *  Special Swig renderer
 */
var swig_outer = new swig.Swig({
    varControls: ['[[{', '}]]'],
    tagControls: ['[[%', '%]]'],
    cmtControls: ['[[#', '#]]'],
    locals: {
        htmld: interactors.htmld,
        interactors: interactors.interactors,
    }
});

/**
 *  Setup the web server
 */

setup_passport();

var app = express();
exports.app = app;

setup_express(app);
setup_dynamic(app);
setup_pages(app);

interactors.setup_app(app);

/*
 *  Run the web server
 */
var wsd = settings.d.webserver;
app.listen(wsd.port, wsd.host, function() {
    logger.info({
        method: "main",
        url: settings.d.webserver.url,
    }, "listening for connect");

    if (settings.d.browser) {
        open(settings.d.webserver.url);
    }
});

/*
 *  Other servers
 */
mqtt.setup();
things.setup();
homestar.setup();
