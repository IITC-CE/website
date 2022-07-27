// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Remove extra layers
// @category       Layer
// @version        0.1.0.20220727.211010
// @description    Remove 'Artifacts', 'Beacons' and 'Frackers' from layerChooser (still keeping them on map)
// @id             remove-extra-layers
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR579/plugins/remove-extra-layers.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR579/plugins/remove-extra-layers.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2022-07-27-211010';
plugin_info.pluginId = 'remove-extra-layers';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
var removeExtraLayers = {};
window.plugin.remove = removeExtraLayers;

removeExtraLayers.names = ['Artifacts', 'Beacons', 'Frackers'];

function setup () {
  removeExtraLayers.names.forEach(function (name) {
    window.layerChooser.removeLayer(name, {keepOnMap: true});
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

