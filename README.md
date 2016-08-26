# Home☆Star

# About

Home☆Star is three things:

* it's the command line management utilities for [IOTDB](https://github.com/dpjanes/node-iotdb)
* it makes a web interface / API to your Things (if you want it)
* it's a naming convention for all IOTDB Bridges, e.g. homestae-hue

To find out more

* [IOTDB docs](https://github.com/dpjanes/node-iotdb/blob/master/docs/)
* [Read about Home☆Star](https://github.com/dpjanes/node-iotdb/blob/master/docs/homestar.md)
* [Read about installing Home☆Star](https://github.com/dpjanes/node-iotdb/blob/master/docs/homestar.md) 

# Installation and Configuration

TL;DR:

    $ npm install -g homestar    ## may require sudo
    $ homestar setup

# Use
## Web Interface

To run the web interface

    $ homestar runner

You'll want to edit the file `boot/index.js` to add your Things.
If you haven't installed any Things yet, see [Bridges](https://github.com/dpjanes/node-iotdb/blob/master/docs/bridges.md).

## Setup

This only needs to be run once.

    $ homestar setup

It will:

    * set up the `./boot` folder, so you can define whatever Things you want to be loaded into `homestar runner`
    * set up the `./.iotdb` folder, for local configuration
    * install in `./node_modules` all IOTDB modules needed

## Update

This will pull new version of HomeStar and IOTDB modules in `./node_modules`.

    $ homestar update

## Configuration

Some Bridges (code that talks to Things) require configuration, e.g. to do pairing,
adding API keys, etc.. If this is so, it will be mentioned in the README for the Bridge module.

e.g. here's how you do it

    $ homestar configure homestar-hue

## Settings

This will modify values in `./.iotdb/keystore.json`, the local configuration.

e.g.

    homestar set browser 0                      ## don't open the browser
    homestar set name "name for this system"
