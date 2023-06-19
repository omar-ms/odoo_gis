import logging
from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)

SUPPORTED_ATT = [
    "float",
    "integer",
    "integer_big",
    "related",
    "function",
    "date",
    "datetime",
    "char",
    "text",
    "selection",
]

class GeoVectorLayer(models.Model):
    _inherit = "geoengine.vector.layer"

    label_field_id = fields.Many2one(
        "ir.model.fields", "Label field", domain=[("ttype", "in", SUPPORTED_ATT)]
    )
    label_field_name = fields.Char(related="label_field_id.name", readonly=True)
    open_record_view_id = fields.Many2one("ir.ui.view" , string="Open Button View" , domain=[('type','=','form')])

    color_scale = fields.Selection(
        [
            ("RdYlBu", "Red Yellow Blue"),
            ("#33A0FF,#309900,#005299", "Cyan Green Blue"),
            ("#FFF824,#B82E2E", "Yellow Red"),
            ("#FFF824,#808080", "Yellow Gray")
            ],
        string="Color scale",
        default="RdYlBu"
    )


    @api.onchange("display_polygon_labels","geo_field_id")
    def _onchange_model_view_id(self):
        if self.display_polygon_labels and self.geo_field_id:
            res = {'domain': {
                'label_field_id': [('model_id', '=', self.geo_field_id.model_id.id)]}
            }
            return res
        else:
            self.label_field_id = False

    @api.onchange("geo_field_id")
    def _onchange_geo_field_id(self):
        if self.geo_field_id:
            res = {'domain': {
                'open_record_view_id': [('model', '=', self.geo_field_id.model_id.model),('type','=','form')]}
            }
            return res
        else:
            self.open_record_view_id = False

    # on form modification, check if the label field is valid


