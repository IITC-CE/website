// ==UserScript==
// @author         morph
// @name           IITC plugin: Wayfarer portal submission range
// @category       Layer
// @version        0.2.0.20251007.090452
// @description    Add a 20m range around portals and drawn markers, to aid Wayfarer portals submissions
// @id             wayfarer-range
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR872/plugins/wayfarer-range.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR872/plugins/wayfarer-range.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/wayfarer-range.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-10-07-090452';
plugin_info.pluginId = 'wayfarer-range';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.0',
    changes: ['Hook into draw-tools to show ranges for drawn markers'],
  },
  {
    version: '0.1.0',
    changes: ['Initial release (code heavily based on zaprange)'],
  },
];

// use own namespace for plugin
window.plugin.wayfarerrange = function () {};
window.plugin.wayfarerrange.portalLayers = {};
window.plugin.wayfarerrange.markerLayers = {};
window.plugin.wayfarerrange.MIN_MAP_ZOOM = 16;

window.plugin.wayfarerrange.CIRCLE_OPTIONS = {
  color: 'orange',
  opacity: 0.7,
  fillColor: 'orange',
  fillOpacity: 0.4,
  weight: 1,
  interactive: false,
  dashArray: [10, 6],
};
window.plugin.wayfarerrange.RANGE_METERS = 20; // submitting a portal closer than 20m to another one, wont make it appear on the map

window.plugin.wayfarerrange.portalAdded = function (data) {
  data.portal.on('add', function () {
    window.plugin.wayfarerrange.draw(this.options.guid, this.options.team);
  });

  data.portal.on('remove', function () {
    window.plugin.wayfarerrange.removePortal(this.options.guid);
  });
};

window.plugin.wayfarerrange.removePortal = function (guid) {
  const previousLayer = window.plugin.wayfarerrange.portalLayers[guid];
  if (previousLayer) {
    window.plugin.wayfarerrange.wayfarerCircleHolderGroup.removeLayer(previousLayer);
    delete window.plugin.wayfarerrange.portalLayers[guid];
  }
};

window.plugin.wayfarerrange.removeMarker = function (layerId) {
  const previousLayer = window.plugin.wayfarerrange.markerLayers[layerId];
  if (previousLayer) {
    window.plugin.wayfarerrange.wayfarerCircleHolderGroup.removeLayer(previousLayer);
    delete window.plugin.wayfarerrange.markerLayers[layerId];
  }
};

window.plugin.wayfarerrange.draw = function (guid) {
  var d = window.portals[guid];
  var coo = d.getLatLng();
  var latlng = new L.LatLng(coo.lat, coo.lng); // L.LatLng is deprecated, but used by portal.getLatLng()

  var circle = new L.Circle(latlng, window.plugin.wayfarerrange.RANGE_METERS, window.plugin.wayfarerrange.CIRCLE_OPTIONS);

  circle.addTo(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
  window.plugin.wayfarerrange.portalLayers[guid] = circle;
};

window.plugin.wayfarerrange.drawMarker = function (layerId) {
  // Use the marker's internal Leaflet ID to retrieve it
  var marker = window.plugin.drawTools.drawnItems.getLayer(layerId);
  if (!marker) {
    return;
  }

  var latlng = marker.getLatLng();

  var circle = new L.Circle(latlng, window.plugin.wayfarerrange.RANGE_METERS, window.plugin.wayfarerrange.CIRCLE_OPTIONS);

  circle.addTo(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
  window.plugin.wayfarerrange.markerLayers[layerId] = circle;
};

window.plugin.wayfarerrange.setupWayfarerForMarker = function (marker) {
  var layerId = L.stamp(marker); // L.stamp gets the unique Leaflet ID for a layer
  window.plugin.wayfarerrange.drawMarker(layerId);

  // Set up a listener to remove the circle when the marker is deleted
  marker.on('remove', function () {
    window.plugin.wayfarerrange.removeMarker(layerId);
  });

  // Set up listener for real-time circle updates during drag
  marker.on('drag', function () {
    var circle = window.plugin.wayfarerrange.markerLayers[layerId];
    if (circle) {
      circle.setLatLng(this.getLatLng());
    }
  });
};

window.plugin.wayfarerrange.showOrHide = function () {
  if (window.map.getZoom() >= window.plugin.wayfarerrange.MIN_MAP_ZOOM) {
    // show the layer
    if (!window.plugin.wayfarerrange.wayfarerLayerHolderGroup.hasLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup)) {
      window.plugin.wayfarerrange.wayfarerLayerHolderGroup.addLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
      $('.leaflet-control-layers-list span:contains("Wayfarer range")').parent('label').removeClass('disabled').attr('title', '');
    }
  } else {
    // hide the layer
    if (window.plugin.wayfarerrange.wayfarerLayerHolderGroup.hasLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup)) {
      window.plugin.wayfarerrange.wayfarerLayerHolderGroup.removeLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);
      $('.leaflet-control-layers-list span:contains("Wayfarer range")').parent('label').addClass('disabled').attr('title', 'Zoom in to show those.');
    }
  }
};

