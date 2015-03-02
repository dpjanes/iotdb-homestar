js.interactors.otherwise = {
    on_load: function() {
    },

    update: function(id, state, rd) {
        if (rd.interactor !== "otherwise") {
            return;
        }

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

    end: 0
};
