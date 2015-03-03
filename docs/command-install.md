# Modules

IOTDB / HomeStar has it's own module / package system, wrapping <code>npm</code>.

This is modelled on Atom (the editor), which does something similar though I don't know the exact mechanism they use and was suggested to me by Neil Bartlett.

## Why?

IOTDB needs to know what IOTDB Modules are installed, to load certain information when it starts up. 

* Bridge and Model information are automatically loaded into IOTDB
* the function <code>setup()</code>, if it exists, is called

It also needs to have a clean and consistent view of what modules are available. For example, we only want to have one version of <code>iotdb-upnp</code> running.

## Technical Details

When you run <code>homestar install [package]</code>, it does the following:

* runs <code>npm install</code> on that [package]
* looks at all the sub-packages NPM installed. If they're IOTDB Modules, it will _remove_ them and reinstall at the current level
* it will add the installed modules to <code>.iotdb/keystore.json</code> in a dictionary called <code>modules</code>. Go look at it!

At IOTDB startup the current directory's <code>keystore.json</code> and your home directory's <code>keystore.json</code> are merged, in that priority. If you want a IOTDB Module available to everything, install it in your home directory.

## Creating new IOTDB Modules

Model it on existing packages. Typically you need to (and should only) do this for Models, Bridges, and Interactors. There may be more stuff coming in the future.

We do have IOTDB Modules for certain low-level core functions. For example, <code>iotdb-upnp</code>. You will almost certainly never need to do this. Just require a package you're using, e.g. <code>unirest</code> and let NPM handle it. You only need make an IOTDB Module if there's a _global_ reason everyone cares that the same thing is installed.

## FAQ
### What is a IOTDB Module?

A homestar module is an NPM module with a file called <code>homestar.json</code> in it. That file should contain (at least)

	{
		"module": true
	}

### Why is it called IOTDB Module and not IOTDB Package.

D'oh.

### What's the difference between IOTDB and HomeStar

IOTDB is the node code programmers work with. HomeStar is the management around it.


