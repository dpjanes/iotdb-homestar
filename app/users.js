/*
 *  users.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-04-02
 *
 *  Copyright [2013-2015] [David P. Janes]
 *
 *  Manage users
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

var settings = require('./settings');

var FSTransport = require('iotdb-transport-fs');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/users',
});

var transporter;
var band = "user";
var ownerd = {};

/*
 *  Owner
 */
var owner = function() {
    if (!ownerd.identity) {
        if (settings.d.keys && settings.d.keys.homestar && settings.d.keys.homestar.owner) {
            ownerd = {
                identity: settings.d.keys.homestar.owner,
                is_owner: true,
            };
        }
    }

    if (_.isEmpty(ownerd)) {
        return null;
    } else {
        return ownerd;
    }
};

/**
 */
var authorize = function (authd, callback) {
    var user_identity = null;
    if (authd.user && authd.user.identity) {
        var user_identity = authd.user.identity;
    }

    if (!user_identity) {
        if ((authd.authorize === "write") || (authd.authorize === "meta")) {
            return callback(null, false);
        }
    }

    // console.log("AUTHORIZE", user_identity, authd);

    return callback(null, true);
};

/**
 *  Retrieve a user record by identity (a URL)
 */
var user_by_identity = function (identity, paramd, callback) {
    if (callback === undefined) {
        callback = paramd;
        paramd = {};
    }

    paramd = _.defaults(paramd, {
        create: true,
    });

    var user_id = _.id.user_urn(identity);
    transporter.get({
        id: user_id,
        band: band,
    }, function (gd) {
        if ((gd.value === null) && paramd.create) {
            gd.value = {
                identity: identity
            };
        }

        callback(null, gd.value);
    });
};

/**
 *  Retrieve a user record by user_id (a hash of the Identity URL)
 */
var user_by_id = function (user_id, callback) {
    transporter.get({
        id: user_id,
        band: band,
    }, function (gd) {
        callback(null, gd.value || null);
    });
};

/**
 *  Save a user record
 */
var update = function (user, done) {
    if (!_.isObject(user)) {
        throw new Error("expecting an object");
    }
    if (!user.identity) {
        throw new Error("expecting user.identity");
    }

    var user_id = _.id.user_urn(user.identity);

    transporter.update({
        id: user_id,
        band: band,
        value: user,
    }, done);
};

/**
 *  List all user records
 *
 *  Callback will be called with user records,
 *  and null when all done.
 */
var users = function (callback) {
    var pending = 1;

    var _increment = function () {
        pending++;
    };

    var _decrement = function () {
        if (--pending === 0) {
            callback(null, null);
        }
    };

    transporter.list(function (ld) {
        if (ld.end) {
            _decrement();
        } else if (ld.id) {
            _increment();

            transporter.get({
                id: ld.id,
                band: band,
            }, function (gd) {
                if (gd.value) {
                    callback(null, gd.value);
                }

                _decrement();
            });
        }
    });
};

/**
 *  Users are stored in ".iotdb/users"
 */
var setup = function () {
    transporter = new FSTransport.Transport({
        prefix: ".iotdb/users",
        flat_band: "user",
    });
};

/**
 *  API
 */
exports.setup = setup;
exports.owner = owner;
exports.update = update;
exports.user_by_identity = user_by_identity;
exports.user_by_id = user_by_id;
exports.users = users;
exports.authorize = authorize;
