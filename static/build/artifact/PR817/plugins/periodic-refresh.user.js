// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Periodic refresh
// @category       Tweaks
// @version        0.1.3.20250428.013008
// @description    For use for unattended display screens only, this plugin causes idle mode to be left once per hour.
// @id             periodic-refresh
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR817/plugins/periodic-refresh.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR817/plugins/periodic-refresh.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/periodic-refresh.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-04-28-013008';
plugin_info.pluginId = 'periodic-refresh';
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

window.plugin.periodicRefresh = function () {};

window.plugin.periodicRefresh.wakeup = function () {
  console.log('periodicRefresh: timer fired - leaving idle mode');
  window.idleReset();
};

window.plugin.periodicRefresh.setup = function () {
  var refreshMinutes = 60;

  setInterval(window.plugin.periodicRefresh.wakeup, refreshMinutes * 60 * 1000);
};

var setup = window.plugin.periodicRefresh.setup;

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

