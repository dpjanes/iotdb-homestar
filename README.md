Home☆Star Runner
==============

# Installation

You'll need to have Node-JS installed on your computer,
[in whatever the usual way for you is](http://nodejs.org/download/).

## Package

    $ sudo npm install -g homestar
    $ npm link homestar

## Configuration (1)

    $ homestar setup

## Integrate with HomeStar.io

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
