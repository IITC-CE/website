// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Highlight portals missing resonators
// @category       Highlighter
// @version        0.2.4.20251016.083219
// @description    Use the portal fill color to denote if the portal is missing resonators.
// @id             highlight-missing-resonators
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR876/plugins/highlight-missing-resonators.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR876/plugins/highlight-missing-resonators.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/highlight-missing-resonators.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-10-16-083219';
plugin_info.pluginId = 'highlight-missing-resonators';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var highlightMissingResonators = {};
window.plugin.highlightMissingResonators = highlightMissingResonators;

highlightMissingResonators.styles = {
  common: {
    fillColor: 'red',
  },
};

function missingResonators(data) {
  if (data.portal.options.team !== window.TEAM_NONE) {
    var res_count = data.portal.options.data.resCount;

    if (res_count !== undefined && res_count < 8) {
      var fill_opacity = ((8 - res_count) / 8) * 0.85 + 0.15;
      // Hole per missing resonator
      var dash = new Array(8 - res_count + 1).join('1,4,') + '100,0';

      var params = L.extend({}, highlightMissingResonators.styles.common, { fillOpacity: fill_opacity, dashArray: dash });

      data.portal.setStyle(params);
    }
  }
}

function setup() {
  window.addPortalHighlighter('Portals Missing Resonators', missingResonators);
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

