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
var flat_band = "user";
var owner_user_identity = null;
var owner_userd = null;

var user_by_identity;

/**
 *  What people can do, by group
 */
var permissions = {
    "admin": {
        "things": ["read", "write", "meta"],
        "recipes": ["read", "write", "meta"],
        "users": ["read", "write"],
    },
    "family": {
        "things": ["read", "write", ],
        "recipes": ["read", "write", ],
        "users": [],
    },
    "friend": {
        "things": ["read", ],
        "recipes": ["read", "write", ],
        "users": [],
    },
    "stranger": {
        "things": ["read", ],
        "recipes": ["read", ],
        "users": [],
    },
};

var open = {};

/**
 *  For the given groups and store, return
 *  what actions are allowed
 */
var allowed = function (user, groups, store) {
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
 *  will always be the same one (or null)
 */
var owner = function () {
    return owner_userd;
};

/**
 *  There's a slight window where the data won't be fully filled in
 */
var _setup_owner = function () {
    owner_user_identity = _.d.get(settings.d, "/keys/homestar/owner");
    if (!owner_user_identity) {
        logger.error({
            identity: owner_user_identity,
            cause: "likely you have not get keys from HomeStar.io yet",
        }, "there is no owner defined");
        return;
    }

    owner_userd = {
        identity: owner_user_identity,
        id: _.id.user_urn(owner_user_identity),
        is_owner: true,
        _loading: true,
    };

    user_by_identity(owner_user_identity, function (error, d) {
        if (error) {
            logger.error({
                identity: owner_user_identity,
                error: _.error.message(error),
                cause: "this is highly unexpected",
            }, "could not retrieve user identity?");
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
var _enhance = function (userd) {
    if (!userd) {
        return null;
    }

    if (owner_user_identity && (userd.identity === owner_user_identity)) {
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
 *  One of "things", "recipes" or "users"
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
 *  @param {String} authd.user.identity
 *  If there's a user, there an identity
 *  which is a URL, typically but not necessarily
 *  in the form: https://homestar.io/identity/<xxx>
 *
 *  @param {String} authd.authorize
 *  What the user wants to do. Typically,
 *  "read", "write", "meta"
 *
 *  @param {Function} callback
 *  The second paramater will be "true" if 
 *  it is authorized
 */
var authorize = function (authd, callback) {
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
    console.log("OTHER", "user=", user && user.identity, "groups=", groups, "store=", store, "is_allowed=", is_allowed);
    console.log("-----");
     */

    return callback(null, is_allowed);
};

/**
 *  Retrieve a user record by identity (a URL)
 */
user_by_identity = function (user_identity, paramd, callback) {
    if (callback === undefined) {
        callback = paramd;
        paramd = {};
    }

    paramd = _.defaults(paramd, {
        create: true,
    });

    var user_id = _.id.user_urn(user_identity);
    transporter.get({
        id: user_id,
        band: flat_band,
    }, function (gd) {
        if ((gd.value === null) && paramd.create) {
            gd.value = {
                identity: user_identity,
                created: _.timestamp.make(),
            };

            transporter.update({
                id: user_id,
                band: flat_band,
                value: gd.value
            }, function () {
                callback(null, _enhance(gd.value));
            });
        } else {
            callback(null, _enhance(gd.value));
        }
    });
};

/**
 *  Retrieve a user record by user_id (a hash of the Identity URL)
 */
var user_by_id = function (user_id, callback) {
    transporter.get({
        id: user_id,
        band: flat_band,
    }, function (gd) {
        callback(null, _enhance(gd.value));
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
        band: flat_band,
        value: user,
    }, function (rd) {
        done(rd.error, user);
    });
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
                band: flat_band,
            }, function (gd) {
                if (gd.value) {
                    callback(null, _enhance(gd.value));
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
        prefix: settings.d.folders.users,
        flat_band: flat_band,
    });

    _setup_owner();
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
exports.allowed = allowed;
