# Configuration

Here is the exhaustive list of configuration options you can pass to the plugin.

{%- for option in configOptions %}
## {{ option.name }}

- **Type**: `{{ option.type }}`
- **Description**: {{ option.description }}
- **Default value**: `{{ option.defaultValue }}`

{% if 0 < (option.examples | length) %}
{% for example in option.examples %}
#### Example: {{ example.name }}

{{ example.md }}
{% endfor %}
{% endif %}
{% endfor %}
