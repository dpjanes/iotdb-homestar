var js = {
    is_mobile: false,

    on_load: function() {
        js.is_mobile = navigator.userAgent.match(/Mobi/) ? true : false;
        if (js.is_mobile) {
            $('body').addClass("mobile");
        } else {
            $('body').addClass("desktop");
        }

        js.interactors.on_load();
        js.general.on_load();
        js.transport.on_load();
        js.mqtt.on_load();

        $('[data-toggle="popover"]').popover({
            html: true
        });
    },

    interactors: {
        on_load: function() {
            for (var interactor_name in js.interactors) {
                var interactor_js = js.interactors[interactor_name];
                if (interactor_js.on_load) {
                    try {
                        interactor_js.on_load();
                    } catch (x) {
                        console.log("js.interactors.on_load", "unexpected exception", interactor_name, x);
                    }
                }
            }
        },

        update: function(id, value) {
            for (var interactor_name in js.interactors) {
                var interactor_js = js.interactors[interactor_name];
                if (interactor_js.update) {
                    var rd = rdd[id];
                    if (rd.interactor !== interactor_js.name) {
                        continue
                    }

                    try {
                        interactor_js.update(id, rd.state, {
                            interactor: rd.interactor,
                            out: rd.out,
                            in: rd.in
                        });
                    } catch (x) {
                        console.log("js.interactors.update", "unexpected exception", interactor_name, x);
                    }
                }
            }
        },

        end: 0
    },

    mqtt: {
        connected: null,
        notify_lost: null,

        topic_prefix: "",
        host: settingsd.mqttd.host,
        port: settingsd.mqttd.port,
        websocket: settingsd.mqttd.websocket,

        client_when: 0,
        client: null,

        on_load: function() {
            js.mqtt.init();
        },

        init: function() {
            js.mqtt.topic_prefix = settingsd.mqttd.prefix.replace(/[\/]*$/, '') 
            js.mqtt.client = new Messaging.Client(
                js.mqtt.host, 
                js.mqtt.websocket,
                "home" + ("" + Math.random()).substring(2)
            );
            js.mqtt.client.onConnectionLost = js.mqtt.onConnectionLost;
            js.mqtt.client.onMessageArrived = js.mqtt.onMessageArrived;

            var connectd = {
                timeout: 3,
                keepAliveInterval: 60,
                cleanSession: true,
                useSSL: false,

                onSuccess:js.mqtt.onConnect,
                onFailure:js.mqtt.onFailure
            }

            console.log("- js.mqtt.init", "calling websocket connect", 
                js.mqtt.host, 
                js.mqtt.websocket)
            js.mqtt.client_when = new Date().getTime();
            js.mqtt.client.connect(connectd);
        },

        reconnect : function() {
            /*
             *  Don't rush reconnects
             */
            var delta = new Date().getTime() - js.mqtt.client_when;
            var min = ( 10 * 1000 ) - delta;
            if (min > 0) {
                console.log("- js.mqtt.reconnect", "will reconnect", "when=", min);
                setTimeout(js.mqtt.init, min);
            } else {
                console.log("- js.mqtt.reconnect", "will reconnect now");
                js.mqtt.init();
            }
        },

        onFailure : function(reason) {
            console.log("# js.mqtt.onFailure", reason);
            js.mqtt.reconnect();
        },

        onConnect : function() {
            var topic = js.mqtt.topic_prefix + "/api/#";
            console.log("- js.mqtt.onConnect", topic);
            js.mqtt.client.subscribe(topic);

            if (js.mqtt.connected === false) {
                if (js.mqtt.notify_lost) {
                    js.mqtt.notify_lost.close();
                    js.mqtt.notify_lost = null;
                }

                $.notify({
                    message: 'Connection Restored'
                }, {
                    delay: 3000,
                    placement: {
                        align: 'left'
                    }
                });
            }

            js.mqtt.connected = true;
        },

        onConnectionLost : function(responseObject) {
            console.log("# js.mqtt.onConnectionLost", responseObject);
            if (responseObject.errorCode !== 0) {
                console.log("# js.mqtt.onConnectionLost", responseObject.errorMessage);
            }
            js.mqtt.reconnect();

            if (js.mqtt.connected) {
                if (js.mqtt.notify_lost) {
                    js.mqtt.notify_lost.close();
                    js.mqtt.notify_lost = null;
                }

                js.mqtt.connected = false
                js.mqtt.notify_lost = $.notify({
                    title: 'Connection Error',
                    message: 'Connect to server seems to be interrupted - possible network error?',
                }, {
                    type: 'danger',
                    delay: 0,
                    placement: {
                        align: 'left'
                    }
                });
            }
        },

        onMessageArrived : function(message) {
            var topic_local = message.destinationName.substring(js.mqtt.topic_prefix.length);
            console.log("- js.mqtt.onMessageArrived", 
                "payload=", message.payloadString, 
                "topic=", message.destinationName,
                "local=", topic_local
            );

            var parts = topic_local.match(/\/api\/(recipes|things)\/(urn:[^\/]+)\/(istate|ostate|meta|model|status)/);
            if (!parts) {
                console.log("?no match?");
                return;
            }

            var payload = JSON.parse(message.payloadString);
            var what = parts[1];
            var thing_id = parts[2];
            var band = parts[3];

            console.log("+ mqtt", what, thing_id, band);
            js.transport.updated(thing_id, band, payload);
        },	

        end: 0
    },

    /*
    actions: {
        on_load: function() {
        },

        send: function(element) {
            var id = element.data("id");
            var rd = rdd[id];
            if (!rd) {
                alert("sorry, can't find this recipe?");
                return;
            }

            var out_key = element.data("out");
            if (!out_key) {
                out_key = element.parents("li").data("out");
            }
            if (!out_key) {
                out_key = "value";
            }

            var value = element.data("value");
            if (value === undefined) {
                value = "";
            }

            var requestd = {};
            requestd[out_key] = value;
            // console.log(requestd);

            var paramd = {
                type : 'PUT',
                url : rd.api.url,
                data: JSON.stringify(requestd),
                contentType: "application/json",
                dataType : 'json',
                error : function(xhr, status, error) {
                    alert("" + rd.api.url + "\n" + status + ": " + error);
                    $('li.interactor-item').removeClass('running');
                },
                success : function(data, status, xhr) {
                    console.log("success", data);
                    if (!data.running) {
                        $('li.interactor-item').removeClass('running');
                    }
                },
            };

            // $('li.interactor-item').removeClass('running');
            element.addClass('running');

            $.ajax(paramd);
        },


        on_message: function(section, id, d) {
            var e_li = $('li[data-id="' + id + '"]');
            if (d.message !== undefined) {
                e_li.find(".interactor-message").text(d.message);
            }

            if (d.running !== undefined) {
                if (d.running) {
                    e_li.addClass('running');
                } else {
                    e_li.removeClass('running');
                    e_li.find(".interactor-message").text("");
                }
            } 

            if (d.state !== undefined) {
                if (d.state._text) {
                    e_li.find(".interactor-state").text(d.state._text || "");
                } else if (d.state._html) {
                    e_li.find(".interactor-state").text(d.state._html);
                } else if (d.state._number) {
                    e_li.find(".interactor-state").text("" + d.state._number);
                }

                var rd = rdd[id];
                if (rd) {
                    for (var key in d.state) {
                        rd.state[key] = d.state[key];
                    }

                    js.interactors.update(id, rd.state, {
                        out: rd.out,
                        in: rd.in
                    });
                }
            }

        },

        end: 0
    },
    */

    general: {
        on_load: function() {
            for (var thing_id in thingdd) {
                var td = thingdd[thing_id];

                js.general._updater(thing_id, js.transport.connect(thing_id, "status"));
            }
        },

        _updater: function(thing_id, transporter) {
            transporter.on_update(function(status) {
                var e_li = $('li[data-thing="' + thing_id + '"]');

                if (status.message !== undefined) {
                    e_li.find(".interactor-message").text(status.message);
                }

                if (status.running !== undefined) {
                    if (status.running) {
                        e_li.addClass('running');
                    } else {
                        e_li.removeClass('running');
                        e_li.find(".interactor-message").text("");
                    }
                } 

                if (status.text) {
                    e_li.find(".interactor-state").text(status.text || "");
                } else if (status.html) {
                    e_li.find(".interactor-state").text(status.html);
                } else if (status.number) {
                    e_li.find(".interactor-state").text("" + status.number);
                }
            });
        },

        end: 0
    },
    
    /**
     *  Implement the 'transport' pattern
     */
    transport: {
        events: {},

        bandd: function(thing_id, band) {
            var td = thingdd[thing_id];
            if (!td) {
                td = {};
                thingdd[thing_id];
            }
            
            var bd = td[band];
            if (!bd) {
                bd = {};
                td[band] = bd;
            }

            return bd;
        },

        on_load: function() {
            for (var thing_id in thingdd) {
                var td = thingdd[thing_id];

                js.transport.updated(thing_id, "istate", td.istate);
                js.transport.updated(thing_id, "ostate", td.ostate);
                js.transport.updated(thing_id, "meta", td.meta);
                js.transport.updated(thing_id, "model", td.model);
                js.transport.updated(thing_id, "status", td.status);
            }
        },

        updated: function(thing_id, band, d) {
            if (d === undefined) {
                return;
            }

            var bd = js.transport.bandd(thing_id, band)

            /* this needs to be revisited - we expect all the state? */
            /* td[band] = d; */
            for (var dkey in d) {
                var dvalue = d[dkey];
                bd[dkey] = dvalue;
            }

            var event_id = thing_id + "/" + band;
            var listeners = js.transport.events[event_id];
            if (listeners) {
                for (var li in listeners) {
                    var listener = listeners[li];
                    listener(d);
                }
            }

            console.log("+ updated", thing_id, band);
        },

        connect: function(thing_id, band) {
            var _send = function(bd) {
                var url = bd["@id"];
                bd = _.clone(bd);
                delete bd["@id"];
                delete bd["@context"];

                $.ajax({
                    type : 'PUT',
                    url: url,
                    data: JSON.stringify(bd),
                    contentType: "application/json",
                    dataType : 'json',
                    error : function(xhr, status, error) {
                        console.log(error);
                    },
                    success : function(data, status, xhr) {
                        console.log("success", data);
                    },
                });
            };

            var _patch = function(d) {
                var bd = js.transport.bandd(thing_id, band);

                /* this keeps our data up-to-date */
                for (var dkey in d) {
                    if ((dkey === "@id") || (dkey === "@context")) {
                        continue;
                    }

                    bd[dkey] = d[dkey];
                }

                /* NOTE: NOT send 'bd' - we are just sending the updated data */
                d["@id"] = bd["@id"];
                _send(d);
            };

            var _update = function(d) {
                var bd = js.transport.bandd(thing_id, band);

                /* remove all existing data from our database */
                for (var bkey in bd) {
                    if ((dkey === "@id") || (dkey === "@context")) {
                        continue;
                    }

                    delete bd[bkey];
                }

                /* add the new data to our database */
                for (var dkey in d) {
                    if ((dkey === "@id") || (dkey === "@context")) {
                        continue;
                    }

                    bd[dkey] = d[dkey];
                }

                /* send the _whole_ record */
                _send(bd);
            };

            var _on_update = function(f) {
                var event_id = thing_id + "/" + band;
                var listeners = js.transport.events[event_id];
                if (listeners === undefined) {
                    listeners = [];
                    js.transport.events[event_id] = listeners;
                }

                listeners.push(f);
            };

            return {
                patch: _patch,
                update: _update,
                on_update: _on_update
            };
        },

        end: 0
    },

    end: 0
};

$(document).ready(js.on_load);

