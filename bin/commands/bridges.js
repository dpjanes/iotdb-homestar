/*
 *  bin/commands/bridges.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-08-28
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

const path = require('path')
const fs = require('fs')

exports.command = "bridges";
exports.summary = "list Bridges"

exports.help = function () {
    console.log("usage: homestar bridges");
    console.log("");
};

const _paths = function() {
    const paths = [];
    let current_folder = process.cwd();

    while (true) {
        const candidate_folder = path.join(current_folder, "node_modules");

        try {
            const stbuf = fs.statSync(candidate_folder);
            if (stbuf.isDirectory()) {
                paths.push(candidate_folder);
            }
        } catch (x) {
        }

        const next_folder = path.normalize(path.join(current_folder, ".."));
        if (next_folder === current_folder) {
            break;
        }

        current_folder = next_folder;
    }

    return paths;
};


exports.run = function (ad) {
    const self = this;

    const xd = iotdb.modules().bridges()
        .filter(bridge => bridge.bridge_name)
        .map(bridge => bridge.bridge_name);

    _.flatten(
        _paths()
            .map(folder => 
                fs.readdirSync(folder)
                    .map(sub => ({ 
                        folder: folder, 
                        module_name: sub,
                        module_path: path.join(folder, sub),
                    }))
            )
    )
        .filter(md => md.module_name.match(/^homestar-/))
        .forEach(md => {
            try {
                iotdb.use(md.module_name, require(md.module_path));
            }
            catch (x) {
                console.log(x)
            }
        })

    iotdb.modules().modules()
        .sort((am, bm) => {
            if (am.module_name < bm.module_name) {
                return -1;
            } else if (am.module_name > bm.module_name) {
                return 1;
            } else {
                return 0;
            }
        })
        .forEach(m => {
            let version = null;
            try {
                const pd = JSON.parse(fs.readFileSync(path.join(m.module_folder, "package.json")));
                version = pd.version;
            } catch (x) {
            }

            console.log("*", m.module_name, "(version: " + version + "; folder:", m.module_folder + ")");
        })

    setTimeout(() => process.exit(0), 500);
};
