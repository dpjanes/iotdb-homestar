/*
 *  things.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-01-08
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

const path = require('path');
const fs = require('fs');

const interactors = require('./interactors');
const users = require('./users');

const iotdb_transport_express = require('iotdb-transport-express');
const iotdb_transport_iotdb = require('iotdb-transport-iotdb');
const iotdb_transport = require('iotdb-transport');

const errors = require('iotdb-errors');

const logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/things',
});

const _thing_model = function (thing_id, thingd) {
    const modeld = _.d.clone.deep(thingd.model || {});
    
    modeld._id = thing_id;
    modeld._name = thingd.meta["schema:name"];
    modeld["@id"] = `/api/things/${ thing_id }/model`;

    modeld["@context"] = {
        "iot": _.ld.namespace["iot"],
        "iot-unit": _.ld.namespace["iot-unit"],
        "iot-purpose": _.ld.namespace["iot-purpose"],
        "schema": _.ld.namespace["schema"],
    };

    modeld["iot:attribute"] = _.ld.list(modeld, "iot:attribute", [])
        .map(ad => _.d.clone.shallow(ad))
        .map(ad => {
            ad._code = ad["@id"].replace(/^.*#/, '');
            ad._name = _.ld.first(ad, "schema:name");

            if (_.ld.first(ad, 'iot:write', false)) {
                ad._out = true;
            }
            if (_.ld.first(ad, 'iot:read', false)) {
                ad._in = true;
            }

            _.extend(ad, interactors.interactor(ad) || {});

            return ad;
        })

    return modeld;
};

const _thing_band = (thing_id, thingd, band) => _.d.add(thingd[band], "@id", `/api/things/${ thing_id }/${ band }`);

const _thingdd = {};

const _update_band = (ud) => {
    let thingd = _thingdd[ud.id];
    if (!thingd) {
        thingd = {};
        _thingdd[ud.id] = thingd;
    }

    thingd[ud.band] = ud.value;
}

const _update_thing = thingd => {
    _.pairs(thingd)
        .filter(kv => _.is.Dictionary(kv[1]))
        .forEach(kv => {
            _update_band({
                id: thingd.id,
                band: kv[0],
                value: kv[1],
            })
        })
};

const things = () => _.pairs(_thingdd)
    .filter(kv => kv[1].model)
    .filter(kv => kv[1].meta)
    .map(kv => {
        const thing_id = kv[0];
        const thingd = kv[1];
        const thing_name = thingd.meta["schema:name"];

        return {
            "_id": thing_id,
            "_name": thing_name,
            "_sort": thing_name + "@@" + thing_id,
            "_section": "things",
            "model": _thing_model(thing_id, thingd),
            "istate": _thing_band(thing_id, thingd, "istate"),
            "ostate": _thing_band(thing_id, thingd, "ostate"),
            "meta": _thing_band(thing_id, thingd, "meta"),
        };
    })
    .sort((a, b) => _.is.unsorted(a._sort, b._sort));

const setup = function (app) {
    // 99.9% of the time, IOTDB transport
    const iotdb_transporter = iotdb_transport.create("core");
    // iotdb_transporter.all().subscribe(bandd => console.log("+", bandd.id));

    // --- API interface
    // security on top of IOTDB
    const access_transporter = iotdb_transport.access.make({
        check_write: d => {
            return [ "ostate", "meta" ].indexOf(d.band) === -1 ? new errors.NotAuthorized() : null;
        },
    }, iotdb_transporter);

    // must be before express
    const longpoll_transporter = iotdb_transport_express.longpoll.make({
        prefix: _.net.url.join("/", "api", "things"),
    }, access_transporter, app);

    // must be second
    const express_transporter = iotdb_transport_express.make({
        prefix: _.net.url.join("/", "api", "things"),
    }, access_transporter, app);

    // --- Web Interface
    iotdb_transporter.all({})
        .subscribe(thingd => _update_thing(thingd));
    iotdb_transporter.added({})
        .subscribe(ad => {
            iotdb_transporter.one(ad).subscribe(thingd => {
                _update_thing(thingd);
            })
        })
    iotdb_transporter.updated({})
        .subscribe(ud => _update_band(ud));
};

/**
 *  API
 */
exports.setup = setup;
exports.things = things;
