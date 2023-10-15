// ==UserScript==
// @author         xelio
// @name           IITC plugin: Keys on map
// @category       Layer
// @version        0.3.1.20231015.144853
// @description    Show the manually entered key counts from the 'keys' plugin on the map.
// @id             keys-on-map
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR675/plugins/keys-on-map.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR675/plugins/keys-on-map.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/keys-on-map.png
// @icon64         https://iitc.app/extras/plugin-icons/keys-on-map-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-10-15-144853';
plugin_info.pluginId = 'keys-on-map';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
window.plugin.keysOnMap = function() {};

window.plugin.keysOnMap.keyLayers = {};

// Use portal add and remove event to control render of keys
window.plugin.keysOnMap.portalAdded = function(data) {
  // Disable if Plugin Keys is not there
  if(!plugin.keys) {
    plugin.keysOnMap.disableMessage();
    return;
  }

  data.portal.on('add', function() {
    plugin.keysOnMap.renderKey(this.options.guid, this.getLatLng());
  });

  data.portal.on('remove', function() {
    plugin.keysOnMap.removeKey(this.options.guid);
  });
}

window.plugin.keysOnMap.keyUpdate = function(data) {
  // Disable if Plugin Keys is not there
  if(!plugin.keys) {
    plugin.keysOnMap.disableMessage();
    return;
  }
  var portal = window.portals[data.guid];
  if(!portal) return;
  var latLng = portal.getLatLng();

  plugin.keysOnMap.renderKey(data.guid, latLng)
}

window.plugin.keysOnMap.refreshAllKeys = function() {
  plugin.keysOnMap.keyLayerGroup.clearLayers();
  $.each(plugin.keys.keys, function(key, count) {
    plugin.keysOnMap.keyUpdate({guid: key});
  });
}

window.plugin.keysOnMap.renderKey = function(guid,latLng) {
    plugin.keysOnMap.removeKey(guid);

    var keyCount = plugin.keys.keys[guid];
    if (keyCount > 0) {
      var key = L.marker(latLng, {
        icon: L.divIcon({
          className: 'plugin-keys-on-map-key',
          iconAnchor: [6,7],
          iconSize: [12,10],
          html: keyCount
          }),
        guid: guid,
        interactive: false
        });

      plugin.keysOnMap.keyLayers[guid] = key;
      key.addTo(plugin.keysOnMap.keyLayerGroup);
    }
}

window.plugin.keysOnMap.removeKey = function(guid) {
    var previousLayer = plugin.keysOnMap.keyLayers[guid];
    if(previousLayer) {
      plugin.keysOnMap.keyLayerGroup.removeLayer(previousLayer);
      delete plugin.keysOnMap.keyLayers[guid];
    }
}

window.plugin.keysOnMap.disableMessage = function() {
  if(!plugin.keysOnMap.messageShown) {
    alert('Plugin "Keys On Map" need plugin "Keys" to run!');
    plugin.keysOnMap.messageShown = true;
  }
}

window.plugin.keysOnMap.setupCSS = function() {
  $("<style>")
    .prop("type", "text/css")
    .html(".plugin-keys-on-map-key {\
            font-size: 10px;\
            color: #FFFFBB;\
            font-family: monospace;\
            text-align: center;\
            text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;\
            pointer-events: none;\
            -webkit-text-size-adjust:none;\
          }")
  .appendTo("head");
}

window.plugin.keysOnMap.setupLayer = function() {
  window.plugin.keysOnMap.keyLayerGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.keysOnMap.keyLayerGroup, 'Keys', {default: false});
}

var setup =  function() {

  window.plugin.keysOnMap.setupCSS();
  window.plugin.keysOnMap.setupLayer();

  window.addHook('portalAdded', window.plugin.keysOnMap.portalAdded);
  window.addHook('pluginKeysUpdateKey', window.plugin.keysOnMap.keyUpdate);
  window.addHook('pluginKeysRefreshAll', window.plugin.keysOnMap.refreshAllKeys);
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

