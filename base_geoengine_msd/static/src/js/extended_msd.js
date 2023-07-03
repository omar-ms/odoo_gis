/** @odoo-module */
//import {BlankLayer} from "./blank/blank";
import { GeoengineRenderer } from "@base_geoengine/js/views/geoengine/geoengine_renderer/geoengine_renderer.esm";
import { GeoengineController } from "@base_geoengine/js/views/geoengine/geoengine_controller/geoengine_controller.esm";
import { LayersPanel } from "@base_geoengine/js/views/geoengine/layers_panel/layers_panel.esm";
import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";
import {
  useOwnedDialogs,
  useService,
  useModel,
  useBus,
} from "@web/core/utils/hooks";
/*
const GeoEngineBus = {
  dependencies: ["action", "bus_service", "notification", "rpc"],
  start(_, { bus_service, notification, rpc, action }) {
    console.log("Add bus_service");

    bus_service.addChannel("GeoEngineBus"); // New channel

    bus_service.addEventListener(
      "notification",
      ({ detail: notifications }) => {
        console.log({ notifications });

        for (const { payload, type } of notifications) {
          if (type === "refresh") {
            this.refreshHandler(payload);
          }
          if (type === "notification") {
            this.notificationHandler(payload);
          }
        }
      }
    );

    bus_service.addEventListener("connect", () => {
      console.log("Connected");
    });

    bus_service.start();
    this.actionService = action;
    this.notif = notification;
    this._rpc = rpc;
  },

  refreshHandler(payload) {
    console.log(payload);
    this.trigger_up("reload");
    //this.actionService.doAction(payload)
    //this.model.reload();
  },
  notificationHandler(payload) {
    console.log({ payload });

    this.actionService.doAction({
      type: "ir.actions.client",
      tag: "display_notification",
      params: {
        message: _("message"),
        sticky: false,
      },
    });
  },
};
*/
const LEGEND_MAX_ITEMS = 10;

