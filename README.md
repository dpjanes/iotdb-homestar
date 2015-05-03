# IOTDB / Home☆Star

## What is it

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

