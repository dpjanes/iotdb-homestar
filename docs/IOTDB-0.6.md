# Home☆Star Runner
## Changes for IOTDB 0.6.X

### Thing.state(band)

This is one of the three really big changed: every Thing.state() call takes a band that can be "istate", "ostate", "model" or "meta" to get the appropriate band of data:

* istate: the "actual" state of Thing, as far as we know
* ostate: the state we'd like the Thing to become
* model: the JSON-LD model for the Thing (compacted)
* meta: the Metadata for the Thing (compacted)

There's no longer any need to access the "meta()" object to manipulate the metadata and in fact in the future it may be removed.

### Thing.update(band, …)

The second big change is that update() also takes a band argument. Note that the "model" cannot be updated on the fly.

### ostate

The final big change is whenever you make an "ostate" change, once it has been delivered the Bridge all the values are set back to "null". This allows commands to be re-issued.

### iot:place-*

All references to old IOTDB Place objects are gone. We now just use Zones.

### cleanup: underscore.js

Wherever possible, we are moving references to our own functions on top of the '_' namespace into sub-objects (defined in folder "helpers")

In particular, look for functions called "_.is.Array", "_.is.Date" etc.

### cleanup: drivers

All references to Drivers are removed: we now use Bridges

### cleanup: Model

- remove model inheritance
- Things are no longer identified by a "identity()" object. Instead, they simply have a "thing_id()".
- remove validators

### Parameter Checking

We've added many functions to check the parameters and through exceptions if they are incorrct

### Access via function

Access .name, .description, .help and .code are now all done through functions of the same name

### cleanup: Bridges

All Bridges are now subclasses of "iotdb.Bridge"

