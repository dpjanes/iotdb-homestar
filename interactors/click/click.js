js.interactors.click = {
    name: "click",

    on_load: function() {
        $('li[data-interactor="click"]')
            .each(js.interactors.click.setup_click)
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

    setup_click: function(e) {
        var e = $(this);

        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");
        var transporter = js.transport.connect(thing_id, "ostate");

        e.on("click", function() {
            var value = $(this).data("value");
            var thing_ostate = thingdd[thing_id]._ostate;
            thing_ostate[attribute_code] = (new Date()).toISOString();

            transporter.update(thing_ostate);
        });
    },

    end: 0
};
