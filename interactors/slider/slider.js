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

        var thingd = thingdd[thing_id];
        var ads = thingd["model"]["iot:attribute"];
        var a;
        for (var adi in ads) {
            var ad = ads[adi];
            if (ad._code === attribute_code) {
                a = ad;
                break;
            }
        }

        if (!a) {
            console.log("# slider could not find attribute", attribute_code);
            return;
        }

        // create slider
        var e_slider = e.find('.slider');
        var slider = e_slider
            .slider({
                min: a._minimum,
                max: a._maximum,
                step: a._step,
            });

        // handler user interactions
        var active = false;
        var ostate_transporter = js.transport.connect(thing_id, "ostate");

        slider
            .on('slideStart', function() {
                active = true;
            })
            .on('slideStop', function() {
                active = false;
            })
            .on('slide', function(event) {
                var d = {};
                d[attribute_code] = event.value;

                ostate_transporter.patch(d);
            })
            ;

        // handle data updates
        var istate_transporter = js.transport.connect(thing_id, "istate");
        istate_transporter.on_update(function(d) {
            if (active) {
                return;
            }

            slider.slider('setValue', d[attribute_code]);
        })
    },

    end: 0
};
