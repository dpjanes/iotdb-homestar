js.interactors.enumeration = {
    on_load: function() {
        $('.interactor-enumeration .interactor-interactor button').on('click', js.interactors.click.on_click);
    },

    on_click: function(e) {
        js.actions.send($(this));
    },

    end: 0
};
