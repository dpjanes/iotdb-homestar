Home☆Star Runner
==============

# Installation

You'll need to have Node-JS installed on your computer,
[in whatever the usual way for you is](http://nodejs.org/download/).

## Package

Run:

    $ sudo npm install -g homestar
    $ npm link homestar

## Configuration

Run:

    $ homestar setup

## Integrate with HomeStar.io

Then:

* go to: https://homestar.io
* sign in / create an account
* go to: https://homestar.io/runners/add
* follow the instructions (basically, copy and paste some commands)

# Running

    $ homestar runner | homestar pretty

The home page will be brought up in your browser. 
<code>homestar pretty</code> makes the output more readable.

# Getting new recipies

# Important Settings

## Change the name of my server as it appears on HomeStar.io

    homestart set homestar/runner/name "StrongBad"

## Don't open webpage 

    homestart set homestar/runner/open_browser 0 --boolean

## Change http port

    homestart set homestar/runner/webserver/port 4567 --integer

## Change latitude / longitude

Your latitude and longitude are used to determine solar events,
such as sunrise and sunset. Read more about this [here](https://github.com/dpjanes/iotdb-timers).

    homestart set homestar/runner/location/latitude 43.7387 --number
    homestart set homestar/runner/location/longitude -79.4337 --number

Note that <code>homestar setup</code> automatically sets pretty good values for these.
