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

    $ homestar runner

The home page will be brought up in your browser. If you don't wa

# Getting new recipies

# Important Settings

## Don't open webpage 

    homestart set homestar/runner/open_browser 0 --boolean

## Change http port

    homestart set homestar/runner/webserver/port 4567 --integer
