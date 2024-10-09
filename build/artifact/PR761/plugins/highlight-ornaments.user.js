// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Highlight portals with ornaments
// @category       Highlighter
// @version        0.2.2.20241009.103105
// @description    Use the portal fill color to denote portals with additional 'ornament' markers. e.g. Anomaly portals
// @id             highlight-ornaments
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR761/plugins/highlight-ornaments.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR761/plugins/highlight-ornaments.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/highlight-ornaments.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-10-09-103105';
plugin_info.pluginId = 'highlight-ornaments';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var highlightOrnaments = {};
window.plugin.highlightOrnaments = highlightOrnaments;

highlightOrnaments.styles = {
  common: {
    fillColor: 'red',
    fillOpacity: 0.75
  }
};

function ornamentshighlight (data) {
  var d = data.portal.options.data;
  if (d.ornaments && d.ornaments.length > 0) {

    // TODO? match specific cases of ornament name and/or portals with multiple ornaments, and highlight in different colours?

    var params = highlightOrnaments.styles.common;
    data.portal.setStyle(params);
  }
}

function setup () {
  window.addPortalHighlighter('Ornaments (anomaly portals)', ornamentshighlight);
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

