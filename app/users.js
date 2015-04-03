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

var homestar = require('../homestar');

var FSTransport = require('iotdb-transport-fs');

var logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/users',
});

var transporter;
var band = "user";

/**
 *  Retrieve a user record
 */
var get = function(identity, paramd, callback) {
    if (callback === undefined) {
        callback = paramd;
        paramd = {};
    }

    paramd = _.defaults(paramd, {
        create: true,
    });

    var identity_hash = _hash_identity(identity);
    transporter.get(identity_hash, band, function(_id, _band, d) {
        if ((d === null) && paramd.create) {
            d = {
                identity: identity
            };
        }

        callback(d);
    });
};

/**
 *  Save a user record
 */
var update = function(userd) {
    if (!_.isObject(userd)) {
        throw new Error("expecting an object");
    }
    if (!userd.identity) {
        throw new Error("expecting userd.identity");
    }

    var identity_hash = _hash_identity(userd.identity);

    transporter.update(identity_hash, band, userd);
};

/**
 *  Users are stored in ".iotdb/users"
 */
var setup = function() {
    transporter = new FSTransport.Transport({
        prefix: ".iotdb/users",
        channel: FSTransport.flat_channel,
        unchannel: FSTransport.flat_unchannel,
    });
};

/**
 *  Maybe this should be formally defined?
 */
var _hash_identity = function(identity) {
    return "urn:iotdb:identity:md5:" + _.md5_hash(identity);
}

/**
 *  API
 */
exports.setup = setup;
exports.update = update;
exports.get = get;
