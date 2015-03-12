js.interactors.boolean = {
    name: "boolean",

    on_load: function() {
        console.log("+", "interactors.boolean", "called");
        $('li[data-interactor="boolean"]')
            .each(js.interactors.boolean.add_transporter)
            .each(js.interactors.boolean.add_click)
            ;
    },

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
    },

    add_click: function(e) {
        var e = $(this);

        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");

        var transporter = js.transport.connect(thing_id, "ostate");
        e.find("button")
            .on("click", function() {
                var value = $(this).data("value");
                var thing_ostate = thingdd[thing_id]._ostate;
                thing_ostate[attribute_code] = ((value === 1) || (value === "1")) ? true : false;
                transporter.update(thing_ostate);
            });
    },

    on_click: function(e) {
        js.actions.send($(this));
    },

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

        if ((typeof value) === "boolean") {
            value = value ? 1 : 0;
        }

        try {
            $('li[data-id="' + id + '"] button').removeClass("selected");
            $('li[data-id="' + id + '"] button[data-value="' + value + '"]').addClass("selected");
        } catch(x) {
            console.log(x);
        }
    },

    end: 0
};
