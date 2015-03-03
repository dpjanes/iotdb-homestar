# Installation

## Node.JS

You'll need to have Node-JS installed on your computer,
[in whatever the usual way for you is](http://nodejs.org/download/).

## Initial setup

Run:

    $ npm install -g homestar
    $ homestar setup
    
The <code>homestar</code> package provides all the management functions, the 
<code>iotdb</code> package is the actual code.

## Upgrading from a previous version

Run:

    $ npm upgrade -g homestar
    $ homestar iotdb

## Configuration

This command

    $ homestar setup

will store some interesting values in <code>.iotdb/keystore.json</code> and try to figure out your geographic location. It will also install
any IOTDB Modules needed.

## Integrate with HomeStar.io

Then:

* go to: https://homestar.io
* sign in / create an account
* go to: https://homestar.io/runners/add
* follow the instructions - basically, copy and paste some commands

[HomeStar.io](https://homestar.io) provides a user authentication layer for you so you can decide who's allowed to use what

