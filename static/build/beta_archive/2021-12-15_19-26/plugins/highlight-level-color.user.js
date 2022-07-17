// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Highlight portals by level color
// @category       Highlighter
// @version        0.1.2.20211215.192629
// @description    Use the portal fill color to denote the portal level by using the game level colors.
// @id             highlight-level-color
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/highlight-level-color.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/highlight-level-color.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2021-12-15-192629';
plugin_info.pluginId = 'highlight-level-color';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
window.plugin.portalHighlighterPortalsLevelColor = function() {};

window.plugin.portalHighlighterPortalsLevelColor.colorLevel = function(data) {
  var portal_level = data.portal.options.data.level;
  if (portal_level !== undefined) {
    var opacity = .6;
    data.portal.setStyle({fillColor: COLORS_LVL[portal_level], fillOpacity: opacity});
  }
}

var setup =  function() {
  window.addPortalHighlighter('Level Color', window.plugin.portalHighlighterPortalsLevelColor.colorLevel);
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

