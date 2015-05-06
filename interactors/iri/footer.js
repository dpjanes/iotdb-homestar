js.interactors.iri = {
    name: "iri",

    on_load: function() {
        $('li[data-interactor="iri"]').each(js.interactors.iri.add_transporter);
    },

    add_transporter: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");
        console.log("+", thing_id, attribute_code);

        var transporter = js.transport.connect(thing_id, "istate");
        transporter.on_update(function(d) {
            var value = d[attribute_code];
            if (value !== null) {
                e.find('.interactor-state input').val(value);
            } else {
                e.find('.interactor-state input').val("");
            }
        });

        var ostate_transporter = js.transport.connect(thing_id, "ostate");
        e.find('.interactor-state button').on("click", function() {
            var value = e.find('.interactor-state input').val();

            var updated = {};
            updated[attribute_code] = value;

            ostate_transporter.patch(updated);
        });
    },

    end: 0
};
