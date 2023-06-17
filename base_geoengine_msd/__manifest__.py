
{
    "name": "Geo spatial (Extended by MSD)",
    "summary": "Geo spatial add support for blank layer + fullscreen + label field",
    "description": """
        Geo spatial add support for blank layer + fullscreen + label field
    """,
    "version": "16.0.1.0.0",
    "category": "GeoBI",
    'author': "MS Development",
    'maintainer': 'MS Development',
    'website': "https://msdev.online",
	'support': 'omarms@msdev.online',
    "license": "AGPL-3",
    "website": "https://github.com/omar-ms/odoo_gis/tree/16.0-beta/base_geoengine_fix", 
    "depends": ["base_geoengine"],
    "data": [
        "views/geo_vector_layer_view.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "base_geoengine_fix/static/src/js/blank_layer.js",
        ],
    },

    "installable": True,
    "application": True,
}
