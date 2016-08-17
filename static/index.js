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
        js.longpoll.on_load();

        $('[data-toggle="popover"]').popover({
            html: true
        });
    },

    interactors: {
        on_load: function() {
            _.mapObject(js.interactors, function(interactor_js, interactor_name) {
                if (!interactor_js.on_load) {
                    return;
                }

                try {
                    interactor_js.on_load();
                } catch (x) {
                    console.log("js.interactors.on_load", "unexpected exception", interactor_name, x);
                }
            });
        },

        update: function(id, value) {
            _.mapObject(js.interactors, function(interactor_js, interactor_name) {
                if (!interactor_js.update) {
                    return;
                }

                    var rd = rdd[id];
                if (rd.interactor !== interactor_js.name) {
                    return;
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
            });
        },

        end: 0
    },

    longpoll: {
        on_load: function() {
            js.longpoll.init();
        },

        init: function() {
            js.longpoll.poll();
        },

        poll: function() {
            console.log("+", "js.longpoll.poll", "called");
            var see_error = false;

            $.ajax({
                type : 'GET',
                url: "/api/things/.longpoll",
                contentType: "application/json",
                dataType : 'json',
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                },
                timeout: 30 * 1000,
                error : function(xhr, status, error) {
                    console.log("#", "js.longpoll.poll/error", status, error);
                    if (error === "timeout") {
                        setTimeout(function() { 
                            js.longpoll.poll(); 
                        }, 250);
                    } else {
                        js.notify.disconnected();
                        see_error = true;

                        setTimeout(function() { 
                            js.longpoll.poll(); 
                        }, 5 * 1000);
                    }
                },
                success : function(data, status, xhr) {
                    console.log("+", "js.longpoll.poll/sucess", data);
                    js.notify.connected();
                    js.longpoll.dispatch(data);
                    setTimeout(function() { 
                        js.longpoll.poll(); 
                    }, 250);
                }
            });

            setTimeout(function() {
                if (!see_error) {
                    js.notify.connected();
                }
            }, 6 * 1000);
        },

        dispatch: function(d) {
            _.keys(d)
                .forEach(function(url) {
                    var ud = d[url];
                    var parts = url.split("/");
                    if ((parts.length !== 5) || (parts[0] !== "") || (parts[1] !== "api") || (parts[2] != "things")) {
                        console.log("#", "js.longpoll.dipatch", "unexpected url", url);
                        return;
                    }

                    var id = parts[3];
                    var band = parts[4];

                    js.transport.updated(id, band, ud);
                    console.log(id, band, ud);
                });
        },

        end: 0
    },

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

    notify: {
        is_connected: false,
        notify_lost: null,

        connected : function() {
            if (js.notify.is_connected) {
                return;
            }

            if (js.notify.notify_lost) {
                js.notify.notify_lost.close();
                js.notify.notify_lost = null;
            }

            $.notify({
                message: 'Connection Restored'
            }, {
                delay: 3000,
                placement: {
                    align: 'left'
                }
            });

            js.notify.is_connected = true;
        },

        disconnected : function(responseObject) {
            if (!js.notify.is_connected) {
                return;
            }

            if (js.notify.notify_lost) {
                js.notify.notify_lost.close();
                js.notify.notify_lost = null;
            }

            js.notify.notify_lost = $.notify({
                title: 'Connection Error',
                message: 'Connect to server seems to be interrupted - possible network error?',
            }, {
                type: 'danger',
                delay: 0,
                placement: {
                    align: 'left'
                }
            });

            js.notify.is_connected = false
        }, 

        end: 0
    },

    end: 0
};

$(document).ready(js.on_load);

