# Home☆Star Runner

## Additional Modules

Note how we are using <code>homestar install</code> and not
<code>npm install</code>.

### Bluetooth Low Energy

	$ homestar install homestar-ble

### Feeds (Atom and RSS)

	$ homestar install homestar-feed

### Denon Audio/Video Receiver

	$ homestar install homestar-denon-avr

### Firmata (Arduino)  

_Note not working yet_

	$ homestar install homestar-feed

### LG Smart TV 

	$ homestar install homestar-lg-smart-tv

### LIFX 

	$ homestar install homestar-lifx

### Philips Hue 

	$ homestar install homestar-hue
	$ homestar configure homestar-hue

### SmartThings

_Note not working yet. Almost!_

	$ homestar install homestar-smart-things
	$ homestar configure homestar-smart-things

### TCP Lighting

_Note not working yet._

	$ homestar install homestar-tcp
	$ homestar configure homestar-tcp

### WeMo 

	$ homestar install homestar-wemo


# Running

    $ homestar runner | homestar pretty

The home page will be brought up in your browser. 
<code>homestar pretty</code> makes the output more readable.

# Getting new recipes

    homestar browse

# Important Settings

## Change the name of my server as it appears on HomeStar.io

    homestar set name "StrongBad"

## Don't open webpage 

    homestar set browser 0 --boolean

(you can also change this at runtime)

    homestar runner browser=0

## Change http port

    homestar set webserver/port 4567 --integer

## Change latitude / longitude

Your latitude and longitude are used to determine solar events,
such as sunrise and sunset. Read more about this [here](https://github.com/dpjanes/iotdb-timers).

    homestar set location/latitude 43.7387 --number
    homestar set location/longitude -79.4337 --number

Note that <code>homestar setup</code> automatically sets pretty good values for these.
