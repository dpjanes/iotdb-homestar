/*
 *  bin/commands/install.js
 *
 *  David Janes
 *  IOTDB.org
 *  2014-02-17
 *
 *  Install a HomeStar Package
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
var _ = iotdb.helpers;
var cfg = iotdb.cfg;
var settings = require("../../app/settings");

var util = require('util');
var path = require('path');
var os = require('os');
var fs = require('fs');
var child_process = require('child_process');

var folder = "node_modules";

exports.command = "install";
exports.summary = "install a bridge";
exports.boolean = [ "update", "global" ]

exports.help = function () {
    console.log("usage: homestar install [--global] [--update] <npm-module>|<tarball>|etc.");
    console.log("");
    console.log("Install a node package for use with HomeStar");
    console.log("Always use this in preference to 'npm install' or 'npm update'");
    console.log("");
    console.log("--global will install in your home directory (otherwise: the current folder)");
    console.log("--update will do 'npm update'");
};

exports.run = function (ad) {
    if (ad._.length != 2) {
        console.log("error: homestar install takes a single argument");
        console.log("");
        exports.help();
        process.exit(1);
    }

    if (ad.global) {
        process.chdir(process.env['HOME']);
    }

    _make_node_modules();
    _install(ad._[1], ad.update ? "update" : "install", []);
}

var _install = function (name, update_install, completed) {
    var x = completed.indexOf(name);
    if (x > -1) {
        return;
    }

    var command = util.format("npm %s %s", update_install, name);

    console.log("running:", command);
    console.log("(this may take some time)");

    child_process.exec(command, function(error, stdout, stderr) {
        if (error) {
            console.log("error: running npm: %s", error);
            process.exit(1);
        }

        var re = /^([-_a-z]+)@([0-9.]+) (.*)$/mg; 
        var match = null;
        var m = null;
        while (m = re.exec(stdout)) {
            match = m;
        }

        if (!match) {
            console.log("error: running npm");
            console.log(stderr);
            process.exit(1);
        }

        var module_name = match[1];
        var module_folder = match[3];

        _save_module(module_name, module_folder, completed);
        _remove_homestar(module_name, module_folder);
        _install_children(module_name, module_folder, completed);
    });

};

/**
 *  Add module info to the keystore
 */
var _save_module = function (module_name, module_folder, completed) {
    var module_path = path.join(process.cwd(), module_folder);

    iotdb.keystore().save("/modules", function(current) {
        if (!_.isObject(current)) {
            current = {};
        }

        current[module_name] = module_path;
        return current;
    });

    console.log("done");
    console.log("- name:", module_name);
    console.log("- path:", module_path);
};

/**
 *  We don't need to have many copies of hoemstar laying about
 */
var _remove_homestar = function (module_name, module_folder, completed) {
    var homestar_dir = path.join(process.cwd(), module_folder, "node_modules", "homestar");
    console.log("cleanup", homestar_dir);

    try {
        _rmdirSync(homestar_dir);
    } catch (x) {
        console.log("# ignoring error", x);
    }
};

/**
 *  homestar.dependencies can allow more things to be installed into homestar,
 *  essentially recursively
 */
var _install_children = function (module_name, module_folder, completed) {
    var packaged = {};
    var filename = path.join(process.cwd(), module_folder, "package.json");

    cfg.cfg_load_json([ filename ], function(paramd) {
        for (var key in paramd.doc) {
            packaged[key] = paramd.doc[key];
        }
    });

    var dependencies = _.d.get(packaged, "/homestar/dependencies");
    if (!dependencies) {
        return;
    }

    for (var dname in dependencies) {
        console.log("found dependency", dname);
        _install(dname, completed);
    }
};

/**
 *  The node_modules directory always goes in the current directory
 *  so that NPM doesn't start placing things in parent directories
 */
var _make_node_modules = function() {
    try {
        var statbuf = fs.statSync(folder);
        if (statbuf.isDirectory()) {
            return;
        }
    }
    catch (x) {
    }

    try {
        fs.mkdirSync("node_modules");
    } catch (x) {
    }

    statbuf = fs.statSync(folder);
    if (statbuf.isDirectory()) {
        return;
    }
};

/**
 *  Helper
 */
var _rmdirSync = function(dir) {
	var list = fs.readdirSync(dir);
	for(var i = 0; i < list.length; i++) {
		var filename = path.join(dir, list[i]);
		var stat = fs.statSync(filename);
		
		if(filename == "." || filename == "..") {
			// pass these files
		} else if(stat.isDirectory()) {
			// rmdir recursively
			_rmdirSync(filename);
		} else {
			// rm fiilename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};
