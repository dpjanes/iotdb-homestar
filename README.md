# Home☆Star Runner

## What is it

## Installation

You'll need to have Node-JS installed on your computer,
[in whatever the usual way for you is](http://nodejs.org/download/).

### Package

Run:

    $ sudo npm install -g homestar
    $ npm link homestar
    
If the second command gives an error, run it as:

	$ sudo npm link homestar

### Configuration

Run:

    $ homestar setup

This will store some interesting values in <code>.iotdb/keystore.json</code> and try to figure out your geographic location.

### Integrate with HomeStar.io

Then:

* go to: https://homestar.io
* sign in / create an account
* go to: https://homestar.io/runners/add
* follow the instructions - basically, copy and paste some commands

[HomeStar.io](https://homestar.io) provides a user authentication layer for you so you can decide who's allowed to use what

### Additional Node modules

#### Bluetooth Low Energy

	$ npm install -g noble

#### Feeds (Atom and RSS)

	$ npm install -g feedparser

#### Firmata (Arduino)  

	$ npm install -g firmata

#### LIFX 

	$ npm install -g lifx

## Running

    $ homestar runner | homestar pretty

The home page will be brought up in your browser. 
<code>homestar pretty</code> makes the output more readable.

## Getting new recipes

    homestar browse

## Important Settings

### Change the name of my server as it appears on HomeStar.io

    homestar set name "StrongBad"

### Don't open webpage 

    homestar set browser 0 --boolean

(you can also change this at runtime)

    homestar runner browser=0

### Change http port

    homestar set webserver/port 4567 --integer

### Change latitude / longitude

Your latitude and longitude are used to determine solar events,
such as sunrise and sunset. Read more about this [here](https://github.com/dpjanes/iotdb-timers).

    homestar set location/latitude 43.7387 --number
    homestar set location/longitude -79.4337 --number

Note that <code>homestar setup</code> automatically sets pretty good values for these.
