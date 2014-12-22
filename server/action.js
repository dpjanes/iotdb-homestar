/*
 *  action.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-14
 *
 *  Copyright [2013-2014] [David P. Janes]
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

var events = require('events');
var util = require('util');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'context',
});

/**
 *  The "Context" is basically does the work of
 *  managing a running Action.
 */
var Context = function (id, actiond) {
    var self = this;

    self.running = false;
    self.actiond = actiond;
    self.id = id;

    events.EventEmitter.call(self);
};

util.inherits(Context, events.EventEmitter);

Context.prototype.message = function () {
    var self = this;

    self.running = true;

    self.emit("message", self.id, self.actiond,
        util.format.apply(util.apply, Array.prototype.slice.call(arguments)));
};

Context.prototype.done = function (timeout) {
    var self = this;

    if (timeout === undefined) {
        timeout = 0.8;
    }

    setTimeout(function () {
        self.running = false;
        self.emit("running", self.id, self.actiond);
    }, timeout * 1000);

};

Context.prototype.run = function (value) {
    var self = this;

    self.running = false;
    self.actiond.run(self, value);
};

/**
 *  Use this to load actions
 */
var load_actions = function (initd) {
    var self = this;

    initd = _.defaults(initd, {
        actions_path: "actions",
    });

    logger.info({
        method: "_load_actions",
        actions_path: initd.actions_path,
    }, "loading actions");

    var filenames = cfg.cfg_find(iotdb.iot().envd, initd.actions_path, /[.]js$/);
    cfg.cfg_load_js(filenames, function (paramd) {
        if (paramd.error !== undefined) {
            if (paramd.filename) {
                logger.error({
                    method: "_load_actions",
                    filename: paramd.filename,
                    error: paramd.error,
                    exception: paramd.exception,
                }, "error loading JS Model");
            }
            return;
        }

        logger.debug({
            method: "_load_actions",
            filename: paramd.filename
        }, "found Model");
    });
};

/**
 *  Use this for the standard ordering of Actions
 */
var order_action = function (a, b) {
    if (a.group < b.group) {
        return -1;
    } else if (a.group > b.group) {
        return 1;
    }

    if (a.name < b.name) {
        return -1;
    } else if (a.name > b.name) {
        return 1;
    }

    return 0;
};

/**
 *  Make a unique ID for an Action
 */
var action_to_id = function (actiond) {
    return _.md5_hash("2014-12-13T06:34:00", actiond.group, actiond.name);
};

/**
 *  Find an Action by ID
 */
var action_by_id = function (id) {
    var iot = iotdb.iot();
    var cds = iot.data("action");
    if (!cds || !cds.length) {
        return null;
    }

    for (var ci in cds) {
        var actiond = cds[ci];
        if (action_to_id(actiond) === id) {
            return actiond;
        }
    }

    return null;
};

/**
 *  Group actions by their group,
 *  then sort by name. The
 *  returned datastructure looks
 *  something like:
 *  <pre>
 *  {
 *      "Group 1": [
 *          {
 *              "name": "Action 1",
 *          },
 *          {
 *              "name": "Action 2",
 *          },
 *      ],
 *      "Group 2": [
 *      ],
 *  }
 *  </pre>
 */
var group_actions = function () {
    var iot = iotdb.iot();
    var cds = iot.data("action");
    if (!cds || !cds.length) {
        cds = [];
    }

    cds.sort(order_action);

    var gdsd = {};

    for (var ci in cds) {
        var actiond = cds[ci];
        actiond._id = action_to_id(actiond);

        var gds = gdsd[actiond.group];
        if (gds === undefined) {
            gds = gdsd[actiond.group] = [];
        }

        gds.push(actiond);
    }

    return gdsd;
};

/**
 *  API
 */
exports.Context = Context;
exports.order_action = order_action;
exports.load_actions = load_actions;
exports.group_actions = group_actions;
exports.action_to_id = action_to_id;
exports.action_by_id = action_by_id;