const ExtendedMSD = {
  createBackgroundLayers(backgrounds) {
    const source = [];
    source.push(new ol.layer.Tile());
    const backgroundLayers = backgrounds.map((background) => {
      switch (background.raster_type) {
        /* START: blank option */
        case "blank":
          return new ol.layer.Tile({
            title: background.name,
            visible: !background.overlay,
          });
        /* END: blank option */
        case "osm":
          return new ol.layer.Tile({
            title: background.name,
            visible: !background.overlay,
            type: "base",
            source: new ol.source.OSM(),
          });
        case "wmts":
          const { source_opt, tilegrid_opt, layer_opt } =
            this.createOptions(background);
          this.getUrl(background, source_opt);
          if (background.format_suffix) {
            source_opt.format = background.format_suffix;
          }
          if (background.request_encoding) {
            source_opt.request_encoding = background.request_encoding;
          }
          if (background.projection) {
            source_opt.projection = ol.proj.get(background.projection);
            if (source_opt.projection) {
              const projectionExtent = source_opt.projection.getExtent();
              tilegrid_opt.origin = ol.extent.getTopLeft(projectionExtent);
            }
          }
          if (background.resolutions) {
            tilegrid_opt.resolutions = background.resolutions
              .split(",")
              .map(Number);
            const nbRes = tilegrid_opt.resolutions.length;
            const matrixIds = new Array(nbRes);
            for (let i = 0; i < nbRes; i++) {
              matrixIds[i] = i;
            }
            tilegrid_opt.matrixIds = matrixIds;
          }
          if (background.max_extent) {
            const extent = background.max_extent.split(",").map(Number);
            layer_opt.extent = extent;
            tilegrid_opt.extent = extent;
          }
          if (background.params) {
            source_opt.dimensions = JSON.parse(background.params);
          }
          source_opt.tileGrid = new ol.tilegrid.WMTS(tilegrid_opt);
          layer_opt.source = new ol.source.WMTS(source_opt);
          return new ol.layer.Tile(layer_opt);
        case "d_wms":
          const source_opt_wms = {
            params: JSON.parse(background.params_wms),
            serverType: background.server_type,
          };
          const urls = background.url.split(",");
          if (urls.length > 1) {
            source_opt_wms.urls = urls;
          } else {
            source_opt_wms.url = urls[0];
          }
          return new ol.layer.Tile({
            title: background.name,
            visible: !background.overlay,
            source: new ol.source.TileWMS(source_opt_wms),
          });
        default:
          return undefined;
      }
    });
    return source.concat(backgroundLayers);
  },
  setupControls() {
    this._super();
    /* START: fullscreen option */
    this.props.fullscreen = false;
    const match = this.props.archInfo.arch.match(/fullscreen="([^"]+)"/);
    if (match && match.length > 1) {
      const extractedValue = match[1];
      // Check if the extracted value is '1' or 'True' (case-insensitive)
      if (extractedValue === "1" || extractedValue.toLowerCase() === "true") {
        this.props.fullscreen = true;
        const fullScreen = new ol.control.FullScreen();
        this.map.addControl(fullScreen);
      }
    }
    /* END: fullscreen option */
  },
  selectStyle(feature) {
    var geometryType = feature.getGeometry().getType();
    switch (geometryType) {
      case "Point":
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: 3 * 2,
            fill: new ol.style.Fill({
              color: [0, 153, 255, 1],
            }),
            stroke: new ol.style.Stroke({
              color: [255, 255, 255, 1],
              width: 3 / 2,
            }),
          }),
          zIndex: Infinity,
        });
      case "Polygon":
      case "MultiPolygon":
        return new ol.style.Style({
          fill: new ol.style.Fill({
            color: chroma(feature.values_.attributes.color).alpha(0.4).css(),
          }),
        });
    }
  },
  createStyleText() {
    return new ol.style.Text({
      font: "bold 11px Arial, Verdana, Helvetica, sans-seri",
      text: "",
      fill: new ol.style.Fill({
        color: "#FFFFFF",
      }),
      stroke: new ol.style.Stroke({
        color: "#000000",
        width: 1,
      }),
    });
  },
  addFeatureToSource(data, cfg, vectorSource) {
    data.forEach((item) => {
      var attributes =
        item._values === undefined ? _.clone(item) : _.clone(item._values);
      this.geometryFields.forEach((geo_field) => delete attributes[geo_field]);

      if (cfg.display_polygon_labels === true) {
        attributes.label =
          item._values === undefined
            ? item[cfg.label_field_name]
            : item._values[cfg.label_field_name];
      } else {
        attributes.label = "";
      }
      attributes.color = cfg.begin_color;

      const json_geometry =
        item._values === undefined
          ? item[cfg.geo_field_id[1]]
          : item._values[cfg.geo_field_id[1]];
      if (json_geometry) {
        const feature = new ol.Feature({
          geometry: new ol.format.GeoJSON().readGeometry(json_geometry),
          attributes: attributes,
          model: cfg.model,
        });
        feature.setId(item.resId);

        vectorSource.addFeature(feature);
      }
    });
  },
  zoomOnFeature(record) {
    const feature = this.vectorSource.getFeatureById(record.resId);
    var map_view = this.map.getView();
    if (map_view) {
      map_view.fit(feature.getGeometry(), { maxZoom: 20 });
    }
  },
  getOriginalZoom() {
    var extent = this.vectorLayersResult
      .find((res) => res.values_.visible === true)
      .getSource()
      .getExtent();
    var infinite_extent = [Infinity, Infinity, -Infinity, -Infinity];
    if (extent !== infinite_extent) {
      var map_view = this.map.getView();
      if (map_view) {
        map_view.fit(extent);
      }
    }
  },
  updateZoom() {
    if (this.state.isFit) {
      this.map.getView().setZoom(localStorage.getItem("ol-zoom"));
    } else if (this.props.data.records.length) {
      this.getOriginalZoom();
      this.state.isFit = true;
    }
  },
  styleVectorLayerColored(cfg, data) {
    var indicator = cfg.attribute_field_id[1];
    var values = this.extractLayerValues(cfg, data);
    //values = values.map((value) => this.humanizeString(value));
    var nb_class = cfg.nb_class || DEFAULT_NUM_CLASSES;
    var opacity = cfg.layer_opacity;
    var begin_color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
    var end_color_hex = cfg.end_color || DEFAULT_END_COLOR;
    var begin_color = chroma(begin_color_hex).alpha(opacity).css();
    var end_color = chroma(end_color_hex).alpha(opacity).css();
    // Function that maps numeric values to a color palette.
    // This scale function is only used when geo_repr is basic
    var scale = chroma.scale([begin_color, end_color]);
    var serie = new geostats(values);
    var vals = null;
    switch (cfg.classification) {
      case "unique":
      case "custom":
        vals = serie.getClassUniqueValues();
        // "RdYlBu" is a set of colors
        var color_scale = "RdYlBu";
        if (cfg.color_scale && cfg.color_scale.split(",").length > 1) {
          color_scale = cfg.color_scale.split(",");
        } else if (cfg.color_scale && cfg.color_scale.split(",").length == 1) {
          color_scale = cfg.color_scale;
        }

        scale = chroma.scale(color_scale).domain([0, vals.length], vals.length);
        break;
      case "quantile":
        serie.getClassQuantile(nb_class);
        vals = serie.getRanges();
        scale = scale.domain([0, vals.length], vals.length);
        break;
      case "interval":
        serie.getClassEqInterval(nb_class);
        vals = serie.getRanges();
        scale = scale.domain([0, vals.length], vals.length);
        break;
    }
    let colors = [];
    if (cfg.classification === "custom") {
      colors = vals.map((val) => {
        if (val) {
          return chroma(val).alpha(opacity).css();
        }
      });
    } else {
      colors = scale
        .colors(vals.length)
        .map((color) => chroma(color).alpha(opacity).css());
    }
    const styles_map = this.createStylesWithColors(colors);
    let legend = null;
    if (vals.length <= LEGEND_MAX_ITEMS) {
      legend = serie.getHtmlLegend(colors, cfg.name, 1);
    }
    return {
      style: (feature) => {
        const value = feature.get("attributes")[indicator];
        const color_idx = this.getClass(value, vals);
        var label_text = feature.values_.attributes.label;
        if (label_text === false || typeof label_text === "undefined") {
          label_text = "";
        }
        styles_map[colors[color_idx]][0].text_.text_ = label_text.toString();
        return styles_map[colors[color_idx]];
      },
      legend,
    };
  },
  humanizeString(str) {
    return str.replace(/_/g, " ").replace(/\b\w/g, function (str) {
      return str.toUpperCase();
    });
  },
  async getModelData(cfg, fields_to_read) {
    const domain = this.evalModelDomain(cfg);
    let context_domain = this.props.data.domain || [[]];
    let model = this.models.filter((e) => e.model.resModel === cfg.model)[0];
    const activeFieldsNames = Object.keys(model.model.activeFields).map(
      (key) => model.model.activeFields[key].name
    );
    // filter context_domain to only include array of length 3
    context_domain = context_domain.filter(
      (e) =>
        e.length === 3 &&
        activeFieldsNames.includes(e[0]) &&
        (e[1] !== false || e[2] !== false)
    );
    domain.push(...context_domain);

    let data = await this.orm.searchRead(
      cfg.model,
      [domain][0],
      fields_to_read
    );
    const modelsRecords = this.models.find(
      (e) => e.model.resModel === cfg.model
    ).model.records;
    data = data.map((data) =>
      modelsRecords.find((rec) => rec.resId === data.id)
    );

    if (cfg.open_record_view_id) {
      data = data.map((record) => {
        record.viewId = cfg.open_record_view_id[0];
        return record;
      });
    }

    return data;
  },
  onInfoBoxClicked() {
    //this.props.openRecord(this.record.resModel, this.record.resId);
    this.services.action.doAction({
      type: "ir.actions.act_window",
      res_model: this.record.resModel,
      res_id: this.record.resId,
      views: [[this.record.viewId, "form"]],
      name: "View Record",
      view_mode: "form",
      view_type: "form",
      target: "new",
      context: { create: false, edit: false },
      flags: {
        mode: "readonly",
        create: false,
        form: { no_create: true },
      },
    });
  },
  async createVectorLayer(cfg) {
    if (
      cfg.open_record_view_id &&
      cfg.geo_field_model_name == this.props.data.resModel
    ) {
      this.props.data.records = this.props.data.records.map((record) => {
        record.viewId = cfg.open_record_view_id[0];
        return record;
      });
    }
    return await this._super(cfg);
  },
};

const LimitController = {
  setup() {
    console.log(this);
    //this.GeoEngineBus = GeoEngineBus;
    //registry.category("services").add("GeoEngineBus", this.GeoEngineBus);
    const match = this.props.archInfo.arch.match(/limit="([^"]+)"/);
    if (match && match.length > 1) {
      const extractedValue = Number(match[1]);
      // Check if the extracted value is a number
      if (!isNaN(extractedValue)) {
        this.props.limit = extractedValue;
      }
    }

    this._super();
  },
  busHandler() {
    console.log("busHandler");
  },
};

const GetViewFix = {
  async loadLayers() {
    this.ReqViewId = this.env.config.viewId || null;
    return this.orm
      .call(this.props.model, "get_geoengine_layers", [this.ReqViewId])
      .then((result) => {
        this.state.geoengineLayers = result;
      });
  },
};

patch(
  GeoengineRenderer.prototype,
  "base_geoengine_msd.extended_msd",
  ExtendedMSD
);
patch(
  GeoengineController.prototype,
  "base_geoengine_msd.limit_controller",
  LimitController
);
patch(LayersPanel.prototype, "base_geoengine_msd.get_view_fix", GetViewFix);
