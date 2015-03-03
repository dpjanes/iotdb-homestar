# Home☆Star Runner

## Configuration

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
