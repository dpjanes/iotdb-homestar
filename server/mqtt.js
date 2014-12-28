/*
 *  mqtt_server.js
 *
 *  David Janes
 *  IOTDB
 *  2014-06-21
 *
 *  A simple MQTT server with a WebSockets
 *  bridge.
 *
 *  XXX this server / bridge code isn't working
 *  just yet so we're using IOTDB's MQTT server
 */

"use strict";

var iotdb = require('iotdb');
var _ = iotdb.helpers;

var mqtt = require('mqtt');
var mows = require('mows');

var settings = require('./settings');

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-homestar',
    module: 'mqtt',
});

var serverd = {};
var server_client = function (client) {
    var self = serverd;

    logger.info({
        method: "create_server/createServer",
    }, "called");

    if (!self.clients) {
        self.clients = {};
    }

    client.on('connect', function (packet) {
        if (settings.d.mqttd.verbose) {
            console.log('- create_server.connect');
        }
        client.connack({
            returnCode: 0
        });
        client.id = packet.clientId;
        self.clients[client.id] = client;
    });

    client.on('publish', function (packet) {
        logger.info({
            method: "create_server/createServer/on(publish)",
            topic: packet.topic,
            payload: packet.payload,
        }, "called");
        for (var k in self.clients) {
            self.clients[k].publish({
                topic: packet.topic,
                payload: packet.payload
            });
        }
    });

    client.on('subscribe', function (packet) {
        if (settings.d.mqttd.verbose) {
            console.log('- create_server.subscribe');
        }
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
            granted.push(packet.subscriptions[i].qos);
        }

        client.suback({
            granted: granted,
            messageId: packet.messageId
        });
    });

    client.on('pingreq', function (packet) {
        if (settings.d.mqttd.verbose) {
            console.log('- create_server.pingreq');
        }
        client.pingresp();
    });

    client.on('disconnect', function (packet) {
        if (settings.d.mqttd.verbose) {
            console.log('- create_server.disconnect');
        }
        client.stream.end();
    });

    client.on('close', function (err) {
        if (settings.d.mqttd.verbose) {
            console.log('- create_server.close');
        }
        delete self.clients[client.id];
    });

    client.on('error', function (err) {
        if (settings.d.mqttd.verbose) {
            console.log('- create_server.error');
        }
        client.stream.end();
        console.log('# create_server.error', err);
    });
};

var create_server = function () {
    mqtt
        .createServer(server_client)
        .listen(settings.d.mqttd.port, settings.d.mqttd.host);

    logger.info({
        method: "create_server",
        port: settings.d.mqttd.port,
        host: settings.d.mqttd.host,
    }, "listening for MQTT");

};

var create_bridge = function () {
    mows
        .createServer(server_client)
        .listen(settings.d.mqttd.websocket, settings.d.host);

    logger.info({
        method: "create_server",
        websocket: settings.d.mqttd.websocket,
        host: settings.d.mqttd.host,
    }, "listening for WS-MQTT");
};

var client = null;

/**
 *  Publish an MQTT message
 */
exports.publish = function (mqttd, topic, data) {
    if (client == null) {
        console.log("- mqtt_home.publish", "connecting", mqttd.port, mqttd.host);
        logger.info({
            method: "publish",
            port: mqttd.port,
            host: mqttd.host
        }, "connecting to MQTT");
        client = mqtt.createClient(mqttd.port, mqttd.host);
        client.on('error', function () {
            logger.info({
                method: "publish/on(error)",
                arguments: arguments
            }, "unexpected");
        });
        client.on('clone', function () {
            logger.info({
                method: "publish/on(clone)",
                arguments: arguments
            }, "unexpected");
        });
    }

    if (_.isObject(data)) {
        client.publish(topic, JSON.stringify(data, null, 2));
    } else {
        client.publish(topic, data);
    }


    // console.log("- home_mqtt.publish", topic, data)
    logger.info({
        method: "publish",
        topic: topic,
        data: data
    }, "published");
};

var setup = function () {
    if (settings.d.mqttd.local) {
        logger.info({
            method: "main",
            paramd: settings.d.mqttd,
        }, "setting up MQTT server");

        if (!settings.d.mqttd.host) {
            settings.d.mqttd.host = settings.d.webserver.host;
        }

        create_server();
        create_bridge();
    }
};

/*
 *  API
 */
exports.setup = setup;
