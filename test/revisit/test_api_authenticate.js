/*
 *  test_api_authenticate.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-07-02
 *
 *  Test the authentication API
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

var jwt = require('jsonwebtoken');
assert = require('assert')
unirest = require('unirest')
iotdb = require('iotdb')
_ = iotdb._;

var url_runner_authenticate = "http://" + _.ipv4() + ":11802/api/authenticate";
var url_homestar_validate_consumer = "http://" + _.ipv4() + ":3001/api/1.0/consumers/:consumer_id/validate-consumer-signature";
var url_homestar_validate_user = "http://" + _.ipv4() + ":3001/api/1.0/consumers/:consumer_id/validate-user-token";

var goodd = {
    user_identity: "https://homestar.io/identities/54ac085956bdb35426b2e6d7",
};

var bad1d = {
};

var bad2d = {
    user_identity: "@dpjanes",
};

describe('test /api/authenticate', function(){
    it('test GET - expect fail', function(done) {
        unirest.get(url_runner_authenticate)
            .type('json')
            .json(goodd)
            .end(function (result) {
                assert.strictEqual(result.status, 404);
                done();
            });
    });
    it('test PUT with no payload - expect fail', function(done) {
        unirest.put(url_runner_authenticate)
            .type('json')
            .json(bad1d)
            .end(function (result) {
                assert.strictEqual(result.status, 400);
                done();
            });
    });
    it('test PUT with malformed payload - expect fail', function(done) {
        unirest.put(url_runner_authenticate)
            .type('json')
            .json(bad2d)
            .end(function (result) {
                assert.strictEqual(result.status, 400);
                done();
            });
    });
    it('test PUT with good payload - expect success', function(done) {
        unirest.put(url_runner_authenticate)
            .type('json')
            .json(goodd)
            .end(function (result) {
                assert.strictEqual(result.body.user_identity, goodd.user_identity);
                assert.ok(result.body.consumer_id);
                assert.ok(result.body.consumer_signature);

                var payload = jwt.decode(result.body.consumer_signature);
                assert.strictEqual(result.body.user_identity, payload.user_identity);
                assert.strictEqual(result.body.consumer_id, payload.consumer_id);

                done();
            });
    });
});

/*
 *  1. get the Consumer Signature
 *  2. convert it into a User Token
 */
describe('test homestar:/api/1.0/consumers/:consumer_id/validate-consumer-signature', function(){
    it('PUT and re-PUT', function(done) {
        unirest.put(url_runner_authenticate)
            .type('json')
            .json(goodd)
            .end(function (result) {
                var requestd = {
                    consumer_signature: result.body.consumer_signature,
                };

                var validate_consumer_url = url_homestar_validate_consumer.replace(/:consumer_id/, result.body.consumer_id);
                unirest.put(validate_consumer_url)
                    .type('json')
                    .json(requestd)
                    .headers({
                        "X-User-Identity": result.body.user_identity,
                    })
                    .end(function (result) {
                        if (result.error) {
                            assert.ok(false)
                        } else if (result.status !== 200) {
                            assert.ok(false)
                        } else if (!result.body.user_token) {
                            assert.ok(false)
                        } else {
                            done();
                        }
                    });
            });
    });
});

/*
 *  1. get the Consumer Signature
 *  2. convert it into a User Token
 *  3. verify User Token
 */
describe('test homestar:/api/1.0/consumers/:consumer_id/validate-user-token', function(){
    it('PUT and re-PUT', function(done) {
        unirest.put(url_runner_authenticate)
            .type('json')
            .json(goodd)
            .end(function (result) {
                var requestd = {
                    consumer_signature: result.body.consumer_signature,
                };

                var consumer_id = result.body.consumer_id;
                var user_identity = result.body.user_identity;

                var validate_consumer_url = url_homestar_validate_consumer.replace(/:consumer_id/, consumer_id);
                unirest.put(validate_consumer_url)
                    .type('json')
                    .json(requestd)
                    .headers({
                        "X-User-Identity": user_identity,
                    })
                    .end(function (result) {
                        if (result.error) {
                            assert.ok(false)
                        } else if (result.status !== 200) {
                            assert.ok(false)
                        } else if (!result.body.user_token) {
                            assert.ok(false)
                        }

                        var requestd = {
                            user_token: result.body.user_token,
                        };

                        var validate_user_url = url_homestar_validate_user.replace(/:consumer_id/, consumer_id);
                        unirest.put(validate_user_url)
                            .type('json')
                            .json(requestd)
                            .headers({
                                "X-User-Identity": user_identity,
                            })
                            .end(function (result) {
                                if (result.error) {
                                    assert.ok(false)
                                } else if (result.status !== 200) {
                                    assert.ok(false)
                                }

                                assert.strictEqual(result.body.identity, goodd.user_identity);

                                done();
                            });
                    });
            });
    });
});
