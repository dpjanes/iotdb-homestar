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

        var e_minicolors = e.find('.wrapper');
        e_minicolors
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
                e_minicolors.minicolors('value', value);
            }
        });
    },

    end: 0
};
