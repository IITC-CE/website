// ==UserScript==
// @author         jacob1123
// @name           IITC plugin: Gray Google map
// @category       Map Tiles
// @version        0.1.7.20251130.074700
// @description    Add a simplified gray Version of Google map tiles as an optional layer.
// @id             basemap-google-gray
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/basemap-google-gray.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/basemap-google-gray.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-google-gray.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-11-30-074700';
plugin_info.pluginId = 'basemap-google-gray';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.7',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.6',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.5',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var grayGMaps = {};

grayGMaps.addLayer = function () {
  var grayGMapsOptions = {
    maxZoom: 21,
    styles: [
      { featureType: 'landscape.natural', stylers: [{ visibility: 'simplified' }, { saturation: -100 }, { lightness: -80 }, { gamma: 2.44 }] },
      { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#bebebe' }, { weight: 0.6 }] },
      { featureType: 'poi', stylers: [{ saturation: -100 }, { visibility: 'on' }, { gamma: 0.34 }] },
      { featureType: 'water', stylers: [{ color: '#32324f' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi' },
      { featureType: 'landscape.man_made', stylers: [{ saturation: -100 }, { gamma: 0.13 }] },
      { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    ],
  };

  var grayGMaps = new L.GridLayer.GoogleMutant(grayGMapsOptions);

  window.layerChooser.addBaseLayer(grayGMaps, 'Google Gray');
};

function setup() {
  grayGMaps.addLayer();
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

