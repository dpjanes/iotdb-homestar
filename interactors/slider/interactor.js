/*
 *  interactor.js
 *
 *  David Janes
 *  IOTDB.org
 *  2015-03-19
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

/**
 *  If this attribute can be used for this 
 *  interactor, return an overlay. The overlay
 *  will be merged later on if this is used.
 */
exports.attribute = function(attributed) {
    // must be a control
    if (!attributed._control) {
        return;
    }

    // must be a number or an integer
    var type = attributed['iot:type'];
    if (type === "iot:number") {
    } else if (type === "iot:integer") {
    } else {
        return;
    }

    // these like being sliders
    var strong = false;
    var unit = attributed['iot:unit'];
    if (unit === "iot-unit:math.fraction.unit") {
        strong = true;
    } else if (unit === "iot-unit:math.fraction.percent") {
        strong = true;
    }

    var minimum = attributed["iot:minimum"];
    if (minimum === undefined) {
        return;
    }
    minimum = parseFloat(minimum);

    var maximum = attributed["iot:maximum"];
    if (maximum === undefined) {
        return;
    }
    maximum = parseFloat(maximum);

    if (minimum >= maximum) {
        return;
    }

    var d = {
        _minimum: minimum,
        _maximum: maximum,
    };

    if (type === "iot:integer") {
        var steps = maximum - minimum;
        if (steps > 100) {
            steps = 100;
        }

        d._steps = steps;
    } else {
        d._steps = 25;
    }
    d._step = (maximum - minimum) / d._steps;

    if (strong) {
        d._q = .75;
    }

    return d;
};
