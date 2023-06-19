import re
from odoo import api, models


class Base(models.AbstractModel):
    _inherit = "base"

    # override
    @api.model
    def get_geoengine_layers(self, view_id=None, view_type="geoengine", **options):
        self = self.sudo()
        return super(Base, self).get_geoengine_layers(view_id=view_id, view_type=view_type, **options)
