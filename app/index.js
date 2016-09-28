/*
 *  index.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-12
 *
 *  Copyright [2013-2016] [David P. Janes]
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
const _ = iotdb._;

// _.logger.silent();

const express = require('express');
const express_session = require('express-session');
const express_cookie_parser = require('cookie-parser');
const express_body_parser = require('body-parser');
const express_session_file_store = require('session-file-store')(express_session);

const swig = require('swig');

const passport = require('passport');
const passport_twitter = require('passport-twitter').Strategy;

const os = require('os');
const open = require('open');
const path = require('path');
const util = require('util');
const fs = require('fs');
const url = require('url');

const settings = require('./settings');
const homestar = require('./homestar');
const things = require('./things');
const interactors = require('./interactors');
const users = require('./users');
const api = require('./api');
const auth = require('./auth');

const logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/app',
});

var _extension_locals;

const _configures = [];

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
const swig_loader = function () {
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


exports.app = null;

const setup_express = function (app) {
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

const _template_things = function () {
    return things.things();
};

const _template_upnp = function () {
    var ds = [];
    const devices = require('iotdb-upnp').devices();
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


const _template_settings = function () {
    var sd = _.d.clone.deep(settings.d);
    delete sd["secrets"];
    delete sd["keys"];

    return sd;
};

const _scrub_url = function (v) {
    if (!v) {
        return v;
    }

    var u = url.parse(v);
    if (_.isEmpty(u.protocol)) {
        return v;
    }

    return u.hostname + u.path.replace(/\/+$/, '');
};

const _format_metadata = function (thingd) {
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
const make_dynamic = function (paramd) {
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
            things: things.things,
            upnp: _template_upnp,
            settings: _template_settings,
            configures: _configures,
            urls: settings.d.urls,
            user: request.user,
            homestar_configured: settings.d.keys.homestar.key && settings.d.keys.homestar.secret && settings.d.homestar.url,
            format_metadata: _format_metadata,
        };
        _.extend(locals, _extension_locals);

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

        customize(request, response, locals, function (error, optional_response) {
            if (_.is.Dictionary(optional_response)) {
                locals.d = optional_response;
            } else if (_.is.String(optional_response)) {
                return response.redirect(optional_response);
            } else if (optional_response) {
                return;
            }

            if (error) {
                response
                    .status(404)
                    .set('Content-Type', "text/plain")
                    .send(error.message ? error.message : error);
                return;
            }

            const page_template = swig_outer.renderFile(paramd.template);
            const page_content = swig.render(page_template, {
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
 *  Installed modules can add pages by declaring "homestar"
 */
var _extension_locals = {};
var _extensions = [];

const setup_extensions = function () {
    /*
     *  Ways you can interact with HomeStar
     */
    _extension_locals.homestar = {
        make_dynamic: make_dynamic,
        settings: settings.d,
        users: {
            owner: iotdb.users.owner,
            update: users.update,
            users: users.users,
            user_by_id: users.user_by_id,
        }
    };

    var modules = iotdb.modules().modules();
    for (var mi in modules) {
        var extension = modules[mi];
        if (!extension.homestar) {
            continue;
        }

        _extensions.push(extension);
    };

    extensions_apply("setup", function(worker, extension_locals) {
        worker(extension_locals);
    });
};

const extensions_apply = function(key, callback) {
    _extensions.map(function(extension) {
        var worker = extension.homestar[key];
        if (!worker) {
            return;
        }

        callback(worker, _extension_locals);
    });
};


const extensions_setup_app = function (app) {
    extensions_apply("setup_app", function(worker, extension_locals) {
        worker(extension_locals, app);
    });
    
    /*
    extensions_apply("dynamic", function(worker, extension_locals) {
        _setup_express_dynamic_folder(app, worker);
    });
    
    extensions_apply("static", function(worker, extension_locals) {
        app.use('/static', express.static(worker));
    });
    */
};

/**
 *  Setup configuration pages
 */
const setup_express_configure = function (app) {
    iotdb.modules().modules()
        .filter(module => module.Bridge)
        .map(module => new module.Bridge())
        .forEach(bridge => {
            const path = "/configure/" + bridge.module_name;

            console.log("HERE:XXX", bridge);

            const subapp = express();

            subapp.engine('html', swig.renderFile);
            subapp.swig = swig;
            subapp.html_root = path;

            if (!bridge.configure(subapp)) {
                return;
            }

            app.use(path, subapp);

            _configures.push({
                name: bridge.module_name,
                path: path,
            });
        });
};

/**
 *  Built-in pages
 */
const setup_express_dynamic = function (app) {
    settings.d.webserver.folders.dynamic
        .map(folder => _.cfg.expand(folder, settings.envd))
        .forEach(folder => _setup_express_dynamic_folder(app, folder));
};

