/** @odoo-module */
//import {BlankLayer} from "./blank/blank";
import {GeoengineRenderer} from "@base_geoengine/js/views/geoengine/geoengine_renderer/geoengine_renderer.esm";
import {GeoengineController} from "@base_geoengine/js/views/geoengine/geoengine_controller/geoengine_controller.esm";
import {patch} from "@web/core/utils/patch";

const BlankLayer = {
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
                    const {source_opt, tilegrid_opt, layer_opt} =
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
                            tilegrid_opt.origin =
                                ol.extent.getTopLeft(projectionExtent);
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
                        color: chroma(feature.values_.attributes.color)
                            .alpha(0.4)
                            .css(),
                    }),
                });
        }
    },
    addFeatureToSource(data, cfg, vectorSource) {
        data.forEach((item) => {
            var attributes =
                item._values === undefined ? _.clone(item) : _.clone(item._values);
            this.geometryFields.forEach((geo_field) => delete attributes[geo_field]);

            if (cfg.display_polygon_labels === true) {
                console.log("display_polygon_labels");
                console.log(cfg);
                console.log(item);
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
};

const LimitController = {
    setup() {
        // extract limit from this.props.archInfo.arch
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
};

patch(GeoengineRenderer.prototype, "base_geoengine_fix.blank_layer", BlankLayer);
patch(
    GeoengineController.prototype,
    "base_geoengine_fix.limit_controller",
    LimitController
);
