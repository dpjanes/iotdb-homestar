js.interactors.click = {
    on_load: function() {
        $('.interactor-click').on('click', js.interactors.click.on_click);
        $('.interactor-click').on('touchstart', js.interactors.click.on_touchstart);
        $('.interactor-click').on('touchend', js.interactors.click.on_touchend);
    },

    on_touchstart: function(e) {
        $(this).addClass("touched");
    },

    on_touchend: function(e) {
        $(this).removeClass("touched");
    },

    on_click: function(e) {
        js.actions.send($(this));
    },


    end: 0
};
