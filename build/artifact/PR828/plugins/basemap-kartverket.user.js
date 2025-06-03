// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Kartverket.no maps (Norway)
// @category       Map Tiles
// @version        0.3.1.20250603.064658
// @description    Add Kartverket.no map layers.
// @id             basemap-kartverket
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR828/plugins/basemap-kartverket.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR828/plugins/basemap-kartverket.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-kartverket.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-06-03-064658';
plugin_info.pluginId = 'basemap-kartverket';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.3.1',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.0',
    changes: [
      'Migrated to new WMTS server due to deprecation of Statkart opencache',
      'Version upgrade due to a change in the wrapper: plugin icons are now vectorized',
    ],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapKartverket = {};

mapKartverket.setup = function () {
  L.TileLayer.Kartverket = L.TileLayer.extend({
    baseUrl: 'https://cache.kartverket.no/v1/wmts/1.0.0/' + '{layer}/default/webmercator/{z}/{y}/{x}.png',

    options: {
      maxNativeZoom: 18,
      attribution: '&copy; <a href="http://kartverket.no">Kartverket</a>',
    },

    mappings: {
      bakgrunnskart_forenklet: 'topograatone',
      egk: 'topo', // *1
      europa: 'topo', // *1
      havbunn_grunnkart: 'topo', // *1
      kartdata2: 'topo',
      matrikkel_bakgrunn: 'topo',
      matrikkel_bakgrunn2: 'topo',
      norges_grunnkart: 'topo',
      norges_grunnkart_graatone: 'topograatone',
      norgeskart_bakgrunn: 'topo',
      sjo_hovedkart2: 'topo', // *1
      sjokartraster: 'topo', // *1
      terreng_norgeskart: 'topo',
      toporaster3: 'toporaster',
      topo2: 'topo',
      topo4: 'topo',
      topo2graatone: 'topograatone',
      topo4graatone: 'topograatone',
      // *1 = This layer is not provided on cache.kartverket.no.
    },

    layers: {
      topo: 'Kartverket Topo (farger)',
      topograatone: 'Kartverket Topo (gråtone)',
      toporaster: 'Kartverket Topo (raster)',
    },

    initialize: function (layer, options) {
      if (typeof this.layers[layer] === 'undefined') {
        if (this.mappings[layer]) {
          layer = this.mappings[layer];
        } else {
          throw new Error('Unknown layer "' + layer + '"');
        }
      }

      L.TileLayer.prototype.initialize.call(this, this.baseUrl, options);
      this.options.layer = layer;
      this._name = this.layers[layer] || layer;
    },
  });

  L.tileLayer.kartverket = function (layer, options) {
    return new L.TileLayer.Kartverket(layer, options);
  };

  L.tileLayer.kartverket.getLayers = function () {
    return L.extend({}, L.TileLayer.Kartverket.prototype.layers);
  };

  var l, layer;
  for (layer in L.tileLayer.kartverket.getLayers()) {
    l = L.tileLayer.kartverket(layer);
    window.layerChooser.addBaseLayer(l, l._name);
  }
};

function setup() {
  mapKartverket.setup();
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

