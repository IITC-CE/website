// ==UserScript==
// @author         screach
// @name           IITC plugin: Highlight moved portals
// @category       Highlighter
// @version        0.1.0.20240808.195742
// @description    Highlights portals with links with different location data
// @id             highlight-moved-portals
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR747/plugins/highlight-moved-portals.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR747/plugins/highlight-moved-portals.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/highlight-moved-portals.png
// @icon64         https://iitc.app/extras/plugin-icons/highlight-moved-portals-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-08-08-195742';
plugin_info.pluginId = 'highlight-moved-portals';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global L */
// use own namespace for plugin
var movedPortals = {};
window.plugin.portalHighlighterMovedPortals = movedPortals;

// exposed objects
movedPortals.styles = {
  fillOpacity: 1,
  fillColor: '#FF0000',
};

var getLinkData = (lguid) => {
  return window.links[lguid].options.data;
};

var toLatLng = (latE6, lngE6) => {
  return L.latLng(latE6 / 1e6, lngE6 / 1e6);
};

var getDLatLng = (lguid) => {
  var linkData = getLinkData(lguid);
  return toLatLng(linkData.dLatE6, linkData.dLngE6);
};

var getOLatLng = (lguid) => {
  var linkData = getLinkData(lguid);
  return toLatLng(linkData.oLatE6, linkData.oLngE6);
};

movedPortals.highlightMovedPortals = (data) => {
  var portalData = data.portal.options.data;
  var latLng = toLatLng(portalData.latE6, portalData.lngE6);

  var portalLinks = window.getPortalLinks(data.portal.options.guid);
  if (portalLinks.in.some((lguid) => !getDLatLng(lguid).equals(latLng)) || portalLinks.out.some((lguid) => !getOLatLng(lguid).equals(latLng))) {
    data.portal.setStyle(movedPortals.styles);
  }
};

var setup = () => {
  window.addPortalHighlighter('Moved portals', movedPortals.highlightMovedPortals);
};

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

