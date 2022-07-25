// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Bing maps
// @category       Map Tiles
// @version        0.3.0.20220725.133526
// @description    Add the bing.com map layers.
// @id             basemap-bing
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/basemap-bing.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/basemap-bing.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2022-07-25-133526';
plugin_info.pluginId = 'basemap-bing';
//END PLUGIN AUTHORS NOTE


var mapBing = {};
window.plugin.mapBing = mapBing;

mapBing.sets = {
  Road: {
    imagerySet: 'RoadOnDemand'
  },
  Dark: {
    imagerySet: 'CanvasDark'
  },
  Aerial: {
    imagerySet: 'Aerial'
  },
  Hybrid: {
    imagerySet: 'AerialWithLabelsOnDemand'
  }
};

mapBing.options = {
  //set this to your API key
  key: 'ArR2hTa2C9cRQZT-RmgrDkfvh3PwEVRl0gB34OO4wJI7vQNElg3DDWvbo5lfUs3p'
}

function setup () {
  setupBingLeaflet();

  for (var name in mapBing.sets) {
    var options = L.extend({}, mapBing.options, mapBing.sets[name]);
    layerChooser.addBaseLayer(L.bingLayer(options), 'Bing ' + name);
  }
};

function setupBingLeaflet () {
  try {
    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.js
    // *** included: external/Bing.js ***
// Bing maps API: https://docs.microsoft.com/en-us/bingmaps/rest-services/

L.BingLayer = L.TileLayer.extend({
	options: {
		// imagerySet: https://docs.microsoft.com/en-us/bingmaps/rest-services/imagery/get-imagery-metadata#template-parameters
		// supported:
		// - Aerial, AerialWithLabels (Deprecated), AerialWithLabelsOnDemand
		// - Road (Deprecated), RoadOnDemand
		// - CanvasDark, CanvasLight, CanvasGray
		// not supported: Birdseye*, Streetside
		imagerySet: 'Aerial', // to be changed on next major version!!

		// https://docs.microsoft.com/en-us/bingmaps/rest-services/common-parameters-and-types/supported-culture-codes
		culture: '',

		// https://docs.microsoft.com/en-us/bingmaps/articles/custom-map-styles-in-bing-maps#custom-map-styles-in-the-rest-and-tile-services
		style: '',

		// https://blogs.bing.com/maps/2015/02/12/high-ppi-maps-now-available-in-the-bing-maps-ajax-control
		// not documented in REST API docs, but working
		// warning: deprecated imagery sets may not support some values (depending also on zoom level)
		retinaDpi: 'd2',

		attribution: 'Bing',
		minZoom: 1,
		maxZoom: 21
		// Actual `maxZoom` value may be less, depending on imagery set / coverage area
		// - 19~20 for all 'Aerial*'
		// - 20 for 'Road' (Deprecated)
	},

	initialize: function (key, options) {
		if (typeof key === 'object') {
			options = key;
			key = false;
		}
		L.TileLayer.prototype.initialize.call(this, null, options);

		options = this.options;
		options.key = options.key || options.bingMapsKey;
		options.imagerySet = options.imagerySet || options.type;
		if (key) { options.key = key; }
	},

	tile2quad: function (x, y, z) {
		var quad = '';
		for (var i = z; i > 0; i--) {
			var digit = 0;
			var mask = 1 << i - 1;
			if ((x & mask) !== 0) { digit += 1; }
			if ((y & mask) !== 0) { digit += 2; }
			quad = quad + digit;
		}
		return quad;
	},

	getTileUrl: function (coords) {
		var data = {
			subdomain: this._getSubdomain(coords),
			quadkey: this.tile2quad(coords.x, coords.y, this._getZoomForUrl()),
			culture: this.options.culture // compatibility for deprecated imagery sets ('Road' etc)
		};
		return L.Util.template(this._url, data);
	},

	callRestService: function (request, callback, context) {
		context = context || this;
		var uniqueName = '_bing_metadata_' + L.Util.stamp(this);
		while (window[uniqueName]) { uniqueName += '_'; }
		request += '&jsonp=' + uniqueName;
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('src', request);
		window[uniqueName] = function (response) {
			delete window[uniqueName];
			script.remove();
			if (response.errorDetails) {
				throw new Error(response.errorDetails);
			}
			callback.call(context, response);
		};
		document.body.appendChild(script);
	},

	_makeApiUrl: function (restApi, resourcePath, query) {
		var baseAPIparams = {
			version: 'v1',
			restApi: restApi,
			resourcePath: resourcePath
		};
		query = L.extend({
			// errorDetail: true, // seems no effect
			key: this.options.key
		}, query);

		// https://docs.microsoft.com/en-us/bingmaps/rest-services/common-parameters-and-types/base-url-structure
		var template = 'https://dev.virtualearth.net/REST/{version}/{restApi}/{resourcePath}'; // ?queryParameters&key=BingMapsKey
		return L.Util.template(template, baseAPIparams) + L.Util.getParamString(query);
	},

	loadMetadata: function () {
		if (this.metaRequested) { return; }
		this.metaRequested = true;
		var options = this.options;
		// https://docs.microsoft.com/en-us/bingmaps/rest-services/imagery/get-imagery-metadata#complete-metadata-urls
		var request = this._makeApiUrl('Imagery/Metadata', options.imagerySet, {
			UriScheme: 'https',
			include: 'ImageryProviders',
			culture: options.culture,
			style: options.style
		});
		this.callRestService(request, function (meta) {
			var r = meta.resourceSets[0].resources[0];
			if (!r.imageUrl) { throw new Error('imageUrl not found in response'); }
			if (r.imageUrlSubdomains) { options.subdomains = r.imageUrlSubdomains; }
			this._providers = r.imageryProviders ? this._prepAttrBounds(r.imageryProviders) : [];
			this._attributions = [];
			this._url = r.imageUrl;
			if (options.retinaDpi && options.detectRetina && options.zoomOffset) {
				this._url += '&dpi=' + options.retinaDpi;
			}
			this.fire('load', {meta: meta});
			if (this._map) { this._update(); }
		});
	},

	_prepAttrBounds: function (providers) {
		providers.forEach(function (provider) {
			provider.coverageAreas.forEach(function (area) {
				area.bounds = L.latLngBounds(
					[area.bbox[0], area.bbox[1]],
					[area.bbox[2], area.bbox[3]]
				);
			});
		});
		return providers;
	},

	_update: function (center) {
		if (!this._url) { return; }
		L.GridLayer.prototype._update.call(this, center);
		this._update_attribution();
	},

	_update_attribution: function (remove) {
		var attributionControl = this._map.attributionControl;
		if (!attributionControl) {
			this._attributions = {}; return;
		}
		var bounds = this._map.getBounds();
		bounds = L.latLngBounds(bounds.getSouthWest().wrap(), bounds.getNorthEast().wrap());
		var zoom = this._getZoomForUrl();
		var attributions = this._providers.map(function (provider) {
			return remove ? false : provider.coverageAreas.some(function (area) {
				return zoom <= area.zoomMax && zoom >= area.zoomMin &&
					bounds.intersects(area.bounds);
			});
		});
		attributions.forEach(function (a,i) {
			if (a == this._attributions[i]) { // eslint-disable-line eqeqeq
				return;
			} else if (a) {
				attributionControl.addAttribution(this._providers[i].attribution);
			} else {
				attributionControl.removeAttribution(this._providers[i].attribution);
			}
		}, this);
		this._attributions = attributions;
	},

	onAdd: function (map) {
		// Note: Metadata could be loaded earlier, on layer initialize,
		//       but according to docs even such request is billable:
		//       https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/understanding-bing-maps-transactions#rest-services
		//       That's why it's important to defer it till BingLayer is actually added to map
		this.loadMetadata();
		L.GridLayer.prototype.onAdd.call(this, map);
	},

	onRemove: function (map) {
		if (this._providers) { this._update_attribution(true); }
		L.GridLayer.prototype.onRemove.call(this, map);
	}
});

L.bingLayer = function (key, options) {
	return new L.BingLayer(key, options);
};


;

    // https://github.com/shramov/leaflet-plugins/blob/master/layer/tile/Bing.addon.applyMaxNativeZoom.js
    // *** included: external/Bing.addon.applyMaxNativeZoom.js ***
/*
 * Metadata response has `zoomMin`/`zoomMax` properties, that currently (in most cases) are constant: `1`/`21`.
 * But in fact, imagery for 'Aerial*' and (deprecated) 'Road' sets may be absent at high zoom levels,
 * depending on location.
 * This addon is intended to find and apply *real* maximum available zoom (for current location) on layer add.
 * Ref: https://stackoverflow.com/questions/12788245/bing-maps-determine-max-zoom-level-for-static-aerial-map-with-rest-imagery-api
 *
 * @option applyMaxNativeZoom: Boolean|String = 'auto'
 * Determines whether `applyMaxNativeZoom` method will be called on layer add.
 * 'auto' means that option will be active for 'Aerial*' and 'Road' imagery sets
 * (but only if `maxNativeZoom` is not explicitely provided in options).
 *
 * @option applyMaxNativeZoom_validityRadius: Number = 10000000
 * Limits validity of 'measured' max zoom to specified radius.
 * Metadata requests are asynchronous, so when result is ready actual map position can be already changed.
 * if distance between old and new locations is longer than defined by this option,
 * then maxNativeZoom will be recalculated for new position.
 *
 * @method applyMaxNativeZoom(latlng: LatLng): this
 * Try to find maximum available zoom (for current location), and apply it as `maxNativeZoom`.
 * There is no official way, so use heuristic: check `vintageStart` in metadata response.
 * Currently method makes sense for 'Aerial*' and 'Road' imagery sets only.
 *
 * @event maxNativeZoomApplied: Event
 * Fired when applyMaxNativeZoom method succeed.
 * Extends event object with these properties: value, oldValue, latlng.
 */

L.BingLayer.mergeOptions({
        applyMaxNativeZoom: 'auto',
        applyMaxNativeZoom_validityRadius: 10000000
});

L.BingLayer.addInitHook(function () {
	var options = this.options;
	if (options.applyMaxNativeZoom === 'auto' && !options.maxNativeZoom) {
		options.applyMaxNativeZoom = options.imagerySet === 'Road' ||
			options.imagerySet.substring(0,6) === 'Aerial';
	}
	if (options.applyMaxNativeZoom) {
		this.on('add',function () {
			this.applyMaxNativeZoom(this._map.getCenter());
		});
	}
});

L.BingLayer.include({
	applyMaxNativeZoom: function (latlng) {
		var options = this.options;
		// https://docs.microsoft.com/en-us/bingmaps/rest-services/imagery/get-imagery-metadata#basic-metadata-url
		var request = this._makeApiUrl('Imagery/BasicMetadata', L.Util.template('{imagerySet}/{centerPoint}', {
			imagerySet: options.imagerySet,
			centerPoint: L.Util.template('{lat},{lng}', latlng)
		}));
		var zoomOffset = options.zoomOffset || 0;  // detectRetina sideeffects on maxZoom / maxNativeZoom
		this._findVintage(request, options.maxZoom + zoomOffset, function (zoom) {
			if (!zoom || !this._map) { return; }
			var newLatlng = this._map.getCenter();
			var validityRadius = this.options.applyMaxNativeZoom_validityRadius;
			if (newLatlng.distanceTo(latlng) > validityRadius) {
				this.applyMaxNativeZoom(newLatlng); return;
			}
			zoom -= zoomOffset;
			var oldValue = options.maxNativeZoom || options.maxZoom;
			options.maxNativeZoom = zoom;
			var mapZoom = this._map.getZoom();
			if (zoom<oldValue && zoom<mapZoom || zoom>oldValue && mapZoom>oldValue) {
				this._resetView();
			}
			this.fire('maxNativeZoomApplied',{
				latlng: latlng,
				value: zoom,
				oldValue: oldValue
			});
		});
		return this;
	},

	_findVintage: function (request, zoomLevel, callback, context) {
		// there is no official way, so use heuristic: check `vintageStart` in metadata response
		this.callRestService(request + '&zoomLevel='+zoomLevel, function (meta) {
			if (meta.resourceSets[0].resources[0].vintageStart || zoomLevel === 0) {
				return callback.call(context || this, zoomLevel);
			}
			this._findVintage(request, zoomLevel-1, callback, context);
		});
	}
});


;

    } catch (e) {
      console.error('Bing.js loading failed');
      throw e;
    }
}

setup.info = plugin_info; //add the script info data to the function as a property
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

