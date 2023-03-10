// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Highlight high level portals
// @category       Highlighter
// @version        0.2.0.20230310.223447
// @description    Use the portal fill color to denote high level portals: Purple L8, Red L7, Orange L6
// @id             highlight-high-level
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR621/plugins/highlight-high-level.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR621/plugins/highlight-high-level.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-03-10-223447';
plugin_info.pluginId = 'highlight-high-level';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global L */
// use own namespace for plugin
var highLevel = {};
window.plugin.highlightHighLevel = highLevel;

highLevel.styles = {
  common: {
    fillOpacity: 0.7
  },
  level6: {
    fillColor: 'orange'
  },
  level7: {
    fillColor: 'red'
  },
  level8: {
    fillColor: 'magenta'
  }
};

function highlightHighLevel (data) {
  var portal_level = data.portal.options.data.level;
  if (portal_level === undefined) return;           // continue on 0..8
  var newStyle= L.extend ( {},
    highLevel.styles.common,
    highLevel.styles['level'+portal_level]
  );

  if (newStyle.fillColor) {
    data.portal.setStyle(newStyle);
  }
}

function setup () {
  window.addPortalHighlighter('Higher Level Portals', highlightHighLevel);
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

