// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Bing maps
// @category       Map Tiles
// @version        0.4.0.20260922.111240
// @description    Add the bing.com map layers.
// @id             basemap-bing
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR968/plugins/basemap-bing.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR968/plugins/basemap-bing.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-bing.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2026-09-22-111240';
plugin_info.pluginId = 'basemap-bing';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

const changelog = [
  {
    version: '0.4.0',
    changes: [
      'Fix the layers failing to load after Bing shut down free API keys',
      'Dark layer is now the road map recolored, as Bing no longer serves its dark imagery set',
      'Zoom levels above the available imagery are upscaled instead of detected per location',
      'Request high density tiles on retina displays',
    ],
  },
  {
    version: '0.3.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
const mapBing = {};

mapBing.tileServer = 'https://{subdomain}.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{quadkey}';

// recoloring of the road map, since the imagery sets are limited to what the tile server renders
// https://learn.microsoft.com/en-us/bingmaps/styling/map-style-sheet-entries
mapBing.darkStyle = [
  'g|landColor:1B1B1B',
  'me|lbc:CFCFCF;loc:141414',
  'ar|fc:1F1F1F',
  'vg|fc:16281C',
  'wt|fc:0C1A2A;lbc:6E93B8',
  'str|fc:262626',
  'trs|fc:3A3A3A',
  'rd|fc:3A3A3A;sc:1F1F1F',
  'cah|fc:4A4A4A;sc:1F1F1F',
  'hg|fc:454545;sc:1F1F1F',
  'mr|fc:404040;sc:1F1F1F',
  'ard|fc:3C3C3C;sc:1F1F1F',
  'st|fc:333333;sc:1F1F1F',
  'rl|fc:2E2E2E',
  'pl|sc:4A4A4A',
].join('_');

mapBing.sets = {
  Road: {
    imageUrl: `${mapBing.tileServer}?mkt={culture}&it=G,L&shading=hill&og=2735&n=z`,
    maxTileZoom: 20,
    isDark: false,
  },
  Dark: {
    imageUrl: `${mapBing.tileServer}?mkt={culture}&it=G,L&shading=hill&og=2735&n=z&st=${mapBing.darkStyle}`,
    maxTileZoom: 20,
    isDark: true,
  },
  Aerial: {
    imageUrl: `${mapBing.tileServer}?it=A&og=2735&n=z`,
    maxTileZoom: 19,
    isDark: true,
  },
  Hybrid: {
    imageUrl: `${mapBing.tileServer}?mkt={culture}&it=A,G,L&og=2735&n=z`,
    maxTileZoom: 19,
    isDark: true,
  },
};

mapBing.options = {
  subdomains: ['t0', 't1', 't2', 't3'],
  detectRetina: true,
};

function setup() {
  setupBingLeaflet();
  useStaticTileUrls();
  applyTileZoomLimits();

  for (const [name, set] of Object.entries(mapBing.sets)) {
    const options = { ...mapBing.options, ...set };
    window.layerChooser.addBaseLayer(L.bingLayer(options), `Bing ${name}`, { isDark: options.isDark });
  }
}

function setupBingLeaflet() {
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
			this.fire('load', { meta: meta });
			if (this._map) { this._update(); }
		});
	},

	_prepAttrBounds: function (providers) {
		providers.forEach(function (provider) {
			provider.coverageAreas.forEach(function (area) {
				area.bounds = new L.LatLngBounds(
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
		bounds = new L.LatLngBounds(bounds.getSouthWest().wrap(), bounds.getNorthEast().wrap());
		var zoom = this._getZoomForUrl();
		var attributions = this._providers.map(function (provider) {
			return remove ? false : provider.coverageAreas.some(function (area) {
				return zoom <= area.zoomMax && zoom >= area.zoomMin &&
					bounds.intersects(area.bounds);
			});
		});
		attributions.forEach(function (a, i) {
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


; // eslint-disable-line
  } catch (e) {
    console.error('Bing.js loading failed');
    throw e;
  }
}

// The Imagery Metadata service that supplies the tile url templates requires an API key,
// and Bing rejects the free ones, so the templates are kept in `mapBing.sets` instead
function useStaticTileUrls() {
  L.BingLayer.include({
    loadMetadata: function () {
      if (this.metaRequested) {
        return;
      }
      this.metaRequested = true;
      const { imageUrl, retinaDpi, detectRetina, zoomOffset } = this.options;
      this._providers = [];
      this._attributions = [];
      this._url = retinaDpi && detectRetina && zoomOffset ? `${imageUrl}&dpi=${retinaDpi}` : imageUrl;
      this.fire('load');
      if (this._map) {
        this._update();
      }
    },
  });
}

// `maxTileZoom` is the deepest level Bing renders, while `maxNativeZoom` is compared against
// the map zoom; on retina displays `detectRetina` requests one level deeper and lowers
// `maxZoom` by the same offset, so both limits are restated once the offset is known
function applyTileZoomLimits() {
  L.BingLayer.addInitHook(function () {
    const { options } = this;
    const zoomOffset = options.zoomOffset || 0;
    options.maxZoom += zoomOffset;
    options.maxNativeZoom = options.maxTileZoom - zoomOffset;
  });
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