const _setup_express_dynamic_folder = function (app, folder) {
    var _make_redirect = function (path) {
        return function (request, response) {
            return response.redirect("/" + (path ? path : ""));
        };
    };

    var files = fs.readdirSync(folder);
    for (var fi in files) {
        var file = files[fi];
        var match = file.match(/^(.*)[.](js|html)$/);
        if (!match) {
            continue;
        }

        var base = match[1];
        var ext = match[2];
        var template = path.join(folder, file);

        if (file === settings.d.webserver.index) {
            app.get(util.format("/"), make_dynamic({
                template: template,
                mount: base,
                content_type: "text/html",
            }));

            app.get(util.format("/%s", base), _make_redirect());
            app.get(util.format("/%s", file), _make_redirect());
        } else if (ext === "html") {
            app.get(util.format("/%s", base), make_dynamic({
                template: template,
                mount: base,
                content_type: "text/html",
            }));

            app.get(util.format("/%s", file), _make_redirect(base));
        } else if (ext === "js") {
            app.get(util.format("/%s.%s", base, ext), make_dynamic({
                template: template,
                mount: file,
                content_type: "text/plain",
            }));
        }
    }

    // process.exit(0);
};

/**
 */
const setup_express_static = function (app) {
    settings.d.webserver.folders.static
        .map(folder => _.cfg.expand(folder, settings.envd))
        .forEach(folder => {
            app.use('/static', express.static(folder));
        });
};

/**
 *  We use 'twitter' auth but it's actually HomeStar
 *  talking the same protocol
 */
const setup_passport = function () {
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

    if (0) {
        console.log({
            consumerKey: settings.d.keys.homestar.key,
            consumerSecret: settings.d.keys.homestar.secret,
            callbackURL: client_url + "/auth/homestar/callback",
            requestTokenURL: server_url + '/oauth/request_token',
            accessTokenURL: server_url + '/oauth/access_token',
            userAuthorizationURL: server_url + '/oauth/authenticate',
            userProfileURL: server_url + '/api/1.0/profile'
        });
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
                var user_id = profile._json.id;
                var owner_id = settings.d.keys.homestar && settings.d.keys.homestar.owner;
                var user = {
                    id: user_id,
                    is_owner: user_id === owner_id ? true : false,
                    username: profile.username,
                };

                // extend with additional info from the database 
                users.user_by_id({
                    user_id: user.id,
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
        logger.debug({
            user: user,
        }, "passport/serializeUser");

        users.update(user, function () {});
        done(null, user.id);
    });

    passport.deserializeUser(function (user_id, done) {
        logger.debug({
            user_id: user_id,
        }, "passport/deserializeUser");

        users.user_by_id({
            user_id: user_id,
            create: false
        }, (error, user) => {
            if (error) {
                return done(error, null);
            } else if (!user) {
                return done(null, null);
            }

            var owner_id = settings.d.keys.homestar && settings.d.keys.homestar.owner;
            user.is_owner = user.id === owner_id ? true : false;
            user.is_known = (user.groups !== undefined) ? true : false;

            done(null, user);
        });
    });
};

// settings - first
settings.setup(process.argv);
interactors.setup();

// boot - needed before extension
require("./boot").setup();

// Extensions
setup_extensions();

/**
 *  Special Swig renderer
 */
const swig_outer = new swig.Swig({
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

const app = express();
exports.app = app;

setup_express(app);
extensions_setup_app(app);
setup_express_configure(app);
setup_express_dynamic(app);
setup_express_static(app);
api.setup(app);
auth.setup(app, make_dynamic);
// require('./digits').setup(app);

interactors.setup_app(app);
const run = function () {
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

        console.log("===============================");
        console.log("=== Home☆Star Runner Up");
        console.log("=== ");
        console.log("=== Connect at:");
        console.log("=== " + settings.d.webserver.url);
        console.log("===============================");

        extensions_apply("on_ready", function(worker, extension_locals) {
            worker(extension_locals);
        });
    });

    if (wsd.all) {
        app.listen(wsd.port, "0.0.0.0", function () {
            logger.info({
                method: "main",
                url: settings.d.webserver.url,
            }, "listening for connect");
        });
    }

    // other services
    users.setup();
    things.setup(app);
    homestar.setup();

    // iotdb.connect();

    var profiled = {};
    profiled.pid = process.pid;
    profiled.ip = _.net.ipv4();
    profiled.cwd = process.cwd();
    profiled.webserver = {
        scheme: settings.d.webserver.scheme,
        host: settings.d.webserver.host,
        port: settings.d.webserver.port,
    };
    profiled.controller = _.ld.compact(iotdb.controller_meta());

    if (settings.d.profile) {
        fs.writeFileSync(settings.d.profile, JSON.stringify(profiled, null, 2));
    }

    logger.info({
        profile: profiled
    }, "profile");
};


/**
 *  Kill old server
 */
if (settings.d.profile) {
    try {
        var doc = JSON.parse(fs.readFileSync(settings.d.profile));
        if (doc.pid) {
            logger.info({
                pid: doc.pid,
            }, "killing old process");

            process.kill(doc.pid);

            logger.info({}, "running in 8 seconds");

            setTimeout(function () {
                run();
            }, 8 * 1000);
        } else {
            run();
        }
    } catch (x) {
        run();
    }
} else {
    run();
}

/**
 *  API (sigh)
 */
exports.make_dynamic = make_dynamic;
exports.extensions_apply = extensions_apply;
