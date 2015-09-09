/*
 *  interactor.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-06
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

/**
 *  If this attribute can be used for this 
 *  interactor, return an overlay. The overlay
 *  will be merged later on if this is used.
 */
exports.attribute = function(attributed) {
    var values = attributed["iot:format.enumeration"]
    if (!values) {
        return;
    }

    var _values = [];
    for (var vi in values) {
        var value = values[vi];
        var name = value;

        var cname = _.ld.compact(name);
        var cmatch = cname.match(/^iot-purpose:(.*[.])?(.*)/);
        if (cmatch) {
            name = cmatch[2];
        }

        _values.push({
            name: name,
            value: value,
        });
    }

    return{
        _values: _values,
    };
};
