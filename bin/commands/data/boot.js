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

/*
 *  https://github.com/dpjanes/homestar-hue
 */
try {
    iotdb.use("homestar-hue");

    iot.connect('HueLight');

}
catch (x) {
    console.log("#", "not installed:", "homestar-hue");
}

/*
 *  https://github.com/dpjanes/homestar-lifx
 */
try {
    iotdb.use("homestar-lifx");

    iot.connect('LIFXWhite');
    iot.connect('LIFXLight');
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

    iot.connect("SmartThingsBattery");
    iot.connect("SmartThingsContact");
    iot.connect("SmartThingsMotion");
    iot.connect("SmartThingsSwitch");
    iot.connect("SmartThingsTemperature");
    iot.connect("SmartThingsThreeAxis");
}
catch (x) {
    console.log("#", "not installed:", "homestar-smartthings");
}

