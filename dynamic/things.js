var thingdd = {};
{% for thingd in things() %}
thingdd[{{ thingd._id|json|safe }}] = {{ thingd|json(2)|safe }};
{% endfor %}
