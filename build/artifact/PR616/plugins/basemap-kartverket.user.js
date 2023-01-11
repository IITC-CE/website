// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Kartverket.no maps (Norway)
// @category       Map Tiles
// @version        0.2.2.20230111.091118
// @description    Add Kartverket.no map layers.
// @id             basemap-kartverket
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR616/plugins/basemap-kartverket.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR616/plugins/basemap-kartverket.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-01-11-091118';
plugin_info.pluginId = 'basemap-kartverket';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global L, layerChooser */
// use own namespace for plugin
var mapKartverket = {};

mapKartverket.setup = function () {

  L.TileLayer.Kartverket = L.TileLayer.extend({

    baseUrl: 'https://opencache{s}.statkart.no/gatekeeper/gk/gk.open_gmaps?'
           + 'layers={layer}&zoom={z}&x={x}&y={y}',

    options: {
      maxNativeZoom: 18,
      attribution: '&copy; <a href="http://kartverket.no">Kartverket</a>',
      subdomains: ['', '2', '3']
    },

    mappings: {
      kartdata2: 'topo4',
      matrikkel_bakgrunn: 'matrikkel_bakgrunn2',
      norgeskart_bakgrunn: 'topo4',
      sjo_hovedkart2: 'sjokartraster',
      toporaster: 'toporaster3',
      topo2: 'topo4',
      topo2graatone: 'topo4graatone'
    },

    layers: {
      matrikkel_bakgrunn2:'Matrikkel bakgrunn',
      topo4:              'Topografisk norgeskart',
      topo4graatone:      'Topografisk norgeskart gråtone',
      europa:             'Europakart',
      toporaster3:        'Topografisk norgeskart, raster',
      sjokartraster:      'Sjøkart hovedkartserien',
      norges_grunnkart:   'Norges Grunnkart',
      norges_grunnkart_graatone: 'Norges grunnkart gråtone',
      egk:                'Europeiske grunnkart',
      terreng_norgeskart: 'Terreng',
      havbunn_grunnkart:  'Havbunn grunnkart',
      bakgrunnskart_forenklet: null
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
    }

  });

  L.tileLayer.kartverket = function (layer, options) {
    return new L.TileLayer.Kartverket(layer, options);
  };

  L.tileLayer.kartverket.getLayers = function () {
    return L.extend({},L.TileLayer.Kartverket.prototype.layers);
  };

  var l, layer;
  for (layer in L.tileLayer.kartverket.getLayers()) {
    l = L.tileLayer.kartverket(layer);
    layerChooser.addBaseLayer(l, l._name);
  }
};

function setup() {
  mapKartverket.setup();
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

