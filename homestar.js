/*
 *  homestar.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-04-24
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

/*
 *  This returns a locals like the one used in HomeStar,
 *  for when we want to use HomeStar extensions without HomeStar.
 *
 *  Ideally this would be reconciled
 *
 *  This is by no means complete
 */
var locals = function() {
    var settings = require("./app/settings");
    settings.setup();

    var users = require("./app/users");
    var things = require("./app/things");

    var locals = {
        homestar: {
            things: {
                thing_by_id: things.thing_by_id,
                make_transporter: things.make_iotdb_transporter,
            },

            users: {
                owner: iotdb.users.owner,
                update: users.update,
                users: users.users,
                user_by_id: users.user_by_id,
            },

            settings: settings.d,
        },
    };

    return locals;
};


/**
 *  API
 */
exports.locals = locals;