var setup = function () {
  // this layer is added to the layer chooser, to be toggled on/off
  window.plugin.wayfarerrange.wayfarerLayerHolderGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.wayfarerrange.wayfarerLayerHolderGroup, 'Wayfarer range');

  // this layer is added into the above layer, and removed from it when we zoom out too far
  window.plugin.wayfarerrange.wayfarerCircleHolderGroup = new L.LayerGroup();
  window.plugin.wayfarerrange.wayfarerLayerHolderGroup.addLayer(window.plugin.wayfarerrange.wayfarerCircleHolderGroup);

  // --- Event Hooks ---

  // Hook for when portals are added to the map
  window.addHook('portalAdded', window.plugin.wayfarerrange.portalAdded);

  // Hook for zoom level changes to show/hide the layer
  window.map.on('zoomend', window.plugin.wayfarerrange.showOrHide);

  // Hook for draw-tools plugin events
  if (window.plugin.drawTools) {
    // Sync function that only updates changed markers
    const syncDrawnMarkers = function (forceRecreate = false) {
      const currentMarkers = new Set();

      // Collect all current marker IDs
      window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
          const layerId = L.stamp(layer);
          currentMarkers.add(layerId);

          // Add circle if not already present, or force recreate
          if (!window.plugin.wayfarerrange.markerLayers[layerId] || forceRecreate) {
            if (forceRecreate) {
              window.plugin.wayfarerrange.removeMarker(layerId);
            }
            window.plugin.wayfarerrange.setupWayfarerForMarker(layer);
          }
        }
      });

      // Remove circles for markers that no longer exist
      for (const layerId in window.plugin.wayfarerrange.markerLayers) {
        if (!currentMarkers.has(parseInt(layerId))) {
          window.plugin.wayfarerrange.removeMarker(layerId);
        }
      }
    };

    window.addHook('pluginDrawTools', function (e) {
      switch (e.event) {
        case 'layerCreated':
          // A new marker was drawn, add a circle just for it.
          if (e.layer instanceof L.Marker) {
            window.plugin.wayfarerrange.setupWayfarerForMarker(e.layer);
          }
          break;
        case 'layersEdited':
          // Handled by direct draw:edited event listener above
          break;
        case 'layersSnappedToPortals':
          // When markers are snapped to portals, force recreate all circles
          syncDrawnMarkers(true);
          break;
        case 'import':
        case 'layersDeleted':
        case 'clear':
          // Sync only updates what's changed
          syncDrawnMarkers();
          break;
      }
    });

    // Initial sync for any markers that were loaded before this plugin.
    syncDrawnMarkers();
  }

  // --- Initial State ---
  // Set the initial visibility of the layer based on the current zoom.
  window.plugin.wayfarerrange.showOrHide();
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

