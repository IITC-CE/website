// ==UserScript==
// @author         vita10gy
// @name           IITC plugin: Highlight portals missing resonators
// @category       Highlighter
// @version        0.1.2.20210705.160344
// @description    Use the portal fill color to denote if the portal is missing resonators. 
// @id             highlight-missing-resonators
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/highlight-missing-resonators.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/highlight-missing-resonators.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2021-07-05-160344';
plugin_info.pluginId = 'highlight-missing-resonators';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
window.plugin.portalsMissingResonators = function() {};

window.plugin.portalsMissingResonators.highlight = function(data) {

  if(data.portal.options.team != TEAM_NONE) {
    var res_count = data.portal.options.data.resCount;

    if(res_count !== undefined && res_count < 8) {
      var fill_opacity = ((8-res_count)/8)*.85 + .15;
      var color = 'red';
      var params = {fillColor: color, fillOpacity: fill_opacity};

      // Hole per missing resonator
      var dash = new Array((8 - res_count) + 1).join("1,4,") + "100,0"
      params.dashArray = dash;

      data.portal.setStyle(params);
    } 
  }
}

var setup =  function() {
  window.addPortalHighlighter('Portals Missing Resonators', window.plugin.portalsMissingResonators.highlight);
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

