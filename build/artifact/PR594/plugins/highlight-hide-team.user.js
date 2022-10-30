// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Hide portal ownership
// @category       Highlighter
// @version        0.2.0.20221030.225920
// @description    Show all portals as neutral, as if uncaptured. Great for creating plans.
// @id             highlight-hide-team
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR594/plugins/highlight-hide-team.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR594/plugins/highlight-hide-team.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2022-10-30-225920';
plugin_info.pluginId = 'highlight-hide-team';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global TEAM_NONE, getMarkerStyleOptions*/

function hideOwnership (data) {
  var params = getMarkerStyleOptions({team: TEAM_NONE, level: 0});
  data.portal.setStyle(params);
}

function setup () {
  window.addPortalHighlighter('Hide portal ownership', hideOwnership);
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

