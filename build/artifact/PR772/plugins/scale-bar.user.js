// ==UserScript==
// @author         breunigs
// @name           IITC plugin: Scale bar
// @category       Controls
// @version        0.1.4.20241028.094611
// @description    Show scale bar on the map.
// @id             scale-bar
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR772/plugins/scale-bar.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR772/plugins/scale-bar.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/scale-bar.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-10-28-094611';
plugin_info.pluginId = 'scale-bar';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var scaleBar = {};
window.plugin.scaleBar = scaleBar;

// Before you ask: yes, I explicitely turned off imperial units. Imperial units
// are worse than Internet Explorer 6 whirring fans combined. Upgrade to the metric
// system already.
scaleBar.options = { imperial: false };

scaleBar.mobileOptions = { position: 'bottomright', maxWidth: 100 };

scaleBar.desktopOptions = { position: 'topleft', maxWidth: 200 };

function moveToEdge(ctrl) {
  var $el = $(ctrl.getContainer());
  var $corner = $el.parent();
  var pos = ctrl.getPosition();
  if (pos.indexOf('top') !== -1) {
    $corner.prepend($el);
  } else if (pos.indexOf('bottom') !== -1) {
    $corner.append($el);
    $corner.find('.leaflet-control-attribution').appendTo($corner); // make sure that attribution control is on very bottom
  }
}

function setup() {
  var options = L.extend({}, window.isSmartphone() ? scaleBar.mobileOptions : scaleBar.desktopOptions, scaleBar.options);
  scaleBar.control = L.control.scale(options).addTo(window.map);
  // wait other controls to initialize (should be initialized last)
  setTimeout(function () {
    moveToEdge(scaleBar.control);
  });
}
setup.priority = 'low';

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

