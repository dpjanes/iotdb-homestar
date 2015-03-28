# Home☆Star Runner

## Transporters

Transporters are a key architectural feature of IOTDB. They are based
on the observation that a lot of the IoT is moving JSON-like dictionaries
around associated with Things, and that Things need to often need
to have multiple dictionaries for different types of data.

This can be used not only for moving data around, but also for acting as a data store and providing local web interfaces. The idea is that as Design Pattern, you'll be able to understand what's going on no matter what the usage.

## Key Concept

There are three elements used with a Transport:

* the ID
* the Band
* the Data

The ID is typically a Thing's ID. The Band is a string, but typically
one of these four values: "model", "meta", "istate" and "ostate".

## Methods

Transports provide the following functions:

* <code>list(paramd, callback)</code> enumerate all the IDs
* <code>get(id, band, callback)</code> retrieve one dictionary
* <code>update(id, band, value)</code> change one dictionary
* <code>updated(id, band, callback)</code> notify me when changes happen - id and band are optional, so you can listen to all changes
* <code>remove(id, band)</code> remove a band (or an entire ID)

## This is a Design Pattern

This is a design pattern, so although there's a fair amount of substitutability amongst Transports, they don't necessarily support all functions.

e.g. The MQTT transport doesn't provide a way to list or remove data.

## Conflicts

With distributed data, MQTT, etc. it is possible to get into loops, so be careful using the same Transport for sending and receiving data.

The IOTDB "meta" data now automatically adds "@timestamp" fields to data. We are considering adding this to other elements (istate and ostate in particular) but up to this point we've avoided being prescriptive. Still the usefulness for having "@timestamp" available for doing time-series data is pretty compelling.

The timestamp resolution algorithm is <code>check\_timestamp</code> coded
here: https://github.com/dpjanes/node-iotdb/blob/master/helpers/d.js available in all IOTDB code as <code>\_.d.check_timestamp()</code>.

## Using with IOTDB

Node-IOTDB exports a function that does most of the dirty work of moving Thing data into stores:

	iotdb.transport(things, transport-instance, paramd)
	
For example, here is the code in Homestar Runner that
broadcasts all metadata changes and <code>istate</code> changes
to web clients that want to listen.

    var iot = iotdb.iot();
    var things = iot.connect();
    
    var transporter = new MQTTTransport({
        prefix: path.join(settings.d.mqttd.prefix, "api", "things"),
        host: settings.d.mqttd.host,
        port: settings.d.mqttd.port,
    })

    iotdb.transport(transporter, things, {
        meta: true,
        model: false,
        istate: true,
        ostate: false,
        verbose: true,
        send: true,
        receive: false,
    });
    

## Settings

All Transports will load settings using this pattern. This
can be overwritten in the Constructor.

    iotdb.keystore().get("/transports/MQTTTransport/initd")



## Stores
The following stores are available on GitHub. Note that there
isn't too strong a coupling to the IOTDB library except for the Helpers
so this can be used elsewhere.

### FireBase
* https://github.com/dpjanes/iotdb-transport-firebase
* https://www.firebase.com/

Note there's a whole auth thing to be added! 
Right now this is wide open

### FS
* https://github.com/dpjanes/iotdb-transport-fs

Stores on the Filesystem. Listens for changes to the Filesystem so this is pretty full featured
Might need some tweaks for Windoes

### MQTT
* https://github.com/dpjanes/iotdb-transport-mqtt

Supports <code>qos</code> and <code>retain</code> but no MQTT
auth features yet.

### PubNub (in progress)
* https://github.com/dpjanes/iotdb-transport-pubnub

### REST (in progress)
* https://github.com/dpjanes/iotdb-transport-rest

I know this is a good idea but I can't get my head around it. 
Will export an API using an ExpressJS app.




