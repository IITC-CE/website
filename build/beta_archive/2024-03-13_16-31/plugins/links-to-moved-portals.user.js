// ==UserScript==
// @author         screach
// @name           IITC plugin: Links to moved portals
// @category       Layer
// @version        0.1.0.20240313.163144
// @description    Show links to portals with different location data
// @id             links-to-moved-portals
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/links-to-moved-portals.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/links-to-moved-portals.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/links-to-moved-portals.png
// @icon64         https://iitc.app/extras/plugin-icons/links-to-moved-portals-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2024-03-13-163144';
plugin_info.pluginId = 'links-to-moved-portals';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global L */
// use own namespace for plugin
var plugin = {};
window.plugin.linksToMovedPortals = plugin;

// exposed objects
plugin.styles = {
  color: '#F00',
  opacity: 1,
  weight: 3,
  interactive: false,
  dashArray: '4,4',
};

var toLatLng = (latE6, lngE6) => {
  return L.latLng(latE6 / 1e6, lngE6 / 1e6);
};

var getDLatLng = (linkData) => {
  return toLatLng(linkData.dLatE6, linkData.dLngE6);
};

var getOLatLng = (linkData) => {
  return toLatLng(linkData.oLatE6, linkData.oLngE6);
};

var getPortalLatLng = (portal) => {
  return portal && toLatLng(portal.options.data.latE6, portal.options.data.lngE6);
};

var addLinks = (linkGuids) => {
  linkGuids.map((lGuid) => window.links[lGuid]).forEach(plugin.addLink);
};

var findLayer = (lguid) => {
  return plugin.linkLayer.getLayers().find((l) => l.options.guid === lguid);
};

plugin.portalLoaded = (data) => {
  if (!plugin.disabled) {
    var portalLinks = window.getPortalLinks(data.guid);
    addLinks([...portalLinks.in, ...portalLinks.out]);
  }
};

plugin.onLinkRemoved = (data) => {
  if (!plugin.disabled) {
    var layer = findLayer(data.link.options.guid);
    if (layer) {
      layer.remove();
    }
  }
};

plugin.addLink = (link) => {
  if (!plugin.disabled && !findLayer(link.options.guid)) {
    var linkData = link.options.data;
    var origin = getPortalLatLng(window.portals[linkData.oGuid]);
    var destination = getPortalLatLng(window.portals[linkData.dGuid]);
    if ((origin && !origin.equals(getOLatLng(linkData))) || (destination && !destination.equals(getDLatLng(linkData)))) {
      var poly = L.geodesicPolyline(link.getLatLngs(), Object.assign({}, plugin.styles, { guid: link.options.guid }));
      poly.addTo(plugin.linkLayer);
    }
  }
};

plugin.checkAllLinks = () => {
  if (!plugin.disabled) {
    addLinks(Object.keys(window.links));
  }
};

var createLayer = () => {
  plugin.linkLayer = new L.FeatureGroup();
  window.layerChooser.addOverlay(plugin.linkLayer, 'Links to moved portals');

  window.map.on('layeradd', function (obj) {
    if (obj.layer === plugin.linkLayer) {
      delete plugin.disabled;
      plugin.checkAllLinks();
    }
  });
  window.map.on('layerremove', function (obj) {
    if (obj.layer === plugin.linkLayer) {
      plugin.disabled = true;
      plugin.linkLayer.clearLayers();
    }
  });

  if (!window.map.hasLayer(plugin.linkLayer)) {
    plugin.disabled = true;
  }
};

var addHooks = () => {
  window.addHook('mapDataRefreshEnd', plugin.checkAllLinks);
  window.addHook('portalDetailsUpdated', plugin.portalLoaded);
  window.addHook('linkRemoved', plugin.onLinkRemoved);
};

var setup = () => {
  createLayer();
  addHooks();
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

