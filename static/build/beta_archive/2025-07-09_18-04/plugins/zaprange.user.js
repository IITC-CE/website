// ==UserScript==
// @author         ZasoGD
// @name           IITC plugin: Zaprange
// @category       Layer
// @version        0.1.8.20250709.180413
// @description    Shows the maximum range of attack by the portals.
// @id             zaprange
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/zaprange.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/zaprange.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/zaprange.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-07-09-180413';
plugin_info.pluginId = 'zaprange';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.1.8',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.1.7',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.1.6',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.zaprange = function () {};
window.plugin.zaprange.zapLayers = {};
window.plugin.zaprange.MIN_MAP_ZOOM = 16;

window.plugin.zaprange.portalAdded = function (data) {
  data.portal.on('add', function () {
    window.plugin.zaprange.draw(this.options.guid, this.options.team);
  });

  data.portal.on('remove', function () {
    window.plugin.zaprange.remove(this.options.guid, this.options.team);
  });
};

window.plugin.zaprange.remove = function (guid, faction) {
  var previousLayer = window.plugin.zaprange.zapLayers[guid];
  if (previousLayer) {
    if (faction === window.TEAM_ENL) {
      window.plugin.zaprange.zapCircleEnlHolderGroup.removeLayer(previousLayer);
    } else {
      window.plugin.zaprange.zapCircleResHolderGroup.removeLayer(previousLayer);
    }
    delete window.plugin.zaprange.zapLayers[guid];
  }
};

window.plugin.zaprange.draw = function (guid, faction) {
  var d = window.portals[guid];

  if (faction !== window.TEAM_NONE) {
    var coo = d._latlng;
    var latlng = new L.LatLng(coo.lat, coo.lng);
    var portalLevel = d.options.level;
    var optCircle = { color: 'red', opacity: 0.7, fillColor: 'red', fillOpacity: 0.1, weight: 1, interactive: false, dashArray: [10, 6] };
    var range = 5 * portalLevel + 35;

    var circle = new L.Circle(latlng, range, optCircle);

    if (faction === window.TEAM_ENL) {
      circle.addTo(window.plugin.zaprange.zapCircleEnlHolderGroup);
    } else {
      circle.addTo(window.plugin.zaprange.zapCircleResHolderGroup);
    }
    window.plugin.zaprange.zapLayers[guid] = circle;
  }
};

window.plugin.zaprange.showOrHide = function () {
  if (window.map.getZoom() >= window.plugin.zaprange.MIN_MAP_ZOOM) {
    // show the layer
    if (!window.plugin.zaprange.zapLayerEnlHolderGroup.hasLayer(window.plugin.zaprange.zapCircleEnlHolderGroup)) {
      window.plugin.zaprange.zapLayerEnlHolderGroup.addLayer(window.plugin.zaprange.zapCircleEnlHolderGroup);
      $('.leaflet-control-layers-list span:contains("Zaprange Enlightened")').parent('label').removeClass('disabled').attr('title', '');
    }
    if (!window.plugin.zaprange.zapLayerResHolderGroup.hasLayer(window.plugin.zaprange.zapCircleResHolderGroup)) {
      window.plugin.zaprange.zapLayerResHolderGroup.addLayer(window.plugin.zaprange.zapCircleResHolderGroup);
      $('.leaflet-control-layers-list span:contains("Zaprange Resistance")').parent('label').removeClass('disabled').attr('title', '');
    }
  } else {
    // hide the layer
    if (window.plugin.zaprange.zapLayerEnlHolderGroup.hasLayer(window.plugin.zaprange.zapCircleEnlHolderGroup)) {
      window.plugin.zaprange.zapLayerEnlHolderGroup.removeLayer(window.plugin.zaprange.zapCircleEnlHolderGroup);
      $('.leaflet-control-layers-list span:contains("Zaprange Enlightened")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
    }
    if (window.plugin.zaprange.zapLayerResHolderGroup.hasLayer(window.plugin.zaprange.zapCircleResHolderGroup)) {
      window.plugin.zaprange.zapLayerResHolderGroup.removeLayer(window.plugin.zaprange.zapCircleResHolderGroup);
      $('.leaflet-control-layers-list span:contains("Zaprange Resistance")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
    }
  }
};

var setup = function () {
  // this layer is added to the layer chooser, to be toggled on/off
  window.plugin.zaprange.zapLayerEnlHolderGroup = new L.LayerGroup();
  window.plugin.zaprange.zapLayerResHolderGroup = new L.LayerGroup();

  // this layer is added into the above layer, and removed from it when we zoom out too far
  window.plugin.zaprange.zapCircleEnlHolderGroup = new L.LayerGroup();
  window.plugin.zaprange.zapCircleResHolderGroup = new L.LayerGroup();

  window.plugin.zaprange.zapLayerEnlHolderGroup.addLayer(window.plugin.zaprange.zapCircleEnlHolderGroup);
  window.plugin.zaprange.zapLayerResHolderGroup.addLayer(window.plugin.zaprange.zapCircleResHolderGroup);

  // to avoid any favouritism, we'll put the player's own faction layer first
  if (window.PLAYER.team === 'RESISTANCE') {
    window.layerChooser.addOverlay(window.plugin.zaprange.zapLayerResHolderGroup, 'Zaprange Resistance');
    window.layerChooser.addOverlay(window.plugin.zaprange.zapLayerEnlHolderGroup, 'Zaprange Enlightened');
  } else {
    window.layerChooser.addOverlay(window.plugin.zaprange.zapLayerEnlHolderGroup, 'Zaprange Enlightened');
    window.layerChooser.addOverlay(window.plugin.zaprange.zapLayerResHolderGroup, 'Zaprange Resistance');
  }

  window.addHook('portalAdded', window.plugin.zaprange.portalAdded);

  window.map.on('zoomend', window.plugin.zaprange.showOrHide);

  window.plugin.zaprange.showOrHide();
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

