js.interactors.color = {
    name: "color",
    supress: false,
    
    on_load: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute")
            .each(js.interactors.boolean.add_wrapper)
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

    end: 0
};
