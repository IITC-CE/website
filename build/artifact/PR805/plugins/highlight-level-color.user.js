// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Highlight portals by level color
// @category       Highlighter
// @version        0.2.3.20250328.101509
// @description    Use the portal fill color to denote the portal level by using the game level colors.
// @id             highlight-level-color
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR805/plugins/highlight-level-color.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR805/plugins/highlight-level-color.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/highlight-level-color.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-03-28-101509';
plugin_info.pluginId = 'highlight-level-color';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.2.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

function highlightLevelColor(data) {
  var portal_level = data.portal.options.data.level;
  if (portal_level !== undefined) {
    var opacity = 0.6;
    data.portal.setStyle({ fillColor: window.COLORS_LVL[portal_level], fillOpacity: opacity });
  }
}

function setup() {
  window.addPortalHighlighter('Level Color', highlightLevelColor);
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

