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
var path = require('path');
var util = require('util');
var fs = require('fs');
var url = require('url');

var mqtt = require('./mqtt');
var recipe = require('./recipe');
var settings = require('./settings');
var homestar = require('./homestar');
var transport = require('./transport');
var things = require('./things');
var helpers = require('./helpers');
var interactors = require('./interactors');
var users = require('./users');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/app',
});

var _modules_locals;
var _setup_express_dynamic_folder;
var swig_outer;

/*
 *  Filter to make printing JSON easy
 */
swig.setFilter('scrub', function (input) {
    return _.scrub_circular(input);
});

/*
 *  Custom loader
 *  Base on https://raw.githubusercontent.com/paularmstrong/swig/v1.4.2/lib/loaders/filesystem.js
 */
var swig_loader = function () {
    var encoding = 'utf8';
    var basepath = path.join(__dirname, "..", "dynamic");
    var loader = {
        resolve: function (to, from) {
            if (to.match(/^\//)) {
                return to;
            }

            if (from) {
                var candidate = path.join(path.dirname(from), to);
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
            }

            if (basepath) {
                from = basepath;
            } else {
                from = (from) ? path.dirname(from) : process.cwd();
            }
            return path.resolve(from, to);
        },

        load: function (identifier, cb) {
            if (!fs || (cb && !fs.readFile) || !fs.readFileSync) {
                throw new Error('Unable to find file ' + identifier + ' because there is no filesystem to read from.');
            }

            identifier = loader.resolve(identifier);

            if (cb) {
                fs.readFile(identifier, encoding, cb);
                return;
            }
            return fs.readFileSync(identifier, encoding);
        },
    };

    return loader;
};

swig.setDefaults({
    loader: swig_loader(path.join(__dirname, "..", "dynamic")),
    cache: false,
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
 *  Set up all the events around connecting events to MQTT
 */
var setup_recipe_mqtt = function () {
    var _handle_status = function (context) {
        context.on("status", function () {
            var topic = settings.d.mqttd.prefix + "api/recipes/" + context.id + "/status";
            mqtt.publish(settings.d.mqttd, topic, context.status);
        });
    };

    var recipeds = recipe.recipes();
    for (var ri in recipeds) {
        var reciped = recipeds[ri];
        var context = recipe.make_context(reciped);

        _handle_status(context);
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

var _template_things = function () {
    return things.things();
};

var _template_upnp = function () {
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

    ds.sort(function (a, b) {
        if (a.friendlyName < b.friendlyName) {
            return -1;
        } else if (a.friendlyName > b.friendlyName) {
            return 1;
        } else {
            return 0;
        }

    });

    return {
        devices: ds
    };
};

var _template_cookbook = function () {
    var _assign_group = function (rd) {
        if (rd._thing_group) {
            rd._group = rd._thing_group;
        } else if (rd._thing_name) {
            rd._group = rd._thing_name;
        } else if (rd.group) {
            rd._group = rd.group;
        } else {
            rd._group = "Ungrouped";
        }
    };

    var rds = [];
    var recipes = recipe.recipes();
    for (var ri in recipes) {
        var rd = _.clone(recipes[ri]);
        rd._context = undefined;
        rd._valued = undefined;
        rd.watch = undefined;

        _assign_group(rd);
        interactors.assign_interactor_to_attribute(rd);

        rds.push(rd);
    }

    return rds;
};

var _template_cookbooks = function () {
    return recipe.cookbooks();
};

var _template_settings = function () {
    var sd = _.smart_extend({}, settings.d);
    delete sd["secrets"];
    delete sd["keys"];

    return sd;
};

var _scrub_url = function(v) {
    if (!v) {
        return v;
    }

    var u = url.parse(v);
    if (_.isEmpty(u.protocol)) {
        return v;
    }

    return u.hostname + u.path.replace(/\/+$/, '');
};

var _format_metadata = function(thingd) {
    var metad = thingd.meta;
    var lines = [];
    var v;
    var vi;
    var vs;

    /*
    v = _.ld.first(metad, "iot:thing");
    if (v) {
        lines.push("id: " + v);
    }
     */

    vs = _.ld.list(metad, "iot:zone", []);
    if (vs.length > 1) {
        lines.push("<b>zones</b>: " + vs.join(","));
    } else if (vs.length === 1) {
        lines.push("<b>zone</b>: " + vs.join(","));
    } else {
        lines.push("<b>zones</b>: <i>none asssigned</i>");
    }

    vs = _.ld.list(metad, "iot:facet", []);
    for (vi in vs) {
        vs[vi] = vs[vi].replace(/^.*:/, '');
    }
    if (vs.length > 1) {
        lines.push("<b>facets</b>: " + vs.join(","));
    } else if (vs.length === 1) {
        lines.push("<b>facets</b>: " + vs.join(","));
    } else {
        lines.push("<b>facets</b>: <i>none asssigned</i>");
    }

    v = _.ld.first(metad, "schema:manufacturer");
    if (v) {
        lines.push("<b>manufacturer</b>: " + _scrub_url(v));
    }

    v = _.ld.first(metad, "schema:model");
    if (v) {
        lines.push("<b>model</b>: " + _scrub_url(v));
    }

    return lines.join("<br>");

    /*
{
  "iot:thing": "urn:iotdb:thing:Chromecast:1e1951d1-4b2e-e5fa-ec1b-d66cb2f84e97",
  "schema:name": "Basement Chromecast",
  "schema:manufacturer": "Google Inc.",
  "schema:model": "Eureka Dongle",
  "iot:facet": [
    "iot-facet:media"
  ],
  "@timestamp": "2015-05-04T20:46:04.535Z",
  "iot:zone": [
    "Basement"
  ]
}
    */
};

/**
 *  Dynamic pages - we decide at runtime
 *  what these are based on our paths
 */
var make_dynamic = function (paramd) {
    return function (request, response) {
        paramd = _.defaults(paramd, {
            mount: null,
            content_type: "text/html",
            require_login: settings.d.webserver.require_login ? true : false,
        });

        logger.info({
            method: "make_dynamic/(page)",
            template: paramd.template,
            mount: paramd.mount,
            user: request.user,
        }, "called");

        /*
         *  This is 'require_login' is true, 
         *  and the user isn't logged in, we redirect
         *  to the login page. If that's not specified
         *  basically we don't allow access to the
         *  server.
         *
         *  Typically homestar-access will force these values.
         */
        if (paramd.require_login && !request.user) {
            var url = settings.d.urls.login;
            if (!url) {
                return response
                    .status(403)
                    .set('Content-Type', 'text/plain')
                    .send("this page requires login, but no login URL set - maybe 'homestar install homestar-access'?");
            } else {
                return response.redirect(url);
            }
        }

        /*
         *  We use two-phase rendering, to bring in
         *  all the interactor data
         *
         *  The outer renderer uses different tags
         *  and data, see the definition of swig_outer
         */
        var locals = {
            things: _template_things,
            upnp: _template_upnp,
            cookbook: _template_cookbook,
            cookbooks: _template_cookbooks,
            settings: _template_settings,
            configures: _configures,
            urls: settings.d.urls,
            user: request.user,
            homestar_configured: settings.d.keys.homestar.key && settings.d.keys.homestar.secret && settings.d.homestar.url,
            format_metadata: _format_metadata,
        };
        _.extend(locals, _modules_locals);

        if (paramd.locals) {
            _.extend(locals, paramd.locals);
        }
        if (paramd.status) {
            locals.status = paramd.status;
        }

        var customize = paramd.customize;
        if (!customize) {
            customize = function (request, response, locals, done) {
                done(null);
            };
        }

        customize(request, response, locals, function (error, _rendered) {
            if (_rendered) {
                if (_.is.String(_rendered)) {
                    response.redirect(_rendered);
                }

                return;
            }

            if (error) {
                response
                    .status(404)
                    .set('Content-Type', "text/plain")
                    .send(error.message ? error.message : error);
                return;
            }

            var page_template = swig_outer.renderFile(paramd.template);
            var page_content = swig.render(page_template, {
                filename: paramd.template,
                locals: locals,
            });

            if (paramd.status) {
                response.status(paramd.status);
            }

            response
                .set('Content-Type', paramd.content_type)
                .send(page_content);
        });
    };
};

/**
 *  Installed modules can add pages by declaring "web"
 */
var _modules_locals = {};

var setup_express_modules = function (app) {
    var modules = iotdb.modules().modules();
    for (var mi in modules) {
        var module = modules[mi];
        if (!module.web) {
            continue;
        }

        /*
         *  This is the most general way of using a plug-in
         *  extension. The function 'setup' is called with
         *  two arguments: the app, and a dictionary
         *  of useful functions. We are picking exactly
         *  what we want to send to the plugin to
         *  "future-proof" ourselves from maintaining
         *  code we don't want to.
         */
        if (module.web.setup) {
            module.web.setup(app, {
                make_dynamic: make_dynamic,
                settings: settings.d,
                users: {
                    update: users.update,
                    users: users.users,
                    user_by_id: users.user_by_id,
                },
                things: {
                    thing_by_id: things.thing_by_id,
                },
                recipes: {
                    recipe_by_id: recipe.recipe_by_id,
                },
                data: {
                    facets: function() {
                        return [
                            "iot-facet:appliance",
                            "iot-facet:climate",
                            "iot-facet:climate.cooling",
                            "iot-facet:climate.heating",
                            "iot-facet:control",
                            "iot-facet:control.dial",
                            "iot-facet:control.dimmer",
                            "iot-facet:control.keyboard",
                            "iot-facet:control.keypad",
                            "iot-facet:control.mouse",
                            "iot-facet:control.switch",
                            "iot-facet:control.touchpad",
                            "iot-facet:gateway",
                            "iot-facet:lighting",
                            "iot-facet:media",
                            "iot-facet:security",
                            "iot-facet:sensor",
                            "iot-facet:sensor.chemical",
                            "iot-facet:sensor.chemical.carbon-dioxide",
                            "iot-facet:sensor.chemical.carbon-monoxide",
                            "iot-facet:sensor.fire",
                            "iot-facet:sensor.heat",
                            "iot-facet:sensor.humidity",
                            "iot-facet:sensor.humidty",
                            "iot-facet:sensor.motion",
                            "iot-facet:sensor.particulates",
                            "iot-facet:sensor.presence",
                            "iot-facet:sensor.shatter",
                            "iot-facet:sensor.sound",
                            "iot-facet:sensor.spatial",
                            "iot-facet:sensor.temperature",
                            "iot-facet:sensor.water",
                            "iot-facet:toy",
                            "iot-facet:wearable",
                        ];
                    },
                    zones: function() {
                        return [
                            "Kitchen", "Living Room", "Basement", "Master Bedroom", "Bedroom", "Den",
                            "Main Floor", "Second Floor",
                            "Front Garden", "Back Garden",
                        ];
                    },
                    groups: function() {
                        return [
                            "Everyone",
                            "Friends",
                            "Family",
                        ];
                    },
                    default_access_read: function() {
                        return [ "Everyone", ];
                    },
                    default_access_write: function() {
                        return [ "Friends", ];
                    },
                    default_groups: function() {
                        return [ "Everyone", ];
                    },
                },
            });
        }

        /* autogenerated dynamic files -- should be a folder */
        if (module.web.dynamic) {
            _setup_express_dynamic_folder(app, module.web.dynamic);
        }

        /* autogenerated static files -- should be a folder */
        if (module.web.static) {
            app.use('/static', express.static(module.web.static));
        }

        /* local variables - NOTE: shared to _all pages_ */
        if (module.web.locals) {
            _.extend(_modules_locals, module.web.locals);
        }
    }
};

/**
 *  Setup configuration pages
 */
var _configures = [];

var setup_express_configure = function (app) {
    var modules = iotdb.modules().modules();
    for (var mi in modules) {
        var module = modules[mi];
        if (!module.Bridge) {
            continue;
        }

        var bridge = new module.Bridge();

        var name = bridge.name();
        var path = "/configure/" + _.id.to_dash_case(name);

        var subapp = express();

        subapp.engine('html', swig.renderFile);
        subapp.swig = swig;
        subapp.html_root = path;

        if (!bridge.configure(subapp)) {
            continue;
        }

        app.use(path, subapp);
    
        _configures.push({
            name: name,
            path: path,
        });
    }
}

/**
 *  Built-in pages
 */
var setup_express_dynamic = function (app) {
    for (var fi in settings.d.webserver.folders.dynamic) {
        var folder = settings.d.webserver.folders.dynamic[fi];
        folder = cfg.cfg_expand(settings.envd, folder);

        _setup_express_dynamic_folder(app, folder);
    }
};

var _setup_express_dynamic_folder = function (app, folder) {
    var files = fs.readdirSync(folder);
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

        var template = path.join(folder, file);

        if (ext === "html") {
            app.get(util.format("/%s", base), make_dynamic({
                template: template,
                mount: base,
                content_type: "text/html",
            }));
        } else if (ext === "js") {
            app.get(util.format("/%s.%s", base, ext), make_dynamic({
                template: template,
                mount: file,
                content_type: "text/plain",
            }));
        }
    }
};

/**
 */
var get_api = function (request, response) {
    var d = {
        "@message": "JSON-LD/Hydra Framing Wanted",
        "@id": "/api",
        /*
        "@context": {
            "@vocab": "/api#",
            "@base": "/api",
            "things": {
                "@type": "@id"
            },
            "coobooks": {
                "@type": "@id"
            },
        },
        */
        "things": "/api/things",
        "recipes": "/api/recipes",
    };

    response
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(d, null, 2));
};

/**
 */
var setup_express_static = function (app) {
    for (var fi in settings.d.webserver.folders.static) {
        var folder = settings.d.webserver.folders.static[fi];
        var expanded = cfg.cfg_expand(settings.envd, folder);

        app.use('/static', express.static(expanded));
    }
};

/**
 */
var setup_express_api = function (app) {
    app.get('/api/', get_api);

    app.get('/api/recipes', recipe.get_recipes);
    app.get('/api/recipes/:recipe_id', recipe.get_recipe);
    app.get('/api/recipes/:recipe_id/istate', recipe.get_istate);
    app.get('/api/recipes/:recipe_id/ostate', recipe.get_ostate);
    app.put('/api/recipes/:recipe_id/ostate', recipe.put_ostate);
    app.get('/api/recipes/:recipe_id/model', recipe.get_model);
    app.get('/api/recipes/:recipe_id/status', recipe.get_status);
};

/**
 */
var setup_express_auth = function (app) {
    app.get('/auth/cookbooks/:metadata_id', webserver_auth_cookbook);
    app.get('/auth/things/:metadata_id', webserver_auth_thing);

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
            key: settings.d.keys.homestar.key ? "ok" : "missing",
            secret: settings.d.keys.homestar.secret ? "ok" : "missing",
            url: settings.d.homestar.url ? "ok" : "missing",
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
                var user_identity = profile._json.identity;
                var owner_identity = settings.d.keys.homestar && settings.d.keys.homestar.owner;
                var user = {
                    identity: user_identity,
                    is_owner: user_identity === owner_identity ? true : false,
                    id: _.id.user_urn(user_identity),
                    username: profile.username,
                };

                /* extend with additional info from the database */
                users.user_by_identity(user.identity, {
                    create: true
                }, function (error, userd) {
                    if (error) {
                        return done(error);
                    }

                    if (userd.groups !== undefined) {
                        user.groups = userd.groups;
                        user.is_known = true;
                    } else {
                        user.is_known = false;
                    }

                    done(null, user);
                });
            })
    );

    passport.serializeUser(function (user, done) {
        logger.info({
            user: user,
        }, "passport/serializeUser");

        users.update(user);
        done(null, user.identity);
    });

    passport.deserializeUser(function (user_identity, done) {
        logger.info({
            user_identity: user_identity,
        }, "passport/deserializeUser");

        users.user_by_identity(user_identity, {
            create: false
        }, function (error, user) {
            if (error) {
                return done(error, null);
            } else if (!user) {
                return done(null, null);
            }

            var owner_identity = settings.d.keys.homestar && settings.d.keys.homestar.owner;
            user.is_owner = user.identity === owner_identity ? true : false;
            user.is_known = (user.groups !== undefined) ? true : false;

            done(null, user);
        });
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
setup_express_modules(app);
setup_express_configure(app);
setup_express_dynamic(app);
setup_express_static(app);
setup_express_api(app);
setup_express_auth(app);

interactors.setup_app(app);

/*
 *  Run the web server
 */
var wsd = settings.d.webserver;
app.listen(wsd.port, wsd.host, function () {
    logger.info({
        method: "main",
        url: settings.d.webserver.url,
    }, "listening for connect");

    if (settings.d.browser) {
        open(settings.d.webserver.url);
    }
});

/*
 *  Other services
 */
mqtt.setup();
users.setup();
things.setup(app);
homestar.setup();
transport.setup();
