// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: OpenStreetMap.org map
// @category       Map Tiles
// @version        0.1.4.20240122.084328
// @description    Add the native OpenStreetMap.org map tiles as an optional layer.
// @id             basemap-openstreetmap
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR689/plugins/basemap-openstreetmap.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR689/plugins/basemap-openstreetmap.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-openstreetmap.png
// @icon64         https://iitc.app/extras/plugin-icons/basemap-openstreetmap-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-01-22-084328';
plugin_info.pluginId = 'basemap-openstreetmap';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L, layerChooser */

// use own namespace for plugin
var mapOpenStreetMap = {};
window.plugin.mapOpenStreetMap = mapOpenStreetMap;

var changelog = [
  {
    version: '0.1.4',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
  {
    version: '0.1.3',
    changes: ['Update OSM tile provider', 'Add CyclOSM tiles', 'Expose config'],
  },
];

// https://wiki.openstreetmap.org/wiki/Raster_tile_providers

// Common options
var osmOpt = {
  attribution: 'Map data © OpenStreetMap contributors',
  maxNativeZoom: 18,
  maxZoom: 21,
};

mapOpenStreetMap.LAYERS = [
  {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: Object.assign({}, osmOpt),
  },
  {
    name: 'Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    options: Object.assign({}, osmOpt),
  },
  {
    name: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    options: Object.assign({}, osmOpt),
  },
];

function setup() {
  // OpenStreetMap tiles - we shouldn't use these by default - https://wiki.openstreetmap.org/wiki/Tile_usage_policy
  // "Heavy use (e.g. distributing an app that uses tiles from openstreetmap.org) is forbidden without prior permission from the System Administrators"

  for (var entry of mapOpenStreetMap.LAYERS) {
    var layer = new L.TileLayer(entry.url, entry.options);
    layerChooser.addBaseLayer(layer, entry.name);
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

