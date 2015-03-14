js.interactors.enumeration = {
    name: "enumeration",

    on_load: function() {
        $('.interactor-enumeration .interactor-interactor button').on('click', js.interactors.click.on_click);
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
