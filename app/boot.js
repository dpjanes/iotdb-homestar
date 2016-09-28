/*
 *  boot.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-09-27
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

const path = require('path');
const fs = require('fs');

const settings = require('./settings');

const logger = iotdb.logger({
    name: 'iotdb-homestar',
    module: 'app/boot',
});

const setup = () => {
    if (!settings.d.boot) {
        logger.warn({
        }, "boot turned off");
        return;
    }

    const boot_folder = path.join(process.cwd(), "boot");

    let stbuf;
    try {
        stbuf = fs.statSync(boot_folder)
    } catch (x) {
        logger.error({
            boot_folder: boot_folder,
            error: x,
        }, "boot folder not found");
        return;
    }

    require(boot_folder);
};

/**
 *  API
 */
exports.setup = setup;
