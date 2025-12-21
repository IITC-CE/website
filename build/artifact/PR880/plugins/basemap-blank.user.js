// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Blank map
// @category       Map Tiles
// @version        0.1.6.20251221.200138
// @description    Add a blank map layer - no roads or other features.
// @id             basemap-blank
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR880/plugins/basemap-blank.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR880/plugins/basemap-blank.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-blank.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-12-21-200138';
plugin_info.pluginId = 'basemap-blank';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.6',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.5',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.4',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var mapTileBlank = {};

mapTileBlank.addLayer = function () {
  var blankOpt = { attribution: '', maxNativeZoom: 18, maxZoom: 21 };
  var blankWhite = new L.TileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gEFCSU6z3A8pwAAAA1JREFUCNdj+P///38ACfsD/dGDjPAAAAAASUVORK5CYII=', blankOpt);
  var blankBlack = new L.TileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gEFCQkJSZE2HwAAAAxJREFUCNdjYGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==', blankOpt);

  window.layerChooser.addBaseLayer(blankWhite, 'Blank Map (White)');
  window.layerChooser.addBaseLayer(blankBlack, 'Blank Map (Black)');
};

function setup() {
  mapTileBlank.addLayer();
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

