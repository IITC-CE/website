// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Yandex maps
// @category       Map Tiles
// @version        0.3.1.20230730.144243
// @description    Add Yandex.com (Russian/Русский) map layers
// @id             basemap-yandex
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR654/plugins/basemap-yandex.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR654/plugins/basemap-yandex.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-yandex.png
// @icon64         https://iitc.app/extras/plugin-icons/basemap-yandex-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-07-30-144243';
plugin_info.pluginId = 'basemap-yandex';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global L, layerChooser */
// use own namespace for plugin
var mapYandex = {};

mapYandex.types = {
  map: {
    type: 'map'
  },
  satellite: {
    type: 'satellite'
  },
  hybrid: {
    type: 'hybrid'
  },
};

mapYandex.options = {
  // set this to your API key
  apiParams: '<your API-key>'
};

function setup() {
  setupYandexLeaflet();

  for (var name in mapYandex.types) {
    var options = L.extend({}, mapYandex.options, mapYandex.types[name]);
    layerChooser.addBaseLayer(L.yandex(options), 'Yandex ' + name);
  }
}

function setupYandexLeaflet () {

  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Yandex.js
    // *** included: external/Yandex.js ***
// https://tech.yandex.com/maps/doc/jsapi/2.1/quick-start/index-docpage/

/* global ymaps: true */

L.Yandex = L.Layer.extend({

	options: {
		type: 'yandex#map', // 'map', 'satellite', 'hybrid', 'map~vector' | 'overlay', 'skeleton'
		mapOptions: { // https://tech.yandex.com/maps/doc/jsapi/2.1/ref/reference/Map-docpage/#Map__param-options
			// yandexMapDisablePoiInteractivity: true,
			balloonAutoPan: false,
			suppressMapOpenBlock: true
		},
		overlayOpacity: 0.8,
		minZoom: 0,
		maxZoom: 19
	},

	initialize: function (type, options) {
		if (typeof type === 'object') {
			options = type;
			type = false;
		}
		options = L.Util.setOptions(this, options);
		if (type) { options.type = type; }
		this._isOverlay = options.type.indexOf('overlay') !== -1 ||
		                  options.type.indexOf('skeleton') !== -1;
		this._animatedElements = [];
	},

	_setStyle: function (el, style) {
		for (var prop in style) {
			el.style[prop] = style[prop];
		}
	},

	_initContainer: function (parentEl) {
		var zIndexClass = this._isOverlay ? 'leaflet-overlay-pane' : 'leaflet-tile-pane';
		var _container = L.DomUtil.create('div', 'leaflet-yandex-container leaflet-pane ' + zIndexClass);
		var opacity = this.options.opacity || this._isOverlay && this.options.overlayOpacity;
		if (opacity) {
			L.DomUtil.setOpacity(_container, opacity);
		}
		var auto = {width: '100%', height: '100%'};
		this._setStyle(parentEl, auto);   // need to set this explicitly,
		this._setStyle(_container, auto); // otherwise ymaps fails to follow container size changes
		return _container;
	},

	onAdd: function (map) {
		var mapPane = map.getPane('mapPane');
		if (!this._container) {
			this._container = this._initContainer(mapPane);
			map.once('unload', this._destroy, this);
			this._initApi();
		}
		mapPane.appendChild(this._container);
		if (!this._yandex) { return; }
		this._setEvents(map);
		this._update();
	},

	beforeAdd: function (map) {
		map._addZoomLimit(this);
	},

	onRemove: function (map) {
		map._removeZoomLimit(this);
	},

	_destroy: function (e) {
		if (!this._map || this._map === e.target) {
			if (this._yandex) {
				this._yandex.destroy();
				delete this._yandex;
			}
			delete this._container;
		}
	},

	_setEvents: function (map) {
		var events = {
			move: this._update,
			resize: function () {
				this._yandex.container.fitToViewport();
			}
		};
		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
			events.zoomend = this._animateZoomEnd;
		}
		map.on(events, this);
		this.once('remove', function () {
			map.off(events, this);
			this._container.remove(); // we do not call this until api is initialized (ymaps API expects DOM element)
		}, this);
	},

	_update: function () {
		var map = this._map;
		var center = map.getCenter();
		this._yandex.setCenter([center.lat, center.lng], map.getZoom());
		var offset = L.point(0,0).subtract(L.DomUtil.getPosition(map.getPane('mapPane')));
		L.DomUtil.setPosition(this._container, offset); // move to visible part of pane
	},

	_resyncView: function () { // for use in addons
		if (!this._map) { return; }
		var ymap = this._yandex;
		this._map.setView(ymap.getCenter(), ymap.getZoom(), {animate: false});
	},

	_animateZoom: function (e) {
		var map = this._map;
		var viewHalf = map.getSize()._divideBy(2);
		var topLeft = map.project(e.center, e.zoom)._subtract(viewHalf)._round();
                var offset = map.project(map.getBounds().getNorthWest(), e.zoom)._subtract(topLeft);
		var scale = map.getZoomScale(e.zoom);
		this._animatedElements.length = 0;
		this._yandex.panes._array.forEach(function (el) {
			if (el.pane instanceof ymaps.pane.MovablePane) {
				var element = el.pane.getElement();
				L.DomUtil.addClass(element, 'leaflet-zoom-animated');
				L.DomUtil.setTransform(element, offset, scale);
				this._animatedElements.push(element);
			}
		},this);
	},

	_animateZoomEnd: function () {
		this._animatedElements.forEach(function (el) {
			L.DomUtil.setTransform(el, 0, 1);
		});
		this._animatedElements.length = 0;
	},

	_initApi: function () { // to be extended in addons
		ymaps.ready(this._initMapObject, this);
	},

	_mapType: function () {
		var shortType = this.options.type;
		if (!shortType || shortType.indexOf('#') !== -1) {
			return shortType;
		}
		return 'yandex#' + shortType;
	},

	_initMapObject: function () {
		ymaps.mapType.storage.add('yandex#overlay', new ymaps.MapType('overlay', []));
		ymaps.mapType.storage.add('yandex#skeleton', new ymaps.MapType('skeleton', ['yandex#skeleton']));
		ymaps.mapType.storage.add('yandex#map~vector', new ymaps.MapType('map~vector', ['yandex#map~vector']));
		var ymap = new ymaps.Map(this._container, {
			center: [0, 0], zoom: 0, behaviors: [], controls: [],
			type: this._mapType()
		}, this.options.mapOptions);

		if (this._isOverlay) {
			ymap.container.getElement().style.background = 'transparent';
		}
		this._container.remove();
		this._yandex = ymap;
		if (this._map) { this.onAdd(this._map); }

		this.fire('load');
	}
});

