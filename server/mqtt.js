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
var util = require('util');
var url = require('url');
var mqtt_ws = require('mqtt-ws')

var bunyan = require('bunyan');
var logger = bunyan.createLogger({
    name: 'iotdb-home',
    module: 'home_mqtt',
});

/**
 *  Create an MQTT server
 */
exports.create_server = function(mqttd) {
    if (!mqttd.local) {
        logger.warn({
            method: "create_server",
            cause: "only need to create a server for MQTT running inside this"
        }, "not local, so not doing this");
        return
    }

    mqttd.verbose = 1
    mqtt.createServer(function(client) {
      var self = this;

      logger.warn({
        method: "create_server/createServer",
      }, "called");

      if (!self.clients) self.clients = {};

      client.on('connect', function(packet) {
        if (mqttd.verbose) console.log('- create_server.connect')
        client.connack({returnCode: 0});
        client.id = packet.clientId;
        self.clients[client.id] = client;
      });

      client.on('publish', function(packet) {
        logger.warn({
          method: "create_server/createServer/on(publish)",
          topic: packet.topic,
          payload: packet.payload,
        }, "called");
        for (var k in self.clients) {
          self.clients[k].publish({topic: packet.topic, payload: packet.payload});
        }
      });

      client.on('subscribe', function(packet) {
        if (mqttd.verbose) console.log('- create_server.subscribe')
        var granted = [];
        for (var i = 0; i < packet.subscriptions.length; i++) {
          granted.push(packet.subscriptions[i].qos);
        }

        client.suback({granted: granted, messageId: packet.messageId});
      });

      client.on('pingreq', function(packet) {
        if (mqttd.verbose) console.log('- create_server.pingreq')
        client.pingresp();
      });

      client.on('disconnect', function(packet) {
        if (mqttd.verbose) console.log('- create_server.disconnect')
        client.stream.end();
      });

      client.on('close', function(err) {
        if (mqttd.verbose) console.log('- create_server.close')
        delete self.clients[client.id];
      });

      client.on('error', function(err) {
        if (mqttd.verbose) console.log('- create_server.error')
        client.stream.end();
        console.log('# create_server.error', err)
      });
    }).listen(mqttd.port);

}

exports.create_bridge = function(mqttd) {
    // Create our bridge
    var bridge = mqtt_ws.createBridge(mqttd);
    logger.info("Listening for incoming WebSocket connections on port %d",
        bridge.port);

    // Set up error handling
    bridge.on('error', function(err) {
        logger.error(err, "WebSocket Error");
    });

    // Handle incoming WS connection
    bridge.on('connection', function(ws) {
        // URL-decode the URL, and use the URI part as the subscription topic
        logger.info("WebSocket connection from %s received", ws.connectString);

        var self = this;

        ws.on('error', function(err) {
            logger.error(err, util.format("WebSocket error in client %s", ws.connectString));
        });

        // Parse the URL
        var parsed = url.parse(ws.upgradeReq.url, true);
        // Connect to the MQTT server using the URL query as options
        var mqtt = bridge.connectMqtt(parsed.query);
        mqtt.topic = decodeURIComponent(parsed.pathname.substring(1));
        mqtt.isWildcardTopic = (mqtt.topic.match(/[\+#]/) != null);

        ws.on('close', function() {
            logger.info("WebSocket client %s closed", ws.connectString);
            mqtt.end();
        });

        ws.on('message', function(message) {
            logger.info("WebSocket client %s publishing '%s' to %s",
                ws.connectString, message, mqtt.topic);
            mqtt.publish(mqtt.topic, message, mqtt.options);
        });

        mqtt.on('error', function(err) {
            logger.error(err, "MQTT error");
        });

        mqtt.on('connect', function() {
            logger.info("Connected to MQTT server at %s:%d", mqtt.host, mqtt.port);
            logger.info("WebSocket client %s subscribing to '%s'", ws.connectString, mqtt.topic);
            mqtt.subscribe(mqtt.topic);
        });

        mqtt.on('close', function() {
            logger.info("MQTT connection for client %s closed",
                ws.connectString);
            ws.terminate();
        });

        mqtt.on('message', function(topic, message, packet) {
            if (mqtt.isWildcardTopic) {
                ws.send(util.format("%s: %s", topic, message), self.options);
            } else {
                ws.send(message, self.options);
            }
        });
    });
};

var client = null

/**
 *  Publish an MQTT message
 */
exports.publish = function(mqttd, topic, data) {
    if (client == null) {
        console.log("- mqtt_home.publish", "connecting", mqttd.port, mqttd.host)
        logger.info({
            method: "publish",
            port: mqttd.port,
            host: mqttd.host
        }, "connecting to MQTT");
        client = mqtt.createClient(mqttd.port, mqttd.host)
        client.on('error', function() {
            logger.info({
                method: "publish/on(error)",
                arguments: arguments
            }, "unexpected");
        })
        client.on('clone', function() {
            logger.info({
                method: "publish/on(clone)",
                arguments: arguments
            }, "unexpected");
        })
    }

    if (_.isObject(data)) {
        client.publish(topic, JSON.stringify(data, null, 2));
    } else {
        client.publish(topic, data)
    }


    // console.log("- home_mqtt.publish", topic, data)
    logger.info({
        method: "publish",
        topic: topic,
        data: data
    }, "published");
}
