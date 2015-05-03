# IOTDB / Home☆Star

## What is it?

IOTDB / Home☆Star is an Open Source IoT Platform / API in Node.JS. I'd tell you it's the _best_ IoT Platform, but I hope you can discover this for yourself.

### IOTDB v. Home☆Star

First, a simple introduction of "what's what".

* **Home☆Star** is the "management" part - it handles the HTML user interface, presenting the RESTful API, hooking into notifications systems like MQTT or FireBase, and installing and configuring IOTDB related modules.
* **IOTDB** is the "core" - it's a small Node.JS library that orchestrates making all your different things work together.

### What's the Clever Bit?

There's a lot of neat ideas that have gone into IOTDB - we'll get to them elsewhere in this documentation. But the foremost: **we don't need to have an "IoT Standard" if we can systematically describe what Things actually do**.

In other words, IOTDB implements a **Semantic Metastandard**.

Still confused? Consider the following:

* I can turn on and off the lights
* I can turn on and off the stove
* I can turn on and off the heating
* I can turn on and off a hair dryer

There's a common concept here: "I can turn Thing X on or off". 
IOTDB says "hey, let's do all the hard bits in code so the end programmer only has to do":

	thing.set(":on", true);
	
or 

	thing.set(":on", false);
	
<i>Aside: <code>":on"</code> is a shorthand for "the universal concept of turning a Thing on or off". You can see the formal definition here:
[iot-attribute:on](https://iotdb.org/pub/iot-attribute.html#on)</i>.

Here's another example, of doing the _same_ action to different Things:

* I can change the color of a Philips Hue Light to "red"
* I can change the color of a LIFX Light to "red"
* I can change the color of a RGB LED to "red".

A programmer using IOTDB only has to do…

	thing.set(":color", "red")
	
…to make this happen. 

Of course, _something_ actually has to do the work. 
IOTDB manages this all behind the scenes in something called a **Bridge**, which provides a standard way of discovering, configuring and manipulating Things. 
Normally as a programmer you do not have to worry about how Bridges work, unless you're adding a new type of Thing to IOTDB.

### What else ya got?

Here's a few other interesting concepts from IOTDB. 
Don't worry about understanding these right off.

* **Bridge** - a standard way of interfacing to Things in Node.JS. Actually works mostly independently of IOTDB and can be used stand-alone.
* **Deferred Operations** - Node.JS typically uses lots of callbacks: you wait for something to be ready, get a notification, then do stuff. In IOTDB you typically say "do this operation" and when the Thing becomes available it is then performed.
* **Bands** - in IOTDB, a Thing is really a unique identifier, plus a series of "bands". Bands are named JSON dictionaries, currently "istate", "ostate", "meta" and "model". You manipulate Things solely by manipulating bands.
* **Transporters** - a lot of really common and useful operations can done simply by modelling it by moving band data around. For example, Home☆Star's HTML interface is made by a "HTML Transporter" being connected to a "IOTDB Transporter".
* **Transmogrifiers** - (a work in progress) we can e.g. make a Fahrenheit temperature sensor look like a Celsius one, so as a programmer you don't have to worry about incompatible data sets.

### What does it run on?

Anything that Node.JS runs on.
We develop on Mac and test on Raspberry Pis, Linux boxes and Intel Edisons (so far)

### What does it look like?

IOTDB looks like any other Node.JS program! The Home☆Star user interface is a web page and looks like this:

Home☆Star also presents an API that you can see by navigating to:

	http://192.168.XX.XX:11802/api


## Installation

### Install Node.JS

You'll need to have Node.JS installed on your computer.
I can't help you there, see http://nodejs.org/download/

There is an assumption here you know Node.JS at least a little bit!
If you don't, it's not too difficult to get going with it.

### Install Home☆Star

    $ sudo npm install -g homestar
    $ homestar setup

As it's running, you'll see that it identifies your current location (based on IP) and sets up a few UUIDs.

After it finishes, note:

* the folder <code>./node_modules</code> contains a number of <code>iotdb*</code> modules
* the folder <code>./.iotdb</code> has a file <code>./.iotdb/keystore.json</code> in it - have a look at it! You should see some familiar data

### Install some modules

Home☆Star by itself does very little. 
To make it do something useful, you have to install "modules", which are basically just plug-ins.

The most common modules are **Bridges** which - as you know from above - encapsulate how to talk to some Thing or another.

Here's how you make your Home☆Star / IOTDB installation talk to WeMos.

	$ homestar install homestar-wemo
	
Need to talk to something else? See [docs/modules.md](docs/modules.md) for a list of current modules.

### Run your first IOTDB program

Create a program <code>wemo.js</code> with the following contents:

	iotdb = require('iotdb')
	iot = iotdb.iot()
	things = iot.connect()
	things.set(':on', true)


## More
### Architecture

Here's the architecture of a typical IOTDB program:


	+----------------+
	| Your Code      |
	+----------------+
	| Thing Arrays   |
	+----------------+
	| Thing          |
	+----------------+
	| Model          |
	+----------------+
	| Bridge         |
	+----------------+
	| Native Code    |
	+----------------+
	

* Your Code: as per above, e.g. <code>thing.set(":on", false)</code>
* Thing Arrays: handles deferred operations
* Thing: manages ID and Bands for an individual Thing
* Model: maps semantic operations (":on" → false) to what the Bridge actually does (maybe e.g. "power=0")
* Bridge: handles discovery and configuration. When Things are actually discovered, it handles moving the "istate" of data into IOTDB and the "ostate" of data to the actual Thing. The "istate" is the "actual" state of a Thing, the "ostate" is what we want it to be.
* Native Code: typically, a Node.JS library

When working with Transporters the stack looks like this:


	+----------------+
	| Native Code    |
	+----------------+
	| Other Trans.   |
	+----------------+
	| IOTDB Trans.   |
	+----------------+
	| Thing Arrays   |
	+----------------+
	| Thing          |
	+----------------+
	| Model          |
	+----------------+
	| Bridge         |
	+----------------+
	| Native Code    |
	+----------------+


Where the top "Native Code" is HTML, MQTT, FireBase, a database and so forth. If this isn't clear, don't worry about it. 
Home☆Star handles this for most instances where you'll need this. 

----------------




 The _core_ of IOTDB is knowing that we don't need to standardize

idea is that **Things should be controlled






HomeStar is powerful, Open Source IoT software written in Node.JS.
The core of HomeStar is a library called IOTDB - the Internet of Things
Database - which provides a well thought out and programmer-friendly
model for discovering and configuring things, and controlling the using
their own native vocabulary, or more importantly, using a universal
semantic language.

You can run it on your home computer, Raspberry Pi,
Intel Edison, BeagleBone Black, &c.

Ideal early users have Belkin WeMo, Philips Hue,
LIFX, but theoretically it'll run with anything.

### Read these three in order

* [Install Instructions](docs/install.md)
* [Adding new IOTDB Modules](docs/modules.md) - to support your particular devices
* [Configuration](docs/configure.md) - customizing to your need

### Additional

* [Module Management](docs/command-install.md) - technical details
* Discuss [https://plus.google.com/communities/108112460238486371606](https://plus.google.com/communities/108112460238486371606)

### Updates

* [IOTDB 0.6.X](docs/IOTDB-0.6.md) - what's changed

## Running HomeStar

    $ homestar runner | homestar pretty

## Getting new recipes

    homestar browse

