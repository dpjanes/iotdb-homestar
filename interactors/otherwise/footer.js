js.interactors.otherwise = {
    name: "otherwise",

    on_load: function() {
        $('li[data-interactor="otherwise"]').each(js.interactors.otherwise.add_transporter);
    },

    add_transporter: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");
        console.log("+", thing_id, attribute_code);

        var transporter = js.transport.connect(thing_id, "istate");
        transporter.on_update(function(d) {
            e.find('.interactor-state').text("" + d[attribute_code]);
        });
    },

    /*
    update: function(id, state, rd) {
        var value;
        if (rd.in) {
            value = state[rd.in];
        } else if (rd.out) {
            value = state[rd.out];
        }

        if (value === undefined) {
            return;
        }

        try {
            $('li[data-id="' + id + '"] .interactor-state').text("" + value);
        } catch(x) {
        }
    },
    */

    end: 0
};
