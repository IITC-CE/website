// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Cache viewed portals on map
// @category       Cache
// @version        0.1.3.20250421.081940
// @description    Cache the details of recently viewed portals and use this to populate the map when possible
// @id             cache-portals-on-map
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR814/plugins/cache-portals-on-map.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR814/plugins/cache-portals-on-map.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/cache-portals-on-map.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-04-21-081940';
plugin_info.pluginId = 'cache-portals-on-map';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.cachePortalDetailsOnMap = function () {};

window.plugin.cachePortalDetailsOnMap.MAX_AGE = 12 * 60 * 60; // 12 hours max age for cached data

window.plugin.cachePortalDetailsOnMap.portalDetailLoaded = function (data) {
  if (data.success) {
    window.plugin.cachePortalDetailsOnMap.cache[data.guid] = { loadtime: Date.now(), ent: data.ent };
  }
};

window.plugin.cachePortalDetailsOnMap.entityInject = function (data) {
  var maxAge = Date.now() - window.plugin.cachePortalDetailsOnMap.MAX_AGE * 1000;

  var ents = [];
  for (var guid in window.plugin.cachePortalDetailsOnMap.cache) {
    if (window.plugin.cachePortalDetailsOnMap.cache[guid].loadtime < maxAge) {
      delete window.plugin.cachePortalDetailsOnMap.cache[guid];
    } else {
      ents.push(window.plugin.cachePortalDetailsOnMap.cache[guid].ent);
    }
  }
  data.callback(ents, 'detailed');
};

window.plugin.cachePortalDetailsOnMap.setup = function () {
  window.plugin.cachePortalDetailsOnMap.cache = {};

  window.addHook('portalDetailLoaded', window.plugin.cachePortalDetailsOnMap.portalDetailLoaded);
  window.addHook('mapDataEntityInject', window.plugin.cachePortalDetailsOnMap.entityInject);
};

var setup = window.plugin.cachePortalDetailsOnMap.setup;

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

