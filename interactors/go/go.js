js.interactors.go = {
    name: "go",

    on_load: function() {
        $('li[data-interactor="go"]')
            .each(js.interactors.go.add)
            ;
    },

    add: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        var ostate_transporter = js.transport.connect(thing_id, "ostate");
        e.find("button")
            .on("click", function() {
                var value = $(this).data("value");

                var updated = {};
                updated[attribute_code] = (new Date()).toISOString();

                ostate_transporter.patch(updated);
            });
    },

    end: 0
};
