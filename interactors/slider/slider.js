js.interactors.slider = {
    name: "slider",

    on_load: function() {
        $('li[data-interactor="slider"]')
            .each(js.interactors.slider.add)
            ;
    },

    add: function() {
        var e = $(this);
        var thing_id = e.data("thing");
        var attribute_code = e.data("attribute");
    },

    end: 0
};
