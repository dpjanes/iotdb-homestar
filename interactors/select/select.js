js.interactors.select = {
    name: "select",

    on_load: function() {
        $('li[data-interactor="select"]')
            .each(js.interactors.select.add)
            ;
    },

    add: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");
        var instantaneous = e.data("instantaneous");

        var e_select = e.find("select");
        e_select.select2();

        // listen for external changes to the select
        var istate_transporter = js.transport.connect(thing_id, "istate");
        istate_transporter.on_update(function(d) {
            var value = d[attribute_code];
            if (value === undefined) {
                return;
            }

            try {
                e_select.val(value);
                e_select.select2();
            } catch(x) {
                console.log("#", "interactors.select", x);
            }
        });

        // handle user updates
        var ostate_transporter = js.transport.connect(thing_id, "ostate");
        e_select
            .on("change", function() {
                var value = e_select.val();
                if (value === "-") {
                    return
                }

                var updated = {};
                updated[attribute_code] = value;

                if (instantaneous === 1) {
                    try {
                        e_select.val("-");
                        e_select.select2();
                    } catch(x) {
                        console.log("#", "interactors.select", x);
                    }
                }

                ostate_transporter.patch(updated);
            });
    },

    end: 0
};
