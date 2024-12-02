// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Highlight portal weakness
// @category       Highlighter
// @version        0.8.3.20241202.210237
// @description    Use the fill color of the portals to denote if the portal is weak. Stronger red indicates recharge required, missing resonators, or both.
// @id             highlight-weakness
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR786/plugins/highlight-weakness.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR786/plugins/highlight-weakness.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/highlight-weakness.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-12-02-210237';
plugin_info.pluginId = 'highlight-weakness';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.8.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.8.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.8.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

function weaknessHighlight(data) {
  if (data.portal.options.data.resCount !== undefined && data.portal.options.data.health !== undefined && data.portal.options.team !== window.TEAM_NONE) {
    var res_count = data.portal.options.data.resCount;
    var portal_health = data.portal.options.data.health;

    var strength = (res_count / 8) * (portal_health / 100);
    if (strength < 1) {
      var fill_opacity = (1 - strength) * 0.85 + 0.15;
      var color = 'red';
      var params = { fillColor: color, fillOpacity: fill_opacity };

      // Hole per missing resonator
      if (res_count < 8) {
        var dash = new Array(8 - res_count + 1).join('1,4,') + '100,0';
        params.dashArray = dash;
      }

      data.portal.setStyle(params);
    }
  }
}

function setup() {
  window.addPortalHighlighter('Portal Weakness', weaknessHighlight);
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

