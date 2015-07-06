/*
 *  RecipeTransport.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-05-13
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
var _ = iotdb._;
var bunyan = iotdb.bunyan;

var path = require('path');

var util = require('util');
var url = require('url');

var recipe = require('./recipe');

var logger = bunyan.createLogger({
    name: "iotdb-homestar",
    module: 'app/RecipeTransport',
});

var MSG_NOT_AUTHORIZED = "not authorized";
var MSG_NOT_FOUND = "not found";
var MSG_NOT_RECIPE = "not a Recipe";
var MSG_NOT_APPROPRIATE = "action not available";
var MSG_TIMESTAMP_ERROR = "try again"

var CODE_NOT_AUTHORIZED = 401;
var CODE_NOT_FOUND = 404;
var CODE_NOT_RECIPE = 403;
var CODE_NOT_APPROPRIATE = 403;
var CODE_TIMESTAMP_ERROR = 409;

/* --- constructor --- */
/**
 *  <p>
 *  See {iotdb.transporter.Transport#Transport} for documentation.
 *
 *  @constructor
 */
var RecipeTransport = function (initd) {
    var self = this;

    self.initd = _.defaults(
        initd,
        iotdb.keystore().get("/transports/RecipeTransport/initd"),
        {
            authorize: function (authd, callback) {
                return callback(null, true);
            },
            user: null,
        }
    );
};

RecipeTransport.prototype = new iotdb.transporter.Transport();

/* --- methods --- */
/**
 *  See {iotdb.transporter.Transport#list} for documentation.
 */
RecipeTransport.prototype.list = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {
            user: self.initd.user,
        };
        callback = arguments[0];
    }

    self._validate_list(paramd, callback);

    var rds = recipe.recipes();
    var count = rds.length;

    var _authorize = function (rd) {
        var r_id = recipe.recipe_to_id(rd);
        var _after_authorize = function (_error, is_authorized) {
            if (count === 0) {
                return;
            }

            if (is_authorized) {
                var callbackd = {
                    id: r_id,
                    user: self.initd.user,
                };
                var r = callback(callbackd);
                if (!r) {
                    count--;
                } else {
                    count = 0;
                }

                if (count === 0) {
                    return callback({
                        end: true,
                    });
                }
            } else {
                count = 0;

                return callback({
                    error: MSG_NOT_AUTHORIZED,
                    status: CODE_NOT_AUTHORIZED,
                    end: true,
                });
            }
        };

        var authd = {
            id: r_id,
            authorize: "read",
            user: paramd.user,
        };
        self.initd.authorize(authd, _after_authorize);
    };

    for (var rdi = 0; rdi < rds.length; rdi++) {
        _authorize(rds[rdi]);
    }
};

/**
 *  See {iotdb.transporter.Transport#added} for documentation.
 */
RecipeTransport.prototype.added = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {
            user: self.initd.user,
        };
        callback = arguments[0];
    }

    self._validate_added(paramd, callback);
};

/**
 *  See {iotdb.transporter.Transport#about} for documentation.
 */
RecipeTransport.prototype.about = function (paramd, callback) {
    var self = this;

    self._validate_about(paramd, callback);

    /*
    var thing = recipe.recipe_by_id(paramd.id);
    if (!thing) {
        return callback({
            id: paramd.id,
        });
    }
    */

    var authd = {
        id: paramd.id,
        authorize: "read",
        user: paramd.user,
    };
    self.initd.authorize(authd, function (error, is_authorized) {
        var callbackd = {
            id: paramd.id,
            user: self.initd.user,
        };
        if (!is_authorized) {
            callbackd.error = MSG_NOT_AUTHORIZED;
            callbackd.status = CODE_NOT_AUTHORIZED;
        } else {
            callbackd.bands = ["istate", "ostate", "model", "meta", "status", ];
        }

        return callback(callbackd);
    });
};

/**
 *  See {iotdb.transporter.Transport#get} for documentation.
 */
