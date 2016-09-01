/*
 *  bin/commands/setup.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
 *
 *  HomeStar command line control: "homestar setup"
 *  Do initial 1-itme setup of your Home☆Star installation.
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

const settings = require("../../app/settings");
const install = require("./install")

const fs = require('fs');
const path = require('path');
const unirest = require("unirest")

exports.command = "setup";
exports.summary = "setup your local Home☆Star installation";
exports.boolean = [ "verbose", ];

exports.help = function () {
    console.log("usage: homestar setup");
    console.log("");
    console.log("Setup your local Home☆Star installation");
};

exports.run = ad => {
    // required folders 
    try {
        fs.mkdirSync(".iotdb");
        console.log("+", "created .iotdb folder");
    } catch (error) {
        if (ad.verbose) {
            console.log("#", ".iotdb folder", _.error.message(error));
        }
    }

    try {
        fs.mkdirSync("boot");
        console.log("+", "created boot folder");
    } catch (error) {
        if (ad.verbose) {
            console.log("#", "boot folder", _.error.message(error));
        }
    }

    const boot_src = path.join(__dirname, "data/boot.js");
    const boot_dst = "boot/index.js";

    try {
        const boot_stat = fs.statSync(boot_dst);
        console.log("+", "boot exists, skipping", boot_dst);
    }
    catch (x) {
        const boot_document = fs.readFileSync(boot_src, "utf-8");
        fs.writeFileSync(boot_dst, boot_document);
        console.log("+", "wrote boot", boot_dst);
    }

    // secrets 
    const settings = iotdb.settings();

    [ "homestar/runner/secrets/host", "homestar/runner/secrets/session", "machine_id" ]
        .filter(key => !settings.get(key))
        .forEach(key => settings.save(key, _.id.uuid.v4()));

    // location 
    _.net.external.geo((error, addressd) => {
        if (addressd) {
            settings.save("homestar/runner/location/latitude", addressd.lat);
            settings.save("homestar/runner/location/longitude", addressd.lon);
            settings.save("homestar/runner/location/locality", addressd.city);
            settings.save("homestar/runner/location/country", addressd.countryCode || addressd.county);
            settings.save("homestar/runner/location/region", addressd.region || addressd.regionName);
            settings.save("homestar/runner/location/timezone", addressd.timezone);
            settings.save("homestar/runner/location/postal_code", addressd.zip);
        }

        console.log("+", "updated settings");

        install.install("iotdb", function() {
            install.install("homestar", function() {
                install.install("iotdb-timers", function() {
                    install.install("iotdb-upnp", function() {
                        console.log("+ finished!");
                    });
                });
            });
        });
    });
};
