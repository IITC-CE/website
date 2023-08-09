// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Mini map
// @category       Controls
// @version        0.4.1.20230809.145424
// @description    Show a mini map on the corner of the map.
// @id             minimap
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR666/plugins/minimap.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR666/plugins/minimap.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/minimap.png
// @icon64         https://iitc.app/extras/plugin-icons/minimap-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-08-09-145424';
plugin_info.pluginId = 'minimap';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
var miniMap = {};
window.plugin.miniMap = miniMap;

miniMap.options = {
  toggleDisplay: true,
  mapOptions: {}
  // more: https://github.com/Norkart/Leaflet-MiniMap#available-options
};

// by default minimap follows main map baselayer changes
miniMap.clonebasemap = true;

// it's possible to set special mappings for particular layers
// 'map':'minimap'
miniMap.layers = {
  // 'CartoDB Dark Matter': 'Google Default Ingress Map',
  // 'Google Default Ingress Map': 'Google Default Ingress Map',

  // 'CartoDB Positron': '', // any false value means reference to 'default'

  default: 'Google Roads' // used also as fallback when some basemap layer is unknown or unsupported

};
// it's also possible to directly set any L.Layer instance:
// plugin.miniMap.layers.default = L.gridLayer.googleMutant({type:'roadmap', maxZoom: 21});

function clone (layer) {
  // N.B.: vector layers (CircleMarker, Polyline etc) may contain nested objects in options (such as Renderer)
  //       so we may need to add options cloning in order to support them
  var options = layer.options;
  if (L.BingLayer && layer instanceof L.BingLayer) {
    return L.bingLayer(options);
  } else if (L.Yandex && layer instanceof L.Yandex) {
    return new L.Yandex(layer._type, options);
  } else if (layer instanceof L.TileLayer) {
    return L.tileLayer(layer._url, options);
  } else if (L.GridLayer.GoogleMutant && layer instanceof L.GridLayer.GoogleMutant) {
    var gm = L.gridLayer.googleMutant(options);
    layer.whenReady(function () {
      for (var name in layer._subLayers) { gm.addGoogleLayer(name); }
    });
    return gm;
  } else if (layer instanceof L.LayerGroup) {
    var layers = layer.getLayers();
    if (layers.length === 0) { return; }
    if (layers.length === 1) { return clone(layers[0]); } // unwrap layerGroup if it contains only 1 layer (e.g. Bing)
    var group = L.layerGroup();
    for (var l in layers) {
      var cloned = clone(layers[l]);
      if (!cloned) { return; }
      group.addLayer(cloned);
    }
    return group;
  }
}

var map, layerChooser;

function getMapping (name) {
  if (name in miniMap.layers) {
    return miniMap.layers[name] || miniMap.layers.default;
  }
}

var cache = {};
function getLayer (e) {
  var mapped = getMapping(e.name) ||
      !miniMap.clonebasemap && miniMap.layers.default;
  if (mapped) {
    if (mapped instanceof L.Layer) { return mapped; } // no need to cache
    e = { name: mapped };
  }
  var layer = cache[e.name];
  if (!layer) {
    if (mapped) {
      e = layerChooser._layers.find(function (el) {
        return el.name === mapped;
      });
      if (!e) { return; }
    }
    layer = clone(e.layer);
    cache[e.name] = layer;
  }
  return layer;
}

function getLayerSafe (e) {
  return getLayer(e) || getLayer({ name: 'default' }) || getLayer(layerChooser._layers[0]);
}

function setup () {
  loadLeafletMiniMap();

  map = window.map; layerChooser = window.layerChooser;

  // mobile mode  - bottom-right (default)
  // desktop mode - bottom-left, so it doesn't clash with the sidebar
  if (!window.isSmartphone()) {
    miniMap.options.position = miniMap.options.position || 'bottomleft';
  }

  miniMap.layers.default = miniMap.layers.default || 'unset';

  var baseLayer = layerChooser._layers.find(function (el) {
    return !el.overlay && map.hasLayer(el.layer);
  });
  var current = baseLayer ? getLayerSafe(baseLayer) : L.layerGroup();
  miniMap.control = L.control.minimap(current, miniMap.options).addTo(map);

  map.on('baselayerchange', function (e) {
    if (!map.hasLayer(e.layer)) { return; } // event may come not from main map (todo: debug)
    var layer = getLayerSafe(e);
    if (layer && layer !== current) {
      miniMap.control.changeLayer(layer);
      current = layer;
    }
  });

  if (!miniMap.options.mapOptions.attributionControl) { // hide attribution
    $('<style>').html(
      'div.leaflet-control-minimap div.leaflet-bottom,'               // google
    // + 'div.leaflet-control-minimap div.gm-style .gmnoprint,'       // google (old)
    // + 'div.leaflet-control-minimap div.gm-style img,'
    + 'div.leaflet-control-minimap ymaps[class$="-copyrights-pane"],' // yandex
    + 'div.leaflet-control-minimap ymaps iframe'
    + '  { display: none }'
    ).appendTo('head');
  }
}

