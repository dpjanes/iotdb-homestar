js.interactors.enumeration = {
    name: "enumeration",

    on_load: function() {
        $('li[data-interactor="enumeration"]')
            .each(js.interactors.enumeration.add_transporter)
            .each(js.interactors.enumeration.add_click)
            ;
    },

    /* this listens for updates */
    add_transporter: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        var transporter = js.transport.connect(thing_id, "istate");
        transporter.on_update(function(d) {
            var value = d[attribute_code];
            if (value === undefined) {
                return;
            }

            try {
                e.find('button').removeClass("selected");
                e.find('button[data-value="' + value + '"]').addClass("selected");
            } catch(x) {
                console.log("#", "interactors.enumeration", x);
            }
        });
    },

    /* this sets up the click handler */
    add_click: function(e) {
        var e = $(this);

        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        var transporter = js.transport.connect(thing_id, "ostate");
        e.find("button")
            .on("click", function() {
                var value = $(this).data("value");

                var updated = {};
                updated[attribute_code] = value;

                transporter.patch(updated);
            });
    },

    end: 0
};
