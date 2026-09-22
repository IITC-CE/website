// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Stamen.com map layers
// @category       Map Tiles
// @version        0.3.0.20260922.111240
// @description    Add the Stamen map layers, hosted by Stadia Maps.
// @id             basemap-stamen
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR968/plugins/basemap-stamen.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR968/plugins/basemap-stamen.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/basemap-stamen.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2026-09-22-111240';
plugin_info.pluginId = 'basemap-stamen';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

const changelog = [
  {
    version: '0.3.0',
    changes: [
      'Fix the layers failing to load after Stamen shut down its tile servers',
      'Tiles now come from Stadia Maps',
      'Add the Terrain and Toner Dark layers',
      'Request high density tiles on retina displays',
      'Fix the Watercolor zoom limit',
    ],
  },
  {
    version: '0.2.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
const mapStamen = {};

// Stadia Maps hosts the Stamen styles and serves them to registered accounts only
// https://docs.stadiamaps.com/authentication
mapStamen.apiKey = '51a526b0-a035-4b6b-9c35-778bdff3095d';

// `{r}` is filled with `@2x` on retina displays, where Stadia renders the tile at double resolution
mapStamen.tileServer = 'https://tiles.stadiamaps.com/tiles/{layer}/{z}/{x}/{y}{r}.{type}';

mapStamen.attribution = [
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> ',
  '&copy; <a href="https://stamen.com/">Stamen Design</a> ',
  '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ',
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
].join('');

// watercolor is painted straight from OpenStreetMap, without the OpenMapTiles schema the other styles use
mapStamen.watercolorAttribution = [
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> ',
  '&copy; <a href="https://stamen.com/">Stamen Design</a> ',
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
].join('');

mapStamen.options = {
  minZoom: 0,
  maxZoom: 21,
  // Stadia renders one level past this, but each level costs four times the tiles, so the last one is upscaled
  maxNativeZoom: 20,
  type: 'png',
  attribution: mapStamen.attribution,
};

mapStamen.sets = {
  Toner: { isDark: false },
  'Toner Background': { isDark: false },
  'Toner Lite': { isDark: false },
  'Toner Dark': { isDark: true },
  Terrain: { isDark: true },
  // transparent layers. could be useful over satellite imagery or similar
  // 'Toner Lines': { isDark: false },
  // 'Toner Labels': { isDark: false },
  // 'Terrain Lines': { isDark: false },
  // 'Terrain Labels': { isDark: false },
  Watercolor: {
    type: 'jpg',
    maxNativeZoom: 16,
    attribution: mapStamen.watercolorAttribution,
    isDark: true,
  },
};

function setup() {
  const url = mapStamen.apiKey ? `${mapStamen.tileServer}?api_key=${mapStamen.apiKey}` : mapStamen.tileServer;

  for (const [name, set] of Object.entries(mapStamen.sets)) {
    const layer = `stamen_${name.replace(/ /g, '_').toLowerCase()}`;
    const options = { ...mapStamen.options, ...set, layer };
    window.layerChooser.addBaseLayer(L.tileLayer(url, options), `Stamen ${name}`, { isDark: options.isDark });
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

