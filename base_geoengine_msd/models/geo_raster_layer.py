from odoo import api, fields, models

class GeoRasterLayer(models.Model):
    _inherit = "geoengine.raster.layer"

    raster_type = fields.Selection(selection_add=[("blank", "Blank")], ondelete={"blank": "set default"})