L.yandex = function (type, options) {
	return new L.Yandex(type, options);
};


; // eslint-disable-line

    // *** included: external/Yandex.addon.LoadApi.js ***
// @options apiLoader: function or thennable = undefined
// Function that will be used to load Yandex JS API (if it turns out not enabled on layer add).
// Must return any Promise-like thennable object.
// Instead of function it's also possible to specify Promise/thennable directly as option value.

// Alternatively:
// Predefined loader will be used if apiUrl / apiParams specified.

// @options apiVersion: string = '2.1'
// Can be specified to use api version other then default,
// more info: https://tech.yandex.com/maps/jsapi/doc/2.1/versions/index-docpage/

// @options apiUrl: string = 'https://api-maps.yandex.ru/{version}/'
// This may need to be changed for using commercial versions of the api.
// It's also possible to directly include params in apiUrl.
// Please note that some parameters are mandatory,
// more info: https://tech.yandex.com/maps/jsapi/doc/2.1/dg/concepts/load-docpage/

// @option apiParams: object or string
// Parameters to use when enabling API.
// There are some predefined defaults (see in code), but 'apikey' is still mandatory.
// It's also possible to specify apikey directly as apiParams string value.

// @method apiLoad(options?: Object): this
// Loads API immediately.
// If API loader / params are not specified in layer options,
// they must be provided in `options` argument (otherwise it may be omitted).

/* global ymaps: true */

L.Yandex.include({
	_initLoader: function (options) {
		if (this._loader) { return; }
		options = options || this.options;
		var loader = options.apiLoader;
		if (loader) {
			if (loader.then) { loader = {loading: loader}; }
		} else {
			var url = this._makeUrl(options);
			loader = url && this._loadScript.bind(this,url);
		}
		if (loader) {
			L.Yandex.prototype._loader = loader;
		}
	},

	loadApi: function (options) {
		if (typeof ymaps !== 'undefined') { return this; }
		this._initLoader(options);
		var loader = this._loader;
		if (!loader) {
			throw new Error('api params expected in options');
		}
		if (!loader.loading) {
			loader.loading = loader();
		}
		return this;
	},

	_initApi: function (afterload) {
		var loader = this._loader;
		if (typeof ymaps !== 'undefined') {
			return ymaps.ready(this._initMapObject, this);
		} else if (afterload || !loader) {
			throw new Error('API is not available');
		}
		var loading = loader.loading;
		if (!loading) {
			loading = loader();
			loader.loading = loading;
		}
		loading.then(this._initApi.bind(this,'afterload'));
	},

	_apiDefaults: { // https://tech.yandex.com/maps/jsapi/doc/2.1/dg/concepts/load-docpage/
		url: 'https://api-maps.yandex.ru/{version}/',
		version: '2.1',
		params: {
			lang: 'ru_RU',
			onerror: 'console.error'
		}
	},

	_makeUrl: function (options) {
		var url = options.apiUrl,
			params = options.apiParams,
			def = this._apiDefaults;
		if (!url && !params) { return false; }
		if (params) {
			if (typeof params === 'string') { params = { apikey: params }; }
			params = L.extend({}, def.params, params);
			url = (url || def.url) +
				L.Util.getParamString(params,url);
		}
		return L.Util.template(url, { version: options.apiVersion || def.version });
	},

	_loadScript: function (url) {
		return new Promise(function (resolve, reject) {
			var script = document.createElement('script');
			script.onload = resolve;
			script.onerror = function () {
				reject('API loading failed');
			};
			script.src = url;
			document.body.appendChild(script);
		});
	}

});

L.Yandex.addInitHook(L.Yandex.prototype._initLoader);


; // eslint-disable-line

  } catch (e) {
    console.error('Yandex.js loading failed');
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

