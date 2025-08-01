// ==UserScript==
// @author         rongou
// @name           IITC plugin: Portal Level Numbers
// @category       Layer
// @version        0.2.4.20250630.173005
// @description    Show portal level numbers on map.
// @id             portal-level-numbers
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/portal-level-numbers.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/portal-level-numbers.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/portal-level-numbers.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-06-30-173005';
plugin_info.pluginId = 'portal-level-numbers';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.portalLevelNumbers = function () {};

window.plugin.portalLevelNumbers.ICON_SIZE = 12;
window.plugin.portalLevelNumbers.MOBILE_SCALE = 1.5;

window.plugin.portalLevelNumbers.levelLayers = {};
window.plugin.portalLevelNumbers.levelLayerGroup = null;

window.plugin.portalLevelNumbers.setupCSS = function () {
  $('<style>')
    .prop('type', 'text/css')
    .html(
      '.plugin-portal-level-numbers {\
            font-size: 10px;\
            color: #FFFFBB;\
            font-family: monospace;\
            text-align: center;\
            text-shadow: 0 0 1px black, 0 0 1em black, 0 0 0.2em black;\
            pointer-events: none;\
            -webkit-text-size-adjust:none;\
          }'
    )
    .appendTo('head');
};

window.plugin.portalLevelNumbers.removeLabel = function (guid) {
  var previousLayer = window.plugin.portalLevelNumbers.levelLayers[guid];
  if (previousLayer) {
    window.plugin.portalLevelNumbers.levelLayerGroup.removeLayer(previousLayer);
    delete window.plugin.portalLevelNumbers.levelLayers[guid];
  }
};

window.plugin.portalLevelNumbers.addLabel = function (guid, latLng) {
  // remove old layer before updating
  window.plugin.portalLevelNumbers.removeLabel(guid);

  // add portal level to layers
  var p = window.portals[guid];
  var levelNumber = p.options.level;
  var level = L.marker(latLng, {
    icon: L.divIcon({
      className: 'plugin-portal-level-numbers',
      iconSize: [window.plugin.portalLevelNumbers.ICON_SIZE, window.plugin.portalLevelNumbers.ICON_SIZE],
      html: levelNumber,
    }),
    guid: guid,
    interactive: false,
  });
  window.plugin.portalLevelNumbers.levelLayers[guid] = level;
  level.addTo(window.plugin.portalLevelNumbers.levelLayerGroup);
};

window.plugin.portalLevelNumbers.updatePortalLabels = function () {
  var SQUARE_SIZE = L.Browser.mobile
    ? (window.plugin.portalLevelNumbers.ICON_SIZE + 3) * window.plugin.portalLevelNumbers.MOBILE_SCALE
    : window.plugin.portalLevelNumbers.ICON_SIZE + 3;

  // as this is called every time layers are toggled, there's no point in doing it when the layer is off
  if (!window.map.hasLayer(window.plugin.portalLevelNumbers.levelLayerGroup)) {
    return;
  }

  var portalPoints = {};

  for (const guid in window.portals) {
    var p = window.portals[guid];
    if (p._map && p.options.data.level !== undefined) {
      // only consider portals added to the map, and that have a level set
      const point = window.map.project(p.getLatLng());
      portalPoints[guid] = point;
    }
  }

  // for efficient testing of intersection, group portals into buckets based on the defined rectangle size
  var buckets = {};
  for (const guid in portalPoints) {
    const point = portalPoints[guid];

    var bucketId = L.point([Math.floor(point.x / (SQUARE_SIZE * 2)), Math.floor((point.y / SQUARE_SIZE) * 2)]);
    // the guid is added to four buckets. this way, when testing for overlap we don't need to test
    // all 8 buckets surrounding the one around the particular portal, only the bucket it is in itself
    var bucketIds = [bucketId, bucketId.add([1, 0]), bucketId.add([0, 1]), bucketId.add([1, 1])];
    for (const i in bucketIds) {
      var b = bucketIds[i].toString();
      if (!buckets[b]) buckets[b] = {};
      buckets[b][guid] = true;
    }
  }

  var coveredPortals = {};

  for (const bucket in buckets) {
    const bucketGuids = buckets[bucket];
    for (const guid in bucketGuids) {
      var point = portalPoints[guid];
      // the bounds used for testing are twice as wide as the rectangle. this is so that there's no left/right
      // overlap between two different portals text
      var southWest = point.subtract([SQUARE_SIZE, SQUARE_SIZE]);
      var northEast = point.add([SQUARE_SIZE, SQUARE_SIZE]);
      var largeBounds = L.bounds(southWest, northEast);

      for (const otherGuid in bucketGuids) {
        // do not check portals already marked as covered
        if (guid !== otherGuid && !coveredPortals[otherGuid]) {
          var otherPoint = portalPoints[otherGuid];

          if (largeBounds.contains(otherPoint)) {
            // another portal is within the rectangle - remove if it has not a higher level
            if (window.portals[guid].options.level > window.portals[otherGuid].options.level) continue;
            else coveredPortals[guid] = true;
            break;
          }
        }
      }
    }
  }

  for (const guid in coveredPortals) {
    delete portalPoints[guid];
  }

  // remove any not wanted
  for (const guid in window.plugin.portalLevelNumbers.levelLayers) {
    if (!(guid in portalPoints)) {
      window.plugin.portalLevelNumbers.removeLabel(guid);
    }
  }

  // and add those we do
  for (const guid in portalPoints) {
    window.plugin.portalLevelNumbers.addLabel(guid, window.portals[guid].getLatLng());
  }
};

// as calculating portal marker visibility can take some time when there's lots of portals shown, we'll do it on
// a short timer. this way it doesn't get repeated so much
window.plugin.portalLevelNumbers.delayedUpdatePortalLabels = function (wait) {
  if (window.plugin.portalLevelNumbers.timer === undefined) {
    window.plugin.portalLevelNumbers.timer = setTimeout(function () {
      window.plugin.portalLevelNumbers.timer = undefined;
      window.plugin.portalLevelNumbers.updatePortalLabels();
    }, wait * 1000);
  }
};

var setup = function () {
  window.plugin.portalLevelNumbers.setupCSS();

  window.plugin.portalLevelNumbers.levelLayerGroup = new L.LayerGroup();
  window.layerChooser.addOverlay(window.plugin.portalLevelNumbers.levelLayerGroup, 'Portal Levels');

  window.addHook('requestFinished', function () {
    setTimeout(function () {
      window.plugin.portalLevelNumbers.delayedUpdatePortalLabels(3.0);
    }, 1);
  });
  window.addHook('mapDataRefreshEnd', function () {
    window.plugin.portalLevelNumbers.delayedUpdatePortalLabels(0.5);
  });
  window.map.on('overlayadd overlayremove', function () {
    setTimeout(function () {
      window.plugin.portalLevelNumbers.delayedUpdatePortalLabels(1.0);
    }, 1);
  });
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

