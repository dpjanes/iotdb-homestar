/*
 *  bin/commands/add-recipe.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-12-30
 *
 *  HomeStar command line control: "homestar add-recipe"
 *  Add a recipe from the web to your HomeStar installation
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
var cfg = iotdb.cfg;
var settings = require("../../app/settings");

var node_fs = require('fs');
var node_url = require('url');
var node_path = require('path');

var unirest = require('unirest');

exports.command = "add-recipe";
exports.summary = "add a recipe to your Runner";

exports.help = function () {
    console.log("usage: homestar add-recipe [<url>|<recipe_name>]");
    console.log("");
    console.log("Add a recipe to your Home☆Star Runner. These are");
    console.log("copied into folder 'cookbook'. Please edit to make");
    console.log("sure they do what you want");
    console.log("");
    console.log("Recipes can be found here:");
    console.log("https://github.com/dpjanes/homestar-cookbook");
};

exports.run = function (ad) {
    if (ad._.length != 2) {
        console.log("homestar add-recipe takes a single argument");
        console.log("");
        exports.help();
        process.exit(1);
    }

    // normalize the URL, depending on github
    var url = ad._[1];
    var urlp = node_url.parse(url);
    if (urlp.host === null) {
        url = "https://raw.githubusercontent.com/dpjanes/homestar-cookbook/master/" + urlp.path;
        if (!url.match(/[.]js$/)) {
            url += ".js";
        }
    } else if (urlp.host == "github.com")  {
        var prefix = "/dpjanes/homestar-cookbook/blob/master/";
        if (urlp.path.indexOf(prefix) === 0) {
            url = "https://raw.githubusercontent.com/dpjanes/homestar-cookbook/master/" + urlp.path.substring(prefix.length);
        }
    }

    console.log("* downloading", url);

    // make the local filename and make sure it doesn't exist
    var urlp = node_url.parse(url);
    var basename = node_path.basename(urlp.path);
    var path = node_path.join(settings.d.cookbooks_path, basename);
    if (node_fs.existsSync(path)) {
        console.log("# error: %s exists - delete it or move it away first", path);
        process.exit(1)
    }

    // download
    unirest
        .get(url)
        .end(function (result) {
            if (result.error) {
                console.log("# error: %s", result.error);
                process.exit(1);
            }

            try {
                node_fs.mkdirSync(settings.d.cookbooks_path);
            } catch (err) {
            }

            node_fs.writeFile(path, result.body);
            
            console.log("- done!");
            console.log("* read %s", url);
            console.log("* wrote %s", path);
        });
};
