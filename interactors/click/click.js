js.interactors.click = {
    name: "click",

    on_load: function() {
        $('li[data-interactor="click"]')
            .each(js.interactors.click.add_click)
            .on('touchstart', js.interactors.click.on_touchstart)
            .on('touchend', js.interactors.click.on_touchend)
            ;
    },

    on_touchstart: function(e) {
        $(this).addClass("touched");
    },

    on_touchend: function(e) {
        $(this).removeClass("touched");
    },

    add_click: function(e) {
        var e = $(this);

        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");
        var transporter = js.transport.connect(thing_id, "ostate");

        e.on("click", function() {
            var value = $(this).data("value");

            var updated = {};
            updated[attribute_code] = (new Date()).toISOString();

            transporter.patch(updated);
        });
    },

    end: 0
};
