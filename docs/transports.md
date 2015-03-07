# Home☆Star Runner

## Transports

This is an idea for a future feature. 

Transports are responsible for moving state
across the network. So for example, if you
had a Runner in one location you could
use a transport to access all of the state
in a remote location.

We could also use this for getting e.g. 
data from SmartThings

### Elements of the Transport

* the ID
* the UpdateID
* the Sender
* the Band - ostate, istate, meta
* the Data

The ID would ideally correspond to the thing.thing_id()
but does not necessarily have to. I think a 1-1 mapping
would be required

The UpdateID can be a number or string that monotonically
increases. For each band, everyone can ignore values 
lower than the previous UpdateID. Ideally this would be a
timestamp.k

The Sender is some string

The Band is a string, typically "ostate", "istate", or "meta"
though theoretically it could be something else.

The Data is JSON.

###

    transport.push({
        id: 
        updateID:
        sender:
        band:
        data:
    })

    transport.on("istate", function(d) {
    });
