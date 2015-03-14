var thingdd = {};
{% for cookbook in cookbooks() %}
    {% for recipe in cookbook.recipes %}
thingdd[{{ recipe._id|json|safe }}] = {{ recipe|json(2)|safe }};
    {% endfor %}
{% endfor %}
