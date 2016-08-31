/*
 *  start.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-08-31
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

const unirest = require("unirest");

describe("app", function() {
    const base = `http://${ _.net.ipv4() }:11802/`;

    describe("http", function() {
        it("GET works", function(done) {
            const url = base;

            unirest
                .get(url)
                .end(result => {
                    if (result.error) {
                        done(result.error);
                    } else if (result.status !== 200) {
                        done(new Error("returned status of: " + result.status));
                    } else {
                        done();
                    }
                });
        });
        it("PUT fails", function(done) {
            const url = base;

            unirest
                .put(url)
                .json({})
                .end(result => {
                    if (result.status === 404) {
                        done();
                    } else {
                        done(new Error("expected 404 not: " + result.status));
                    }
                });
        });
        it("POST fails", function(done) {
            const url = base;

            unirest
                .post(url)
                .json({})
                .end(result => {
                    if (result.status === 404) {
                        done();
                    } else {
                        done(new Error("expected 404 not: " + result.status));
                    }
                });
        });
    });
});

/*

    unirest
        .put(API_PING)
        .headers({
            'Accept': 'application/json',
            'Authorization': bearer,
        })
        .json({
            'name': settings.d.name,
            'url': settings.d.webserver.url,
            'controller': _.ld.compact(iotdb.controller_meta()),
        })
        .type('json')
        .end(function (result) {

*/
