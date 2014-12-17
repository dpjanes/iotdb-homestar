/*
 *  web.js
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
var cfg = iotdb.cfg;

var swig = require('swig');
var os = require('os');
var express = require('express');
var bodyParser = require('body-parser');
var open = require('open');
var path = require('path');
var util = require('util');

var mqtt = require('./mqtt');
var action = require('./action');
var data = require('./data');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-runner',
    module: 'web',
});

var settingsd = {
    ip: "127.0.0.1",
    mqttd: {
        local: false,
        verbose: true,
        prefix: null,
        host: 'mqtt.iotdb.org',
        port: 1883,
        websocket: 8000
    },
    webserverd: {
        host: null,
        port: 3000
    },
    open_browser: true
};

/**
 */
var settings_main = function() {
    var iot = iotdb.iot();
    var d = iot.cfg_get("nameless");
    if (d) {
        _.smart_extend(settingsd, d);
    }

    if (!settingsd.mqttd.prefix) {
        var username = iot.username;
        console.log("HERE:AAAA", username);
        if (username === "nobody") {
            logger.fatal({
                method: "settings_main",
                cause: "please run $ iotdb oauth-iotdb",
            }, "no 'username' - this may cause MQTT conflicts");
            process.exit(0);
        }

        var machine_id = iot.cfg_get('machine_id');
        if (!machine_id) {
            logger.fatal({
                method: "settings_main",
                cause: "please run $ iotdb machine-id",
            }, "no 'machine_id' - this may cause MQTT conflicts");
            process.exit(0);
        }

        settingsd.mqttd.prefix = util.format("/u/%s/%s/", username, machine_id);
    };

    var ipv4 = _.ipv4();
    if (ipv4) {
        settingsd.ip = ipv4;
    }
}

/**
 *  Serve the home page - dynamically created
 */
var webserver_home = function(request, result) {
    logger.info({
        method: "webserver_thing_home",
    }, "called");

    /*
     *  Render
     */
    var home_template = path.join(__dirname, '..', 'client', 'index.html')
    var home_page = swig.renderFile(home_template, {
        cdsd: action.group_actions(),
        settingsd: settingsd
    })

    // console.log(home_page)
    result.set('Content-Type', 'text/html');
    result.send(home_page)
}

/**
 *  Run a particular action. This is always
 *  the result of a PUT
 */
var webserver_action = function(request, result) {
    logger.info({
        method: "webserver_action",
        action_id: request.params.action_id
    }, "called");

    var actiond = action.action_by_id(request.params.action_id)
    if (!actiond) {
        logger.error({
            method: "webserver_action",
            action_id: request.params.action_id
        }, "action not found");

        result.set('Content-Type', 'application/json');
        result.status(404).send(JSON.stringify({
            error: "action not found",
            action_id: request.params.action_id
        }, null, 2))
        return;
    }

    if (actiond._context) {
        logger.error({
            method: "webserver_action",
            action_id: request.params.action_id,
            cause: "user sent the request before a previous version finished",
        }, "action is still running");

        result.set('Content-Type', 'application/json');
        result.status(409).send(JSON.stringify({
            error: "action is still running",
            action_id: request.params.action_id
        }, null, 2))
        return;
    }

    var context = new action.Context(request.params.action_id, actiond);
    context.on("message", function(id, actiond, message) {
        var topic = settingsd.mqttd.prefix + "api/actions/" + id;
        var payload = {
            message: message
        };

        mqtt.publish(settingsd.mqttd, topic, payload);
    });
    context.on("running", function(id, actiond) {
        var topic = settingsd.mqttd.prefix + "api/actions/" + id;
        var payload = {
            running: context.running
        };

        mqtt.publish(settingsd.mqttd, topic, payload);

        if (!context.running) {
            actiond._context = undefined;
        }
    });
    context.run(request.body.value);

    result.set('Content-Type', 'application/json');
    result.send(JSON.stringify({
        running: context.running
    }, null, 2))

    if (context.running) {
        actiond._context = context;
    }
}

/**
 *  Set up the web server
 */
var webserver_express = function() {
    var wsd = settingsd.webserverd
    if (wsd.host == null) {
        wsd.host = settingsd.ip
    }

    var app = express();

    app.use(bodyParser.json()); 

    app.get('/', webserver_home);
    app.use('/', express.static(path.join(__dirname, '..', 'client')));
    app.use('/', express.static(path.join(__dirname, '..', 'client', 'flat-ui')));
    app.put('/api/actions/:action_id', webserver_action);

    app.listen(wsd.port);
};

/*
 *  Start IOTDB
 */
var iot = iotdb.iot();
iot.on_thing(function(thing) {
    logger.info({
        thing: thing.thing_id(),
        meta: thing.meta().state(),
    }, "found new thing");
});

/*
 *  Load Actions
 */
action.load_actions();

/**
 *  Setup the web server
 */
settings_main();
webserver_express();

/*
 *  Run the web server
 */
var url = "http://" + settingsd.webserverd.host + ":" + settingsd.webserverd.port;
logger.info({
    method: "main",
    url: url,
}, "listening for connect");

if (settingsd.open_browser) {
    open(url);
}

/*
 *  Run the MQTT server (not working yet)
 */
if (settingsd.mqttd.local) {
    logger.info({
        method: "main",
        paramd: settingsd.mqttd,
    }, "setting up MQTT server");

    if (settingsd.mqttd.host) {
        settingsd.mqttd.host = settingsd.webserverd.host;
    }

    mqtt.create_server(settingsd.mqttd);
    mqtt.create_bridge({
        mqtt: {
            host: settingsd.mqttd.host,
            port: settingsd.mqttd.port
        },
        websocket: {
            port: settingsd.mqttd.websocket
        }
    });
}
