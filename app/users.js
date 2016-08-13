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

const iotdb = require('iotdb');
const _ = iotdb._;

const assert = require("assert");
const settings = require('./settings');

const fs_transport = require('iotdb-transport-fs');
const errors = require('iotdb-errors');

const logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/users',
});

var transporter;
var flat_band = "user";
var owner_id = null;
var owner_userd = null;

const user_by_id = (paramd, done) => {
    assert(_.is.Dictionary(paramd));
    assert(_.is.String(paramd.user_id));

    paramd = _.defaults(paramd, {
        create: true,
    });

    transporter.get({
        id: paramd.user_id,
        band: flat_band,
        silent: false,
    })
        .subscribe(
            gd => {
                return done(null, _enhance(gd.value));
            },
            error => {
                if (!(error instanceof errors.NotFound)) {
                    return done(error);
                }

                if (!paramd.create) {
                    return done(null, null);
                }

                transporter
                    .put({
                        id: paramd.user_id,
                        band: flat_band,
                        value: gd.value
                    })
                    .subscribe(
                        pd => done(null, _enhance(pd.value)),
                        error => done(error)
                    );
            }
        );
};


/**
 *  What people can do, by group
 */
const permissions = {
    "admin": {
        "things": ["read", "write", "meta"],
        "users": ["read", "write"],
    },
    "family": {
        "things": ["read", "write", ],
        "users": [],
    },
    "friend": {
        "things": ["read", ],
        "users": [],
    },
    "stranger": {
        "things": ["read", ],
        "users": [],
    },
};

const open = {};

/**
 *  For the given groups and store, return
 *  what actions are allowed
 */
const allowed = function (user, groups, store) {
    if (store === undefined) {
        throw new Error("store must have a value");
    }

    // require login
    if (!user) {
        var is_access_login = _.d.get(settings.d, "/access/login");
        if (is_access_login) {
            return [];
        }
    }

    // anyone can use it, even if not logged in (excepting above)
    var is_access_open = _.d.get(settings.d, "/access/open");
    if (is_access_open) {
        groups = ["admin"];
    }

    if (!groups) {
        groups = [];
    }

    var all_allows = [];
    groups.map(function (group) {
        var psd = permissions[group];
        if (!psd) {
            return;
        }

        var allows = psd[store];
        if (allows) {
            allows.map(function (allow) {
                if (all_allows.indexOf(allow) === -1) {
                    all_allows.push(allow);
                }
            });
        }
    });

    return all_allows;
};

/*
 *  This returns a user record for the owner. This record
 *  will always be the same one (or null).
 *
 *  Note that this is just exported directly into
 *  "iotdb.users.owner" so that anyone can access it
 */
const owner = function () {
    return owner_userd;
};

/**
 *  There's a slight window where the data won't be fully filled in
 */
const _setup_owner = function () {
    owner_id = _.d.get(settings.d, "/keys/homestar/owner");
    if (!owner_id) {
        logger.error({
            id: owner_id,
            cause: "likely you have not get keys from HomeStar.io yet",
        }, "there is no owner defined");
        return;
    }

    owner_userd = {
        id: owner_id,
        is_owner: true,
        _loading: true,
    };

    user_by_id({
        user_id: owner_id,
        create: false,
    }, function (error, d) {
        if (error) {
            logger.error({
                id: owner_id,
                error: _.error.message(error),
                cause: "this is highly unexpected",
            }, "could not retrieve user?");
            return;
        }

        _.extend(owner_userd, d);
        owner_userd.is_owner = true;

        delete owner_userd._loading;
    });
};

/**
 *  Adds details to the user
 */
const _enhance = function (userd) {
    if (!userd) {
        return null;
    }

    if (owner_id && (userd.id === owner_id)) {
        userd.is_owner = true;
    } else {
        userd.is_owner = false;
    }

    if (userd.is_owner) {
        _.ld.add(userd, "groups", "admin");
    } else if (!userd.groups) {
        userd.groups = "stranger";
    }

    return userd;
};

/**
 *  This is called authorize actions against IDs
 *
 *  @param {String} authd.store
 *  One of "things", or "users"
 *
 *  @param {String} authd.id
 *  The ID of something to be authorzed
 *
 *  @param {String|undefined} authd.band
 *  optional band
 *
 *  @param {Dictionary|undefiend} authd.user
 *  This can be undefined if there's no 
 *  user that has be authenticated
 *
 *  @param {String} authd.user.id
 *
 *  @param {String} authd.authorize
 *  What the user wants to do. Typically,
 *  "read", "write", "meta"
 *
 *  @param {Function} callback
 *  The second paramater will be "true" if 
 *  it is authorized
 */
const authorize = function (authd, callback) {
    var user = _enhance(authd.user);
    var groups = user ? _.ld.list(user, "groups") : [];
    var store = authd.store;

    var allows = allowed(user, groups, store);
    var is_allowed = allows.indexOf(authd.authorize) !== -1;

    /*
    console.log("-----");
    console.log("USER", user);
    console.log("ALLOWS", allows);
    console.log("AUTHORIZE", authd.authorize);
    console.log("OTHER", "user=", user && user.id, "groups=", groups, "store=", store, "is_allowed=", is_allowed);
    console.log("-----");
    */


    return callback(null, is_allowed);
};

/**
 *  Save a user record
 */
const update = function (user, done) {
    if (!_.isObject(user)) {
        throw new Error("expecting an object");
    }
    if (!user.id) {
        throw new Error("expecting user.id");
    }

    transporter.put({
        id: user.id,
        band: flat_band,
        value: user,
    })
        .subscribe(
            pd => done(null, pd),
            erorr => done(error)
        );
};

/**
 *  List all user records
 *
 *  Callback will be called with user records,
 *  and null when all done.
 */
const users = function (callback) {
    transporter
        .list({})
        .subscribe(
            ld => callback(null, _enhance(ld.value)),
            error => callback(error),
            () => callback(null, null)
        );
};

/**
 *  Users are stored in ".iotdb/users"
 */
const setup = function () {
    transporter = fs_transport.make({
        prefix: settings.d.folders.users,
        flat_band: flat_band,
    });

    _setup_owner();
};

/**
 *  API
 */
iotdb.users.owner = owner;
iotdb.users.authorize = authorize;

exports.setup = setup;
exports.update = update;
exports.user_by_id = user_by_id;
exports.users = users;
exports.allowed = allowed;
