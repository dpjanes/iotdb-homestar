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
            var value = d[attribute_code];
            if (value) {
                e.find('.interactor-state').text("" + d[attribute_code]);
            } else{
                e.find('.interactor-state').text("");
            }
        });
    },

    end: 0
};
