js.interactors.boolean = {
    name: "boolean",

    on_load: function() {
        $('li[data-interactor="boolean"]')
            .each(js.interactors.boolean.add)
            ;
    },

    add: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        /* this listens for updates */
        var istate_transporter = js.transport.connect(thing_id, "istate");
        istate_transporter.on_update(function(d) {
            var value = d[attribute_code];
            if (value === undefined) {
                return;
            }

            if ((typeof value) === "boolean") {
                value = value ? 1 : 0;
            }

            try {
                e.find('button').removeClass("selected");
                e.find('button[data-value="' + value + '"]').addClass("selected");
            } catch(x) {
                console.log("#", "interactors.boolean", x);
            }
        });

        /* this sets up the click handler */
        var ostate_transporter = js.transport.connect(thing_id, "ostate");
        e.find("button")
            .on("click", function() {
                var value = $(this).data("value");

                var updated = {};
                updated[attribute_code] = ((value === 1) || (value === "1")) ? true : false;

                ostate_transporter.patch(updated);
            });
    },

    end: 0
};
