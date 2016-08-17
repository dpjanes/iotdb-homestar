/*
 *  api.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-06-21
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

const iotdb = require('iotdb');
const _ = iotdb._;

const settings = require('./settings');

const logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/api',
});

/**
 */
const setup = function (app) {
    app.get('/api/', (request, response) => {
        const d = _.d.compose.shallow(
            {
                "iot:controller.runner": settings.d.keys.homestar.key,
            },
            iotdb.controller_meta(),
            {
                "@context": "https://iotdb.org/pub/iot",
                "@id": "/api",
                "@timestamp": _.timestamp.make(),
                "things": "/api/things",
                "longpoll": "/api/things/.longpoll",
            }
        );

        return response
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(d, null, 2));
    });
};

/**
 *  API
 */
exports.setup = setup;
