iotdb-homestar
==============

IOTDB Script Runner / Web Interface

### Settings

<code>.iotdb/keystore</code should look something like this 

    {
      "homestar": {
        "client": {
          "open_browser": false,
          "webserver": {
            "secret": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          },
          "homestar": {
            "api_key": "XXXXXXXXXXXXXXXXXXXXXX",
            "api_secret": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          }
        }
      }
    }

This can be set up with the following commands

    $ iotdb set homestar/client/webserver/secret 0 --uuid
    $ iotdb set homestar/client/homestar/api_key "the key"
    $ iotdb set homestar/client/homestar/api_secret "the secret"

