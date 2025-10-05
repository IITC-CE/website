// ==UserScript==
// @author         xelio
// @name           IITC plugin: Reso energy % in portal details
// @category       Portal Info
// @version        0.1.5.20251005.103114
// @description    Show resonator energy percentage on resonator energy bar in portal details panel.
// @id             reso-energy-pct
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR871/plugins/reso-energy-pct.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR871/plugins/reso-energy-pct.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/reso-energy-pct.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-10-05-103114';
plugin_info.pluginId = 'reso-energy-pct';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.resoEnergyPctInPortalDetail = function () {};

window.plugin.resoEnergyPctInPortalDetail.updateMeter = function () {
  $('span.meter-level')
    .css({
      'word-spacing': '-1px',
      'text-align': 'left',
      'font-size': '90%',
      'padding-left': '2px',
    })
    .each(function () {
      var matchResult = $(this)
        .parent()
        .attr('title')
        .match(/\((\d*%)\)/);
      if (matchResult) {
        var html = $(this).html() + '<div style="position:absolute;right:0;top:0">' + matchResult[1] + '</div>';
        $(this).html(html);
      }
    });
};

var setup = function () {
  window.addHook('portalDetailsUpdated', window.plugin.resoEnergyPctInPortalDetail.updateMeter);
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

