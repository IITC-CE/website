// ==UserScript==
// @author         johtata
// @name           IITC plugin: Ornament icons extended
// @category       Layer
// @version        0.1.0.20221102.100622
// @description    Additonal icons and names for beacons
// @id             ornament-icons-extended
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR593/plugins/ornament-icons-extended.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR593/plugins/ornament-icons-extended.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2022-11-02-100622';
plugin_info.pluginId = 'ornament-icons-extended';
//END PLUGIN AUTHORS NOTE

// peNIA, peNEMESIS, peVIALUX, peVIANOIR, peAEIGSNOVA, etc.

// use own namespace for plugin
window.plugin.ornamentIconsExt = function () {};

window.plugin.ornamentIconsExt.jsonUrl = 'https://iitc.app/extras/ornaments/definitions_ext.json';

// append or overwrite external definitions
window.plugin.ornamentIconsExt.setIcons = function(externalIconDefinitions) {
  const localIconDefinitions = {
    // no local definitions here
  };
  window.ornaments.icon = {...window.ornaments.icon, ...externalIconDefinitions, ...localIconDefinitions};
}

function setup () {
  fetch(window.plugin.ornamentIconsExt.jsonUrl).then(response => {
    response.json().then(data => {
      window.plugin.ornamentIconsExt.setIcons(data.ornaments);
    })
  });
}
/* exported setup */

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

