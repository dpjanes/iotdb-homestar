/*
 *  app.js
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

const assert = require("assert");
const unirest = require("unirest");


describe("app", function() {
    const base = `http://${ _.net.ipv4() }:11802/`;

    describe("HTML", function() {
        const url = base;

        it("GET works", function(done) {
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
    describe("API /", function() {
        const url = base + "api";

        it("GET works", function(done) {
            unirest
                .get(url)
                .json()
                .end(result => {
                    if (result.error) {
                        done(result.error);
                    } else if (result.status !== 200) {
                        done(new Error("returned status of: " + result.status));
                    } else {
                        assert.ok(result.body["things"])
                        assert.ok(result.body["longpoll"])
                        assert.ok(result.body["@context"])
                        done();
                    }
                });
        });
        it("PUT fails", function(done) {
            unirest
                .put(url)
                .json()
                .end(result => {
                    if (result.status === 404) {
                        done();
                    } else {
                        done(new Error("expected 404 not: " + result.status));
                    }
                });
        });
    });
    describe("API /things", function() {
        const url = base + "api/things";

        it("GET works", function(done) {
            unirest
                .get(url)
                .json()
                .end(result => {
                    if (result.error) {
                        done(result.error);
                    } else if (result.status !== 200) {
                        done(new Error("returned status of: " + result.status));
                    } else {
                        assert.ok(result.body["iot:thing"])
                        done();
                    }
                });
        });
        it("PUT fails", function(done) {
            unirest
                .put(url)
                .json()
                .end(result => {
                    if (result.status === 404) {
                        done();
                    } else {
                        done(new Error("expected 404 not: " + result.status));
                    }
                });
        });
    });
    describe("API /things/(some-thing)", function() {
        let url = null;

        before(function(done) {
            const things_url = base + "api/things";
            unirest
                .get(things_url)
                .json()
                .end(result => {
                    if (result.error) {
                        done(result.error);
                    } else if (result.status !== 200) {
                        done(new Error("returned status of: " + result.status));
                    } else {
                        url = _.net.url.join(things_url, result.body["iot:thing"][0]).replace(/\/\.\//, "/");
                        done();
                    }
                });
        });

        const _should_work = (url, done) => {
            unirest
                .get(url)
                .json()
                .end(result => {
                    if (result.error) {
                        done(result.error);
                    } else if (result.status !== 200) {
                        done(new Error("returned status of: " + result.status));
                    } else {
                        done();
                    }
                });
        }

        const _should_fail = (url, expect, done) => {
            unirest
                .put(url)
                .json()
                .end(result => {
                    if (result.status === expect) {
                        done();
                    } else {
                        done(new Error(`expected ${ expect } not ${ result.status }`));
                    }
                });
        }

        it("GET ./ works", function(done) {
            _should_work(url, done);
        });
        it("PUT ./ fails", function(done) {
            _should_fail(url, 404, done);
        });

        it("GET ./istate works", function(done) {
            _should_work(url + "/istate", done);
        });
        it("PUT ./istate fails", function(done) {
            _should_fail(url + "/istate", 401, done);
        });

        it("GET ./ostate works", function(done) {
            _should_work(url + "/ostate", done);
        });
        it("PUT ./ostate WORKS", function(done) {
            _should_work(url + "/ostate", done);
        });

        it("GET ./meta works", function(done) {
            _should_work(url + "/meta", done);
        });
        it("PUT ./meta WORKS", function(done) {
            _should_work(url + "/meta", done);
        });

        it("GET ./model works", function(done) {
            _should_work(url + "/model", done);
        });
        it("PUT ./model fails", function(done) {
            _should_fail(url + "/model", 401, done);
        });

        it("GET ./connection works", function(done) {
            _should_work(url + "/connection", done);
        });
        it("PUT ./connection fails", function(done) {
            _should_fail(url + "/connection", 401, done);
        });
    });
});
