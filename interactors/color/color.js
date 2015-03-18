js.interactors.color = {
    name: "color",
    supress: false,
    
    on_load: function() {
        $('li[data-interactor="color"]')
            .each(js.interactors.color.add)
            ;
    },

    add: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        var ostate_transporter = js.transport.connect(thing_id, "ostate");
        var control_visible = false;

        var minicolors = e.find('.wrapper')
            .minicolors({
                position: js.is_mobile ? 'top left': 'bottom right',
                changeDelay: 60,
                show: function() {
                    control_visible = true;
                },
                hide: function() {
                    control_visible = false;
                },
                change: function(hex, opactity) {
                    if (js.interactors.color.supress) {
                        js.interactors.color.supress = false;
                        return;
                    }

                    $(this)
                        .parents("li")
                        .data("value", hex)
                        .attr("data-value", hex)
                        .each(function(index, element) {
                            console.log("HERE:COLOR-OUT", thing_id, attribute_code, hex);

                            var d = {};
                            d[attribute_code] = hex;

                            ostate_transporter.patch(d);
                        })
                    },
            });

        /* only show external updates while the control is not visible */
        var istate_transporter = js.transport.connect(thing_id, "istate");
        istate_transporter.on_update(function(d) {
            if (control_visible) {
                return;
            }

            var value = d[attribute_code];
            if (value !== undefined) {
                minicolors.minicolors('value', value);
            }
        });

        /*
        try {
        } catch(x) {
        }
        */


        /*
        var transporter = js.transport.connect(thing_id, "istate");
        transporter.on_update(function(d) {
            var value = d[attribute_code];
            if (value === undefined) {
                return;
            }

            if ((typeof value) === "color") {
                value = value ? 1 : 0;
            }

            try {
                e.find('button').removeClass("selected");
                e.find('button[data-value="' + value + '"]').addClass("selected");
            } catch(x) {
                console.log("#", "interactors.color", x);
            }
        });
        */
    },

    /* this sets up the click handler */
/*
    add_click: function(e) {
        var e = $(this);

        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        var transporter = js.transport.connect(thing_id, "ostate");
        e.find("button")
            .on("click", function() {
                var value = $(this).data("value");

                var updated = {};
                updated[attribute_code] = ((value === 1) || (value === "1")) ? true : false;

                transporter.patch(updated);
            });
    },

        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute")
            .each(js.interactors.color.add_wrapper)
            ;
    },
    add_wrapper: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        e
            .find('.wrapper')
            .minicolors({
                position: js.is_mobile ? 'top left': 'bottom right',
                changeDelay: 60,
                change: function(hex, opactity) {
                    if (js.interactors.color.supress) {
                        js.interactors.color.supress = false;
                        return;
                    }

                    $(this)
                        .parents("li")
                        .data("value", hex)
                        .attr("data-value", hex)
                        .each(function(index, element) {
                            console.log("HERE:COLOR", thing_id, attribute_code, hex);
                            // js.actions.send($(element));
                        })
                    },
            });
    },

    update: function(id, state, rd) {
        var value;
        if (rd.in) {
            value = state[rd.in];
        } else if (rd.out) {
            value = state[rd.out];
        }

        if (!value) {
            return;
        }

        try {
            js.interactors.color.supress = true;
            $('li[data-id="' + id + '"] .interactor-interactor .wrapper')
                .minicolors('value', value)
                ;
        } catch(x) {
        }
    },
    */

    end: 0
};
