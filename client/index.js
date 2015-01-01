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

        for (var rdi in recipedd) {
            var rd = recipedd[rdi];
            js.actions.on_message(rd.id, {
                running: rd.running,
                message: rd.message,
                state: rd.state
            });
        }
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

            var parts = topic_local.match(/\/api\/cookbook\/([0-9a-f]+)/);
            if (parts) {
                js.actions.on_message(parts[1], JSON.parse(message.payloadString));
                return;
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
            var id = $(this).data("id");

            var value = $(this).data("value");
            if (!value) {
                value = (new Date()).toISOString();
            }
            var requestd = {
                value: value
            };
            console.log(requestd);

            var paramd = {
                type : 'PUT',
                url : '/api/cookbook/' + id,
                data: JSON.stringify(requestd),
                contentType: "application/json",
                dataType : 'json',
                error : js.actions.on_failure,
                success : js.actions.on_success,
            };

            // $('li.action-item').removeClass('running');
            $(this).addClass('running');

            $.ajax(paramd);
        },

        on_success: function(data, status, xhr) {
            console.log("success", data);
            if (!data.running) {
                $('li.action-item').removeClass('running');
            }
        },

        on_failure: function(xhr, status, error) {
            alert(status + ": " + error);
            $('li.action-item').removeClass('running');
        },

        on_message: function(id, d) {
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
                e_li.find(".action-state").text(d.state.message || "");
            }
        },

        end: 0
    },

    end: 0
};

$(document).ready(js.on_load);

