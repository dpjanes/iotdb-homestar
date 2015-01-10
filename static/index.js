var js = {
    is_mobile: false,

    on_load: function() {
        js.is_mobile = navigator.userAgent.match(/Mobi/) ? true : false;
        if (js.is_mobile) {
            $('body').addClass("mobile");
        } else {
            $('body').addClass("desktop");
        }
        js.actions.on_load();
        js.mqtt.on_load();

        // set up initial state
        for (var rdi in rdd) {
            var rd = rdd[rdi];
            js.actions.on_message(rd.section || "cookbook", rd.id, {
                running: rd.running,
                message: rd.message,
                state: rd.state
            });
        }

        // setup interactors
        js.interactors.on_load();
    },

    interactors: {
        on_load: function() {
            js.interactors.color.on_load();
        },

        update: function(id, value) {
            js.interactors.color.update(id, value);
        },

        color: {
            on_load: function() {
                $('.interactor.interactor-color')
                    .colorpicker({
                        component: '.box',
                        horizontal: true
                    })
                    .on('changeColor', function(event) {
                        $(event.target)
                            .parents("li")
                            .data("value", event.color.toHex())
                            .attr("data-value", event.color.toHex())
                            .each(function(index, element) {
                                js.actions.send($(element));
                            })
                    })
                    /* .on('create', function(event) {
                        console.log("ARGUMENTS", event);
                    }) 
                    .each(function(_index, element) {
                        console.log("ARGUMENTS", $(element).colorpicker({
                            color: "#FF0000"
                        }))
                    })*/
                    ;
            },

            update: function(id, color) {
                if (color === null) {
                    return
                }

                $('li[data-id="' + id + '"] .interactor.interactor-color')
                    .each(function(_index, _element) {
                        console.log("HERE:A", color);
                        var e = $(_element);
                        var c = e.data("colorpicker");
                        if (!c) {
                            return;
                        }

                        c = e.colorpicker({
                            'setValue': color
                        })

                        console.log("HERE:B", c);
                        // c.setColor(color);
                        // var cp = $(_element).colorpicker();
                    });
            },

            end: 0
        },

        end: 0
    },

    mqtt: {
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
        },

        onConnectionLost : function(responseObject) {
            console.log("# js.mqtt.onConnectionLost", responseObject);
            if (responseObject.errorCode !== 0) {
                console.log("# js.mqtt.onConnectionLost", responseObject.errorMessage);
            }
            js.mqtt.reconnect();
        },

        onMessageArrived : function(message) {
            var topic_local = message.destinationName.substring(js.mqtt.topic_prefix.length);
            console.log("- js.mqtt.onMessageArrived", 
                "payload=", message.payloadString, 
                "topic=", message.destinationName,
                "local=", topic_local
            );

            var parts = topic_local.match(/\/api\/(cookbook|things)\/(urn:[:0-9a-z]+)/);
            if (!parts) {
                console.log("?no match?");
            } else {
                var payload = JSON.parse(message.payloadString);
                js.actions.on_message(parts[1], parts[2], payload);

                if ((parts[1] === "things") && payload.state) {
                    for (var key in payload.state) {
                        js.actions.on_message(parts[1], parts[2] + "/#" + key, payload);
                    }
                }
            }
        },	

        end: 0
    },

    actions: {
        on_load: function() {
            $('.action-item').on('click', js.actions.on_click);
            $('li.action-item').on('touchstart', js.actions.on_touchstart);
            $('li.action-item').on('touchend', js.actions.on_touchend);
        },

        on_touchstart: function(e) {
            $(this).addClass("touched");
        },

        on_touchend: function(e) {
            $(this).removeClass("touched");
        },

        on_click: function(e) {
            js.actions.send($(this));
        },

        send: function(element) {
            var id = element.data("id");
            var rd = rdd[id];
            if (!rd) {
                alert("sorry, can't find this recipe?");
                return;
            }

            var key = element.data("key");
            if (!key) {
                key = "value";
            }

            var value = element.data("value");
            if (!value) {
                value = (new Date()).toISOString();
            }

            var requestd = {};
            requestd[key] = value;
            // console.log(requestd);

            var paramd = {
                type : 'PUT',
                url : rd.api.url,
                data: JSON.stringify(requestd),
                contentType: "application/json",
                dataType : 'json',
                error : function(xhr, status, error) {
                    alert("" + rd.api.url + "\n" + status + ": " + error);
                    $('li.action-item').removeClass('running');
                },
                success : function(data, status, xhr) {
                    console.log("success", data);
                    if (!data.running) {
                        $('li.action-item').removeClass('running');
                    }
                },
            };

            // $('li.action-item').removeClass('running');
            element.addClass('running');

            $.ajax(paramd);
        },


        on_message: function(section, id, d) {
            var e_li = $('li[data-id="' + id + '"]');
            if (d.message !== undefined) {
                e_li.find(".action-message").text(d.message);
            }

            if (d.running !== undefined) {
                if (d.running) {
                    e_li.addClass('running');
                } else {
                    e_li.removeClass('running');
                    e_li.find(".action-message").text("");
                }
            } 

            if (d.state !== undefined) {
                if (d.state._text) {
                    e_li.find(".action-state").text(d.state._text || "");
                } else if (d.state._html) {
                    e_li.find(".action-state").text(d.state._html);
                } else if (d.state._number) {
                    e_li.find(".action-state").text("" + d.state._number);
                }

                var rd = rdd[id];
                if (rd) {
                    for (var key in d.state) {
                        rd.state[key] = d.state[key];
                    }

                    if (rd.key) {
                        js.interactors.update(id, rd.state[rd.key]);
                    }
                }
            }

        },

        end: 0
    },

    end: 0
};

$(document).ready(js.on_load);

