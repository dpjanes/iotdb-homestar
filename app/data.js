/*
 *  data.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-11
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


var iotdb = require('iotdb');
var _ = iotdb.helpers;

var IOT = iotdb.IOT;
/*
console.log(IOT)
process.exit(0);
 */

/**
 *  Kind of an arbitrary key / values store.
 *  This is both a setter and getter.
 *  This class doesn't use it but it's very
 *  handy for clients.
 */
IOT.prototype.data = function (key, d) {
    var self = this;

    if (self.datadsd === undefined) {
        self.datadsd = {};
    }

    if (d === undefined) {
        return self.datadsd[key];
    } else if (_.isObject(d)) {
        var datads = self.datadsd[key];
        if (datads === undefined) {
            datads = self.datadsd[key] = [];
        }

        var found = false;
        if (d.id !== undefined) {
            for (var di in datads) {
                if (datads[di].id === d.id) {
                    datads.splice(di, 1, d);
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            datads.push(d);
        }

        return self;
    } else {
        throw new Error("IOT.data: the value must always be an object");
    }
};