function loadLeafletMiniMap () {
  try {
    // https://github.com/Norkart/Leaflet-MiniMap
    // *** included: external/Control.MiniMap.js ***
// Following https://github.com/Leaflet/Leaflet/blob/master/PLUGIN-GUIDE.md
(function (factory, window) {

	// define an AMD module that relies on 'leaflet'
	if (typeof define === 'function' && define.amd) {
		define(['leaflet'], factory);

	// define a Common JS module that relies on 'leaflet'
	} else if (typeof exports === 'object') {
		module.exports = factory(require('leaflet'));
	}

	// attach your plugin to the global 'L' variable
	if (typeof window !== 'undefined' && window.L) {
		window.L.Control.MiniMap = factory(L);
		window.L.control.minimap = function (layer, options) {
			return new window.L.Control.MiniMap(layer, options);
		};
	}
}(function (L) {

	var MiniMap = L.Control.extend({

		includes: L.Evented ? L.Evented.prototype : L.Mixin.Events,

		options: {
			position: 'bottomright',
			toggleDisplay: false,
			zoomLevelOffset: -5,
			zoomLevelFixed: false,
			centerFixed: false,
			zoomAnimation: false,
			autoToggleDisplay: false,
			minimized: false,
			width: 150,
			height: 150,
			collapsedWidth: 19,
			collapsedHeight: 19,
			aimingRectOptions: {color: '#ff7800', weight: 1, interactive: false},
			shadowRectOptions: {color: '#000000', weight: 1, interactive: false, opacity: 0, fillOpacity: 0},
			strings: {hideText: 'Hide MiniMap', showText: 'Show MiniMap'},
			mapOptions: {}  // Allows definition / override of Leaflet map options.
		},

		// layer is the map layer to be shown in the minimap
		initialize: function (layer, options) {
			L.Util.setOptions(this, options);
			// Make sure the aiming rects are non-clickable even if the user tries to set them clickable (most likely by forgetting to specify them false)
			this.options.aimingRectOptions.interactive = false;
			this.options.shadowRectOptions.interactive = false;
			this._layer = layer;
		},

		onAdd: function (map) {

			this._mainMap = map;

			// Creating the container and stopping events from spilling through to the main map.
			this._container = L.DomUtil.create('div', 'leaflet-control-minimap');
			this._container.style.width = this.options.width + 'px';
			this._container.style.height = this.options.height + 'px';
			L.DomEvent.disableClickPropagation(this._container);
			L.DomEvent.on(this._container, 'mousewheel', L.DomEvent.stopPropagation);

			var mapOptions = {
				attributionControl: false,
				dragging: !this.options.centerFixed,
				zoomControl: false,
				zoomAnimation: this.options.zoomAnimation,
				autoToggleDisplay: this.options.autoToggleDisplay,
				touchZoom: this.options.centerFixed ? 'center' : !this._isZoomLevelFixed(),
				scrollWheelZoom: this.options.centerFixed ? 'center' : !this._isZoomLevelFixed(),
				doubleClickZoom: this.options.centerFixed ? 'center' : !this._isZoomLevelFixed(),
				boxZoom: !this._isZoomLevelFixed(),
				crs: map.options.crs
			};
			mapOptions = L.Util.extend(this.options.mapOptions, mapOptions);  // merge with priority of the local mapOptions object.

			this._miniMap = new L.Map(this._container, mapOptions);

			this._miniMap.addLayer(this._layer);

			// These bools are used to prevent infinite loops of the two maps notifying each other that they've moved.
			this._mainMapMoving = false;
			this._miniMapMoving = false;

			// Keep a record of this to prevent auto toggling when the user explicitly doesn't want it.
			this._userToggledDisplay = false;
			this._minimized = false;

			if (this.options.toggleDisplay) {
				this._addToggleButton();
			}

			this._miniMap.whenReady(L.Util.bind(function () {
				this._aimingRect = L.rectangle(this._mainMap.getBounds(), this.options.aimingRectOptions).addTo(this._miniMap);
				this._shadowRect = L.rectangle(this._mainMap.getBounds(), this.options.shadowRectOptions).addTo(this._miniMap);
				this._mainMap.on('moveend', this._onMainMapMoved, this);
				this._mainMap.on('move', this._onMainMapMoving, this);
				this._miniMap.on('movestart', this._onMiniMapMoveStarted, this);
				this._miniMap.on('move', this._onMiniMapMoving, this);
				this._miniMap.on('moveend', this._onMiniMapMoved, this);
			}, this));

			return this._container;
		},

		addTo: function (map) {
			L.Control.prototype.addTo.call(this, map);

			var center = this.options.centerFixed || this._mainMap.getCenter();
			this._miniMap.setView(center, this._decideZoom(true));
			this._setDisplay(this.options.minimized);
			return this;
		},

		onRemove: function (map) {
			this._mainMap.off('moveend', this._onMainMapMoved, this);
			this._mainMap.off('move', this._onMainMapMoving, this);
			this._miniMap.off('moveend', this._onMiniMapMoved, this);

			this._miniMap.removeLayer(this._layer);
		},

		changeLayer: function (layer) {
			this._miniMap.removeLayer(this._layer);
			this._layer = layer;
			this._miniMap.addLayer(this._layer);
		},

		_addToggleButton: function () {
			this._toggleDisplayButton = this.options.toggleDisplay ? this._createButton(
				'', this._toggleButtonInitialTitleText(), ('leaflet-control-minimap-toggle-display leaflet-control-minimap-toggle-display-' +
				this.options.position), this._container, this._toggleDisplayButtonClicked, this) : undefined;

			this._toggleDisplayButton.style.width = this.options.collapsedWidth + 'px';
			this._toggleDisplayButton.style.height = this.options.collapsedHeight + 'px';
		},

		_toggleButtonInitialTitleText: function () {
			if (this.options.minimized) {
				return this.options.strings.showText;
			} else {
				return this.options.strings.hideText;
			}
		},

		_createButton: function (html, title, className, container, fn, context) {
			var link = L.DomUtil.create('a', className, container);
			link.innerHTML = html;
			link.href = '#';
			link.title = title;

			var stop = L.DomEvent.stopPropagation;

			L.DomEvent
				.on(link, 'click', stop)
				.on(link, 'mousedown', stop)
				.on(link, 'dblclick', stop)
				.on(link, 'click', L.DomEvent.preventDefault)
				.on(link, 'click', fn, context);

			return link;
		},

		_toggleDisplayButtonClicked: function () {
			this._userToggledDisplay = true;
			if (!this._minimized) {
				this._minimize();
			} else {
				this._restore();
			}
		},

		_setDisplay: function (minimize) {
			if (minimize !== this._minimized) {
				if (!this._minimized) {
					this._minimize();
				} else {
					this._restore();
				}
			}
		},

		_minimize: function () {
			// hide the minimap
			if (this.options.toggleDisplay) {
				this._container.style.width = this.options.collapsedWidth + 'px';
				this._container.style.height = this.options.collapsedHeight + 'px';
				this._toggleDisplayButton.className += (' minimized-' + this.options.position);
				this._toggleDisplayButton.title = this.options.strings.showText;
			} else {
				this._container.style.display = 'none';
			}
			this._minimized = true;
			this._onToggle();
		},

		_restore: function () {
			if (this.options.toggleDisplay) {
				this._container.style.width = this.options.width + 'px';
				this._container.style.height = this.options.height + 'px';
				this._toggleDisplayButton.className = this._toggleDisplayButton.className
					.replace('minimized-'	+ this.options.position, '');
				this._toggleDisplayButton.title = this.options.strings.hideText;
			} else {
				this._container.style.display = 'block';
			}
			this._minimized = false;
			this._onToggle();
		},

		_onMainMapMoved: function (e) {
			if (!this._miniMapMoving) {
				var center = this.options.centerFixed || this._mainMap.getCenter();

				this._mainMapMoving = true;
				this._miniMap.setView(center, this._decideZoom(true));
				this._setDisplay(this._decideMinimized());
			} else {
				this._miniMapMoving = false;
			}
			this._aimingRect.setBounds(this._mainMap.getBounds());
		},

		_onMainMapMoving: function (e) {
			this._aimingRect.setBounds(this._mainMap.getBounds());
		},

		_onMiniMapMoveStarted: function (e) {
			if (!this.options.centerFixed) {
				var lastAimingRect = this._aimingRect.getBounds();
				var sw = this._miniMap.latLngToContainerPoint(lastAimingRect.getSouthWest());
				var ne = this._miniMap.latLngToContainerPoint(lastAimingRect.getNorthEast());
				this._lastAimingRectPosition = {sw: sw, ne: ne};
			}
		},

		_onMiniMapMoving: function (e) {
			if (!this.options.centerFixed) {
				if (!this._mainMapMoving && this._lastAimingRectPosition) {
					this._shadowRect.setBounds(new L.LatLngBounds(this._miniMap.containerPointToLatLng(this._lastAimingRectPosition.sw), this._miniMap.containerPointToLatLng(this._lastAimingRectPosition.ne)));
					this._shadowRect.setStyle({opacity: 1, fillOpacity: 0.3});
				}
			}
		},

		_onMiniMapMoved: function (e) {
			if (!this._mainMapMoving) {
				this._miniMapMoving = true;
				this._mainMap.setView(this._miniMap.getCenter(), this._decideZoom(false));
				this._shadowRect.setStyle({opacity: 0, fillOpacity: 0});
			} else {
				this._mainMapMoving = false;
			}
		},

		_isZoomLevelFixed: function () {
			var zoomLevelFixed = this.options.zoomLevelFixed;
			return this._isDefined(zoomLevelFixed) && this._isInteger(zoomLevelFixed);
		},

		_decideZoom: function (fromMaintoMini) {
			if (!this._isZoomLevelFixed()) {
				if (fromMaintoMini) {
					return this._mainMap.getZoom() + this.options.zoomLevelOffset;
				} else {
					var currentDiff = this._miniMap.getZoom() - this._mainMap.getZoom();
					var proposedZoom = this._miniMap.getZoom() - this.options.zoomLevelOffset;
					var toRet;

					if (currentDiff > this.options.zoomLevelOffset && this._mainMap.getZoom() < this._miniMap.getMinZoom() - this.options.zoomLevelOffset) {
						// This means the miniMap is zoomed out to the minimum zoom level and can't zoom any more.
						if (this._miniMap.getZoom() > this._lastMiniMapZoom) {
							// This means the user is trying to zoom in by using the minimap, zoom the main map.
							toRet = this._mainMap.getZoom() + 1;
							// Also we cheat and zoom the minimap out again to keep it visually consistent.
							this._miniMap.setZoom(this._miniMap.getZoom() - 1);
						} else {
							// Either the user is trying to zoom out past the mini map's min zoom or has just panned using it, we can't tell the difference.
							// Therefore, we ignore it!
							toRet = this._mainMap.getZoom();
						}
					} else {
						// This is what happens in the majority of cases, and always if you configure the min levels + offset in a sane fashion.
						toRet = proposedZoom;
					}
					this._lastMiniMapZoom = this._miniMap.getZoom();
					return toRet;
				}
			} else {
				if (fromMaintoMini) {
					return this.options.zoomLevelFixed;
				} else {
					return this._mainMap.getZoom();
				}
			}
		},

		_decideMinimized: function () {
			if (this._userToggledDisplay) {
				return this._minimized;
			}

			if (this.options.autoToggleDisplay) {
				if (this._mainMap.getBounds().contains(this._miniMap.getBounds())) {
					return true;
				}
				return false;
			}

			return this._minimized;
		},

		_isInteger: function (value) {
			return typeof value === 'number';
		},

		_isDefined: function (value) {
			return typeof value !== 'undefined';
		},

		_onToggle: function () {
			L.Util.requestAnimFrame(function () {
				L.DomEvent.on(this._container, 'transitionend', this._fireToggleEvents, this);
				if (!L.Browser.any3d) {
					L.Util.requestAnimFrame(this._fireToggleEvents, this);
				}
			}, this);
		},

		_fireToggleEvents: function () {
			L.DomEvent.off(this._container, 'transitionend', this._fireToggleEvents, this);
			var data = { minimized: this._minimized };
			this.fire(this._minimized ? 'minimize' : 'restore', data);
			this.fire('toggle', data);
		}
	});

	L.Map.mergeOptions({
		miniMapControl: false
	});

	L.Map.addInitHook(function () {
		if (this.options.miniMapControl) {
			this.miniMapControl = (new MiniMap()).addTo(this);
		}
	});

	return MiniMap;

}, window));


;
    $('<style>').html('\
.leaflet-control-minimap {\
	border:solid rgba(255, 255, 255, 1.0) 4px;\
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);\
	border-radius: 3px;\
	background: #f8f8f9;\
	transition: all .6s;\
}\
\
.leaflet-control-minimap a {\
	background-color: rgba(255, 255, 255, 1.0);\
	background-repeat: no-repeat;\
	z-index: 99999;\
	transition: all .6s;\
}\
\
.leaflet-control-minimap a.minimized-bottomright {\
	-webkit-transform: rotate(180deg);\
	transform: rotate(180deg);\
	border-radius: 0px;\
}\
\
.leaflet-control-minimap a.minimized-topleft {\
	-webkit-transform: rotate(0deg);\
	transform: rotate(0deg);\
	border-radius: 0px;\
}\
\
.leaflet-control-minimap a.minimized-bottomleft {\
	-webkit-transform: rotate(270deg);\
	transform: rotate(270deg);\
	border-radius: 0px;\
}\
\
.leaflet-control-minimap a.minimized-topright {\
	-webkit-transform: rotate(90deg);\
	transform: rotate(90deg);\
	border-radius: 0px;\
}\
\
.leaflet-control-minimap-toggle-display{\
	background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTgiIHdpZHRoPSIxOCI+PHBhdGggZD0iTTEzLjE4MSAxMy4xNDZ2LTUuODFsLTUuODEgNS44MWg1LjgxeiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEuNjQzIi8+PHBhdGggZD0iTTEyLjc2MiAxMi43MjdsLTYuNTEtNi41MDkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIyLjQ4MiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+);\
	background-size: cover;\
	position: absolute;\
	border-radius: 3px 0px 0px 0px;\
}\
\
.leaflet-oldie .leaflet-control-minimap-toggle-display{\
	background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAH1JREFUOI3t0DEKAjEQheFP8ERWqfUCeg9rL+adbKxkYRFEY7ERhkUhCZb7wyuGYX5ewkIvK6z/ITpjxOHHPtWKrsh4fJEl3GpF29LoI9sHSS6pZjeTnTD0iOayjFevCI7hOKaJZHpObNIsih/b3WiDSzgaS+5lfrY0Wph4A4kFM89VzdVFAAAAAElFTkSuQmCC);\
}\
\
.leaflet-control-minimap-toggle-display-bottomright {\
	bottom: 0;\
	right: 0;\
}\
\
.leaflet-control-minimap-toggle-display-topleft{\
	top: 0;\
	left: 0;\
	-webkit-transform: rotate(180deg);\
	transform: rotate(180deg);\
}\
\
.leaflet-control-minimap-toggle-display-bottomleft{\
	bottom: 0;\
	left: 0;\
	-webkit-transform: rotate(90deg);\
	transform: rotate(90deg);\
}\
\
.leaflet-control-minimap-toggle-display-topright{\
	top: 0;\
	right: 0;\
	-webkit-transform: rotate(270deg);\
	transform: rotate(270deg);\
}\
\
/* Old IE */\
.leaflet-oldie .leaflet-control-minimap {\
	border: 1px solid #999;\
}\
\
.leaflet-oldie .leaflet-control-minimap a {\
	background-color: #fff;\
}\
\
.leaflet-oldie .leaflet-control-minimap a.minimized {\
	filter: progid:DXImageTransform.Microsoft.BasicImage(rotation=2);\
}\
').appendTo('head');

  } catch (e) {
    console.error('Control.MiniMap.js loading failed');
    throw e;
  }
}

setup.info = plugin_info; //add the script info data to the function as a property
if (typeof changelog !== 'undefined') setup.info.changelog = changelog;
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

