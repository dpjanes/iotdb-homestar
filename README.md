# IOTDB / Home☆Star

## What is it

IOTDB / Home☆Star is an Open Source IoT Platform / API in Node.JS. I'd tell you it's the _best_ IoT Platform, but I hope you can discover this for yourself.

First, a simple introduction of "what's what".

* Home☆Star is the "management" part - it handles the HTML user interface, presenting the RESTful API, hooking into notifications systems like MQTT or FireBase, and installing and configuring IOTDB related modules.
* IOTDB is the "core" - it's a small Node.JS library that orchestrates making all your different things work together.

Next: "what's the clever bit"? There's a lot of neat ideas that have gone into IOTDB - we'll cover them elsewhere in this documentation. But here's the foremost idea: we don't need to have an "IoT Standard"


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

