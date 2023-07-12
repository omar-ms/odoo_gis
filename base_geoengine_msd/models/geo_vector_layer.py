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
    open_record_view_id = fields.Many2one("ir.ui.view" , string="Open Button View" , domain=[('type','=','form')])
    label_field_name = fields.Char(related="label_field_id.name", readonly=True,string="Label Field Name")
    geo_field_model_name = fields.Char(related='geo_field_id.model_id.model' ,readonly=True, string="Geo Field Model")

    color_scale = fields.Selection(
        [
            ("RdYlBu", "Red Yellow Blue"),
            ("#33A0FF,#309900,#005299", "Cyan Green Blue"),
            ("#FFF824,#B82E2E", "Yellow Red"),
            ("#FFF824,#808080", "Yellow Gray"),
            ("#FF0000,#11FF00", "Red Green"),
            ],
        string="Color scale",
        default="RdYlBu"
    )
    force_min = fields.Float(string="Force Min",default=False)
    force_max = fields.Float(string="Force Max",default=False)
    manual_min_max = fields.Boolean(string="Force Min/Max Values",store=True)

    @api.onchange("manual_min_max")
    def _onchange_manual_min_max(self):
        if self.manual_min_max:
            self.force_min = self.force_max = 0.0
        else:
            self.force_min = self.force_max = False
    
    @api.onchange("force_min","force_max")
    def _onchange_force_min_max(self):
        if self.force_min > self.force_max:
            self.force_max = self.force_min + 1.0

        if self.force_min == 0.0 and self.force_max == 0.0 and self.manual_min_max:
            self.force_max = 1.0


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


