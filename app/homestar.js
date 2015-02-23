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

var iotdb = require('iotdb');
var _ = iotdb.helpers;
var cfg = iotdb.cfg;

var unirest = require('unirest');

var settings = require('./settings');
var recipe = require('./recipe');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'web',
});

var bearer;
var URL_CONSUMER;
var URL_PROFILE;
var URL_COOKBOOKS;
var URL_THINGS;

/**
 *  Fetch a user's permissions with this consumer
 */
var permissions = function (user, callback) {
    var url = URL_CONSUMER + '/users/' + user.id;
    unirest
        .get(url)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .type('json')
        .end(function (result) {
            if (result.error) {
                logger.error({
                    url: url,
                    error: result.error,
                }, "permissions failed");
                callback("fetch permissions failed", null);
            } else if (result.body) {
                callback(null, result.body);
            } else {
                logger.error({
                    status: result.statusCode,
                    url: url,
                }, "no readable response");
                callback("fetch permissions failed [1]");
            }
        });
};

var _cookbooks_sent = false;
var _cookbooks_timer = null;

/**
 *  Send cookbooks to HomeStar.io
 */
var send_cookbooks = function(retry) {
    var cookbook = {};

    if (_cookbooks_timer && retry > 0) {
        clearTimeout(_cookbooks_timer);
    }

    var sent = true;
    var count = 1;
    var _track_callback = function(error) {
        count--;

        if (error) {
            sent = false;
        }

        if (count !== 0) {
            return;
        }

        _cookbooks_sent = sent;

        /*
        console.log("=======================");
        console.log(_cookbooks_sent, retry);
        console.log("=======================");
        */

        if (_cookbooks_sent) {
            return;
        }
        if (retry <= 0) {
            return;
        }

        _cookbooks_timer = setTimeout(function() {
            _cookbooks_timer = null;
            send_cookbooks(retry);
        }, retry * 1000);
    };

    var rs = recipe.recipes();
    for (var ri in rs) {
        var r = rs[ri];
        if (!r.cookbook_id) {
            continue;
        }

        if (r.cookbook_id != cookbook.cookbook_id) {
            count++;
            send_cookbook(cookbook, _track_callback);

            cookbook = {
                cookbook_id: r.cookbook_id,
                'iot:name': r.group || r.cookbook_id,
            };
        }

        // cookbook.recipes.push(r.name);
    }

    count++;
    send_cookbook(cookbook, _track_callback);

    // this clears out the original "count=1"
    _track_callback(null, null);
};

/**
 *  Send Cookbook info to the server
 */
var send_cookbook = function(cookbook, callback) {
    if (!cookbook.cookbook_id) {
        return callback(null, null);
    }
    if (!callback) {
        callback = function() {};
    }

    var url = URL_COOKBOOKS + '/' + cookbook.cookbook_id;
    unirest
        .put(url)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .json(cookbook)
        .type('json')
        .end(function (result) {
            if (result.error) {
                logger.error({
                    url: url,
                    error: result.error,
                }, "permissions failed");
                callback("send_cookbook() permissions failed", null);
            } else if (result.body) {
                callback(null, result.body);
            } else {
                logger.error({
                    status: result.statusCode,
                    url: url,
                }, "no readable response");
                callback("send_cookbook() permissions failed [1]");
            }
        });
};

/**
 *  Send Thing metadata to the server
 */
var send_thing = function(thing, callback) {
    if (!callback) {
        callback = function() {};
    }

    var url = URL_THINGS + '/' + thing.thing_id();
    unirest
        .put(url)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .json(thing.meta().state())
        .type('json')
        .end(function (result) {
            if (result.error) {
                logger.error({
                    url: url,
                    error: result.error,
                }, "permissions failed");
                callback("send_thing() permissions failed", null);
            } else if (result.body) {
                callback(null, result.body);
            } else {
                logger.error({
                    status: result.statusCode,
                    url: url,
                }, "no readable response");
                callback("send_thing() permissions failed [1]");
            }
        });
};

var send_things = function() {
    var iot = iotdb.iot()
    iot.on("thing", function(thing) {
        send_thing(thing, function(error, metad) {
            if (!metad) {
                return;
            }
            
            metad = _.ld.expand(metad, { scrub: true });
            if (thing.meta().update(metad)) {
                /*
                iotdb.iot().meta_save(thing);
                */
            }
        });
    });
};

/**
 *  Ping the server that I'm alive
 */
var ping = function () {
    unirest
        .put(URL_CONSUMER)
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
            if (result.error) {
                logger.error({
                    url: URL_CONSUMER,
                    error: result.error,
                }, "ping failed");
            } else if (result.body) {
                logger.info({
                    url: URL_CONSUMER,
                }, "pinged");
            } else {
                logger.error({
                    status: result.statusCode,
                    url: URL_CONSUMER,
                }, "ping failed");
            }
        });
};

/*
 *  Fetch owner's profile, as determined by Bearer token
 */
var profile = function () {
    unirest
        .get(URL_PROFILE)
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
            } else {
                logger.error({
                    status: result.statusCode,
                    url: URL_CONSUMER,
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
    URL_CONSUMER = settings.d.homestar.url + '/api/1.0/consumers/' + settings.d.keys.homestar.key;
    URL_PROFILE = settings.d.homestar.url + '/api/1.0/profile';
    URL_COOKBOOKS = settings.d.homestar.url + '/api/1.0/cookbooks';
    URL_THINGS = settings.d.homestar.url + '/api/1.0/things';

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

    /* send recipes */
    send_cookbooks(10);
    send_things();
};

/*
 *  API
 */
exports.setup = setup;
exports.permissions = permissions;
exports.send_cookbook = send_cookbook;
exports.send_cookbooks = send_cookbooks;
exports.send_thing = send_thing;
exports.send_things = send_things;
