/*
 *  This code is invoked when HomeStar starts.
 *  Use this to connect to your Things.
 *
 *  For a complete list of available Bridges -
 *  there's a lot more - please see:
 *  https://github.com/dpjanes/node-iotdb/blob/master/docs/bridges.md
 *
 *  You'll also have to see the documentation for 
 *  each individual Bridge type. There's a link for
 *  each one below
 */

const iotdb = require("iotdb");
const _ = iotdb._;

/**
 *  This mutes UPnP messages. You might want to mute more things
 */
_.logger.mute({ name: "iotdb-upnp" });

/*
 *  This lets you edit metadata about your things
 *  - note that 'homestar-persist' is needed also (below)
 */
try {
    iotdb.use("homestar-metadata");
}
catch (x) {
    console.log("#", "not installed:", "homestar-metadata");
}

/*
 *  This stores your thing's state. This is needed
 *  for homestar-persist, 'homestar things' and 'homestar put'
 */
try {
    iotdb.use("homestar-persist");
}
catch (x) {
    console.log("#", "not installed:", "homestar-persist");
}

/*
 *  https://github.com/dpjanes/homestar-wemo
 */
try {
    iotdb.use("homestar-wemo");

    iotdb.connect("WeMoSocket");
    iotdb.connect("WeMoInsight");
    iotdb.connect("WeMoSwitch");
    iotdb.connect("WeMoMotion");
}
catch (x) {
    console.log("#", "not installed:", "homestar-wemo");
}

/*
 *  https://github.com/dpjanes/homestar-hue
 */
try {
    iotdb.use("homestar-hue");

    iotdb.connect('HueLight');

}
catch (x) {
    console.log("#", "not installed:", "homestar-hue");
}

/*
 *  https://github.com/dpjanes/homestar-lifx
 */
try {
    iotdb.use("homestar-lifx");

    iotdb.connect('LIFXWhite');
    iotdb.connect('LIFXLight');
}
catch (x) {
    console.log("#", "not installed:", "homestar-lifx");
}

/*
 *  https://github.com/dpjanes/homestar-nest
 */
try {
    iotdb.use("homestar-nest");

    iotdb.connect('NestCam');
    iotdb.connect('NestThermostat');
    iotdb.connect('NestProtect');
}
catch (x) {
    console.log("#", "not installed:", "homestar-nest");
}

/*
 *  https://github.com/dpjanes/homestar-smartthings
 */
try {
    iotdb.use("homestar-smartthings");

    iotdb.connect("SmartThingsBattery");
    iotdb.connect("SmartThingsContact");
    iotdb.connect("SmartThingsMotion");
    iotdb.connect("SmartThingsSwitch");
    iotdb.connect("SmartThingsTemperature");
    iotdb.connect("SmartThingsThreeAxis");
}
catch (x) {
    console.log("#", "not installed:", "homestar-smartthings");
}

/* --- more esoteric ones below here --- */
/*
 *  https://github.com/dpjanes/homestar-feed
 */
try {
    iotdb.use("homestar-feed");

    iotdb.connect('USGSEarthquake');
}
catch (x) {
    console.log("#", "not installed:", "homestar-feed");
}

/*
 *  https://github.com/dpjanes/homestar-johnny-five
 */
try {
    iotdb.use("homestar-johnny-five");

    iotdb.connect('JohnnyFiveLED', {
        pin: 13
    });
}
catch (x) {
    console.log("#", "not installed:", "homestar-johnny-five");
}

/**
 *  Catch all - connect to everything that can be automatically conncted to
 */
iotdb.connect()
