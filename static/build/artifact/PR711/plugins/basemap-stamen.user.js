// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Stamen.com map layers
// @category       Map Tiles
// @version        0.2.3.20240305.161024
// @description    Add the 'Toner' and 'Watercolor' map layers from maps.stamen.com.
// @id             basemap-stamen
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR711/plugins/basemap-stamen.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR711/plugins/basemap-stamen.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-stamen.png
// @icon64         https://iitc.app/extras/plugin-icons/basemap-stamen-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-03-05-161024';
plugin_info.pluginId = 'basemap-stamen';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L, layerChooser */

var changelog = [
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapStamen = {};

// see API here http://maps.stamen.com/
// https://stamen-maps.a.ssl.fastly.net/js/tile.stamen.js (overcomplicated)

mapStamen.setup = function () {
  var baseUrl = 'https://stamen-tiles-{s}.a.ssl.fastly.net/{layer}/{z}/{x}/{y}.{type}';
  var L_StamenTileLayer = L.TileLayer.extend({
    options: {
      subdomains: 'abcd',
      type: 'png',
      minZoom: 0,
      maxZoom: 21,
      attribution: [
        'Map tiles by <a href="http://stamen.com/">Stamen Design</a>, ',
        'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ',
        'Data by <a href="http://openstreetmap.org/">OpenStreetMap</a>, ',
        'under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.'
      ].join('')
    },
    initialize: function (name, options) {
      options.layer = name.replace(' ','-').toLowerCase();
      L.TileLayer.prototype.initialize.call(this, baseUrl, options);
    }
  });

  function addLayer (name,options) {
    layerChooser.addBaseLayer(new L_StamenTileLayer(name,options),'Stamen ' + name);
  }

  var options = { minZoom: 0, maxNativeZoom: 20 };
  addLayer('Toner',options);
  addLayer('Toner Background',options);
  addLayer('Toner Lite',options);
  // transparent layers. could be useful over satellite imagery or similar
  // addLayer('Toner Hybrid',options);
  // addLayer('Toner Labels',options);
  // addLayer('Toner Lines',options);

  options = { minZoom: 1, maxNativeZoom: 13 }; // Should support up to 18, but too many 404 on zoom > 13
  // addLayer('Terrain',options);
  // addLayer('Terrain Labels',options);
  // addLayer('Terrain Lines',options);
  // addLayer('Terrain Background',options);

  options = {
    minZoom: 1,
    maxZoom: 21,
    maxNativeZoom: 18,
    type: 'jpg',
    attribution: [
      'Map tiles by <a href="http://stamen.com/">Stamen Design</a>, ',
      'under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. ',
      'Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, ',
      'under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
    ].join('')
  };
  addLayer('Watercolor',options);
};

function setup() {
  mapStamen.setup();
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

