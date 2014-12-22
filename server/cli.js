/*
 *  cli.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-12
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
var util = require('util');
var prompt = require('prompt');

var data = require('./data');
var runner = require('./runner');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'Runner',
});

var iot = iotdb.iot();

var runner = new runner.Runner();
runner._load_actions();

var sorter = function (a, b) {
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

var prompt_the_user = function () {
    var commands = iot.data("command");
    if (!commands || !commands.length) {
        logger.error({
            method: "_load_actions",
            cause: "xxx"
        }, "nothing to prompt for");

    }

    commands.sort(sorter);

    var ps = [];
    for (var ci in commands) {
        var actiond = commands[ci];
        actiond._index = parseInt(ci) + 1;

        if ((actiond._index === 1) && (actiond.group !== undefined)) {
            ps.push(util.format("--- %s", actiond.group));
        }

        ps.push(util.format("[%d] %s", actiond._index, actiond.name));
    }

    var p = ps.join("\n");

    process.stdout.write(p);
    process.stdout.write("\n");

    prompt.get(['command'], function (error, result) {
        if (error) {
            logger.error({
                method: "prompt the user",
                error: error,
            });
            return;
        }

        if (result.command === '') {} else {
            var cindex = parseInt(result.command);
            for (var ci in commands) {
                var actiond = commands[ci];
                if (actiond._index === cindex) {
                    actiond.run();
                    break;
                }
            }
        }

        prompt_the_user();
    });
};

prompt_the_user();
