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
exports.boolean = [ "update", "global", "update-all", ]

exports.help = function () {
    console.log("usage: homestar install [--global] [--update] <npm-module>|<tarball>|etc.");
    console.log("");
    console.log("Install a node package for use with HomeStar");
    console.log("Always use this in preference to 'npm install' or 'npm update'");
    console.log("");
    console.log("--global will install in your home directory (otherwise: the current folder)");
    console.log("--update will do 'npm update'");
};

var update_install = "install";
var completed = [
    // "iotdb"
];
exports.run = function (ad) {
    if (ad.global) {
        process.chdir(process.env['HOME']);
    }

    var modules = [];
    if (ad['update-all']) {
        // completed = [];

        ad.update = true;
        var module_root = "node_modules";
        var names = fs.readdirSync(module_root);

        names = _.reject(names, function(name) { return !name.match(/^(homestar-|iotdb-|node-iotdb)/) });
        names = _.union([ "iotdb", "homestar", "iotdb-timers", "iotdb-upnp", ], names);

        for (var ni in names) {
            var name = names[ni];

            var module_folder = path.join(module_root, name);
            var stbuf;
            try {
                var stbuf = fs.lstatSync(module_folder);
                if (!stbuf.isDirectory()) {
                    continue;
                }
            } catch (x) {
            }

            modules.push(name);
        }
    } else if (ad._.length < 2) {
        console.log("error: homestar install takes one or more package names as arguments");
        console.log("");
        exports.help();
        process.exit(1);
    } else {
        modules = ad._.slice(1);
    }

    update_install = ad.update ? "update" : "install";

    _make_node_modules();

    modules.reverse();
    var _pop = function() {
        if (modules.length === 0) {
            console.log("- finished");
            return;
        }

        var module = modules.pop();
        _install(module, function(error) {
            console.log("- installed", module);
            _pop();
        });
    };

    _pop();
}

/*
 *  For the benefit of setup.js - don't use elsewhere
 */
exports.install = function(name, callback) {
    update_install = "install";

    // make sure local directory exists
    _make_node_modules();


    // force this to get installed
    var namex = completed.indexOf(name);
    if (namex > -1) {
        completed.splice(namex, 1);
    }

    // but not if it's already install - just skip!
    var module_path = path.join(process.cwd(), "node_modules", name);
    try {
        var statbuf = fs.statSync(module_path);
        if (statbuf.isDirectory()) {
            return callback();
        }
    }
    catch (x) {
    }

    // do the work
    _install(name, callback);
}

var _install = function (name, callback) {
    var x = completed.indexOf(name);
    if (x > -1) {
        return callback(null);
    }

    var module_name = name;
    var module_folder = path.join("node_modules", module_name);
    var module_update_install = update_install;
    var exists = false
    
    try {
        var stbuf = fs.lstatSync(module_folder);
        if (stbuf.isDirectory()) {
            exists = true;
        }
    } catch (x) {
    }

    if (!exists) {
        module_update_install = "install";
    }

    var command = util.format("npm %s %s", module_update_install, module_name);

    console.log("- running:", command);
    console.log("  (this may take some time)");

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
            if (update_install === "install") {
                console.log("# error: running npm");
                console.log(stderr);
                process.exit(1);
            }
        } else {
            module_name = match[1];
            module_folder = match[3];
        }

        var module_homestard = _load_homestar(module_folder);
        if (_.d.get(module_homestard, "/module", false) || (module_name === "homestar")) {
            _save_module(module_name, module_folder);
            remove_iotdb(module_name, module_folder);
            _install_children(module_name, module_folder, callback);
        } else {
            if (update_install === "install") {
                console.log("- installed node module!");
            } else {
                console.log("- updated node module!");
            }
            console.log("  name:", module_name);
            console.log("  path:", module_folder);
            callback();
        }
    });

};

/**
 *  Add module info to the keystore
 */
var _save_module = function (module_name, module_folder) {
    var module_path = path.join(process.cwd(), module_folder);

    iotdb.keystore().save("/modules", function(current) {
        if (!_.isObject(current)) {
            current = {};
        }

        current[module_name] = module_path;
        return current;
    });

    console.log("- installed homestar module!");
    console.log("  name:", module_name);
    console.log("  path:", module_path);
};

/**
 *  We don't need to have many copies of IOTDB laying about
 */
var remove_iotdb = function (module_name, module_folder) {
    var iotdb_dir = path.join(process.cwd(), module_folder, "node_modules", "iotdb");
    console.log("- cleanup");
    console.log("  path:", iotdb_dir);

    try {
        _rmdirSync(iotdb_dir);
    } catch (x) {
    }
};

/**
 *  homestar.dependencies can allow more things to be installed into homestar,
 *  essentially recursively
 */
var _install_children = function (module_name, module_folder, callback) {
    var module_folder = path.join(process.cwd(), module_folder)
    var module_packaged = _load_package(module_folder);

    var module_dependencies = _.d.get(module_packaged, "/dependencies");
    if (!module_dependencies) {
        return;
    }

    module_dependencies = _.keys(module_dependencies);

    var _install_next = function() {
        if (module_dependencies.length === 0) {
            return callback();
        }

        var dname = module_dependencies.pop();
        var dependency_folder = path.join(module_folder, "node_modules", dname);
        var dependency_homestard = _load_homestar(dependency_folder);

        var is_module = _.d.get(dependency_homestard, "/module", false);
        if (!is_module) {
            return _install_next();
        }

        console.log("- found dependency:", dname);
        _install(dname, function() {
            try {
                console.log("- cleanup");
                console.log("  path:", dependency_folder);
                _rmdirSync(dependency_folder);
            } catch (x) {
            }

            _install_next();
        });
    }

    _install_next();
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
 *  Helpers
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

var _load_json = function(filename) {
    var d = {};
    cfg.cfg_load_json([ filename ], function(paramd) {
        for (var key in paramd.doc) {
            d[key] = paramd.doc[key];
        }
    });

    return d;
};

var _load_package = function(folder) {
    return _load_json(path.join(folder, "package.json"));
};

var _load_homestar = function(folder) {
    return _load_json(path.join(folder, "homestar.json"));
};