RecipeTransport.prototype.get = function (paramd, callback) {
    var self = this;
    var d;

    self._validate_get(paramd, callback);

    var rd = recipe.recipe_by_id(paramd.id);
    if (!rd) {
        return callback({
            id: paramd.id,
            band: paramd.band,
            value: null,
            user: paramd.user,
            error: MSG_NOT_FOUND,
            status: CODE_NOT_FOUND,
        });
    }

    var authd = {
        id: paramd.id,
        authorize: "read",
        band: paramd.band,
        user: paramd.user,
    };
    self.initd.authorize(authd, function (error, is_authorized) {
        if (!is_authorized) {
            var callbackd = {
                id: paramd.id,
                band: paramd.band,
                user: paramd.user,
                value: null,
                error: MSG_NOT_AUTHORIZED,
                status: CODE_NOT_AUTHORIZED,
            };
            return callback(callbackd);
        }

        if (paramd.band === "istate") {
            d = recipe.recipe_istate(rd);
            delete d["@id"];

            return callback({
                id: paramd.id,
                band: paramd.band,
                value: d,
                user: paramd.user,
            });
        } else if (paramd.band === "ostate") {
            d = recipe.recipe_ostate(rd);
            delete d["@value"]; // we're executing
            delete d["@id"];

            return callback({
                id: paramd.id,
                band: paramd.band,
                value: d,
                user: paramd.user,
            });
        } else if (paramd.band === "status") {
            d = recipe.recipe_status(rd);
            delete d["@value"]; // we're executing
            delete d["@id"];

            return callback({
                id: paramd.id,
                band: paramd.band,
                value: d,
                user: paramd.user,
            });
        } else if (paramd.band === "model") {
            d = recipe.recipe_model(rd);
            delete d["@id"];

            return callback({
                id: paramd.id,
                band: paramd.band,
                value: d,
                user: paramd.user,
            });
        } else if (paramd.band === "meta") {
            var context = recipe.make_context(rd);
            d = {
                "@timestamp": context.created_timestamp,
                "schema:name": rd._name,
                "iot:cookbook": rd.group || "",
            };

            return callback({
                id: paramd.id,
                band: paramd.band,
                value: d,
                user: paramd.user,
            });
        } else {
            return callback({
                id: paramd.id,
                band: paramd.band,
                user: paramd.user,
                value: null,
                error: MSG_NOT_FOUND,
                status: CODE_NOT_FOUND,
            });
        }
    });
};

/**
 *  See {iotdb.transporter.Transport#update} for documentation.
 */
RecipeTransport.prototype.update = function (paramd, callback) {
    var self = this;

    if (!callback) {
        callback = function () {};
    }

    self._validate_update(paramd, callback);

    if (!paramd.id.match(/^urn:iotdb:recipe:/)) {
        return callback({
            id: paramd.id,
            error: MSG_NOT_RECIPE,
            status: CODE_NOT_RECIPE,
            user: paramd.user,
        });
    }

    var rd = recipe.recipe_by_id(paramd.id);
    if (!rd) {
        return callback({
            id: paramd.id,
            error: MSG_NOT_FOUND,
            status: CODE_NOT_FOUND,
            user: paramd.user,
        });
    }

    if (paramd.band === "ostate") {
        var authd = {
            id: paramd.id,
            authorize: "write",
            band: paramd.band,
            user: paramd.user,
        };
        self.initd.authorize(authd, function (error, is_authorized) {
            if (!is_authorized) {
                var callbackd = {
                    id: paramd.id,
                    band: paramd.band,
                    user: paramd.user,
                    error: MSG_NOT_AUTHORIZED,
                    status: CODE_NOT_AUTHORIZED,
                };
                return callback(callbackd);
            }

            var context = recipe.make_context(rd);

            var new_timestamp = paramd.value["@timestamp"];
            var old_timestamp = context.execute_timestamp;

            if (!_.timestamp.check.values(old_timestamp, new_timestamp)) {
                var callbackd = {
                    id: paramd.id,
                    band: paramd.band,
                    user: paramd.user,
                    error: MSG_TIMESTAMP_ERROR,
                    status: CODE_TIMESTAMP_ERROR,
                };
                return callback(callbackd);
            }

            context.execute_timestamp = new_timestamp;
            context.onclick(paramd.value.value);

            return callback({
                id: paramd.id,
                band: paramd.band,
                user: paramd.user,
            });
        });
    } else {
        return callback({
            id: paramd.id,
            band: paramd.band,
            error: MSG_NOT_APPROPRIATE,
            status: CODE_NOT_APPROPRIATE,
            user: paramd.user,
        });
    }
};

/**
 *  See {iotdb.transporter.Transport#updated} for documentation.
 */
RecipeTransport.prototype.updated = function (paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {
            user: self.initd.user,
        };
        callback = arguments[0];
    }

    self._validate_updated(paramd, callback);

    var _monitor_band = function (_band) {
        if ((_band === "istate") || (_band === "ostate") || (_band === "meta") || (_band === "status")) {
            var _handle_status = function (context) {
                context.on("status", function () {
                    if (paramd.id && (context.id !== paramd.id)) {
                        return;
                    }

                    var authd = {
                        id: paramd.id,
                        authorize: "read",
                        band: _band,
                        user: paramd.user,
                    };
                    self.initd.authorize(authd, function (error, is_authorized) {
                        if (!is_authorized) {
                            return;
                        }
                        self.get({
                            id: context.id,
                            band: _band,
                            user: paramd.user,
                        }, callback);
                    });
                });
            };

            var recipeds = recipe.recipes();
            for (var ri in recipeds) {
                var reciped = recipeds[ri];
                var context = recipe.make_context(reciped);

                _handle_status(context);
            }
        } else if (_band === "model") {} else {}
    };

    if (paramd.band) {
        _monitor_band(paramd.band);
    } else {
        var bands = ["istate", "ostate", "meta", "model", "status", ];
        for (var bi in bands) {
            _monitor_band(bands[bi]);
        }
    }
};

/**
 *  API
 */
exports.RecipeTransport = RecipeTransport;
