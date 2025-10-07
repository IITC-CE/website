// ==UserScript==
// @author         cradle
// @name           IITC plugin: User Location
// @category       Tweaks
// @version        0.3.0.20251007.115903
// @description    Show user location marker on map
// @id             user-location
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR873/plugins/user-location.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR873/plugins/user-location.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/user-location.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-10-07-115903';
plugin_info.pluginId = 'user-location';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

const changelog = [
  {
    version: '0.3.0',
    changes: ['Add browser geolocation and compass support'],
  },
];

window.plugin.userLocation = function () {};

window.plugin.userLocation.follow = false;
window.plugin.userLocation.user = { latlng: null, direction: null };

window.plugin.userLocation.browser = {
  watchId: null,
  isActive: false,
};

window.plugin.userLocation.setup = function () {
  window.pluginCreateHook('pluginUserLocation');

  $('<style>').prop('type', 'text/css').html('\
.user-location {\
  pointer-events: none;\
}\
\
.user-location .container {\
  height: 32px;\
  width: 32px;\
  -webkit-transform-origin: center;\
  transform-origin: center;\
}\
\
.user-location .container .inner,\
.user-location .container .outer {\
  position: absolute;\
}\
\
.user-location .res .inner {\
  background-color: #03baf4;\
  border-color: #03baf4;\
}\
\
.user-location .res .outer {\
  background-color: #0088b3;\
  border-color: #0088b3;\
}\
\
.user-location .enl .inner {\
  background-color: #1ee681;\
  border-color: #1ee681;\
}\
\
.user-location .enl .outer {\
  background-color: #00aa4e;\
  border-color: #00aa4e;\
}\
\
.user-location .circle .inner,\
.user-location .circle .outer {\
  width: 32px;\
  height: 32px;\
  border-radius: 16px;\
}\
\
.user-location .circle .inner {\
  -webkit-transform: scale(0.6);\
  transform: scale(0.6);\
}\
\
.user-location .arrow .inner,\
.user-location .arrow .outer {\
  left: 4px;\
  width: 0px;\
  height: 0px;\
  border-style: solid;\
  border-width: 0px 12px 32px;\
  border-left-color: transparent;\
  border-right-color: transparent;\
  background: transparent;\
}\
\
.user-location .arrow .inner {\
  -webkit-transform: scale(0.6) translateY(15%);\
  transform: scale(0.6) translateY(15%);\
}\
\
').appendTo('head');

  const cssClass = window.PLAYER.team === 'RESISTANCE' ? 'res' : 'enl';

  const latlng = new L.LatLng(0, 0);

  const icon = new L.DivIcon({
    iconSize: new L.Point(32, 32),
    iconAnchor: new L.Point(16, 16),
    className: 'user-location',
    html: `<div class="container ${cssClass} circle"><div class="outer"></div><div class="inner"></div></div>`,
  });

  const marker = new L.Marker(latlng, {
    icon: icon,
    zIndexOffset: 300,
    interactive: false,
  });

  const circle = new L.Circle(latlng, 40, {
    stroke: true,
    color: '#ffb900',
    opacity: 0.5,
    fillOpacity: 0.25,
    fillColor: '#ffb900',
    weight: 1.5,
    interactive: false,
  });

  window.plugin.userLocation.locationLayer = new L.LayerGroup();

  marker.addTo(window.plugin.userLocation.locationLayer);
  window.plugin.userLocation.locationLayer.addTo(window.map);
  window.addLayerGroup('User location', window.plugin.userLocation.locationLayer, true);

  Object.assign(window.plugin.userLocation, {
    user: { latlng, direction: null },
    marker,
    circle,
    icon,
  });

  window.map.on('zoomend', window.plugin.userLocation.onZoomEnd);
  window.plugin.userLocation.onZoomEnd();

  // Initialize browser geolocation if available
  window.plugin.userLocation.initBrowserGeolocation().then();

  // HOOK: fired when the marker is drawn the first time
  window.runHooks('pluginUserLocation', { event: 'setup', data: window.plugin.userLocation.user });
};

// Capability detection
window.plugin.userLocation.hasGeolocation = () => navigator?.geolocation?.watchPosition;
window.plugin.userLocation.hasOrientation = () => window.DeviceOrientationEvent;

// Browser geolocation initialization
window.plugin.userLocation.initBrowserGeolocation = async function () {
  if (window.isApp || !window.plugin.userLocation.hasGeolocation()) {
    return;
  }

  // Request orientation permission for iOS 13+ if needed
  if (window.plugin.userLocation.hasOrientation() && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch {
      console.warn('IITC User Location: Orientation permission denied');
    }
  }

  // Reset orientation and start geolocation
  window.plugin.userLocation.onOrientationChange(null);
  window.plugin.userLocation.startBrowserGeolocation();
};

window.plugin.userLocation.startBrowserGeolocation = function () {
  if (window.plugin.userLocation.browser.isActive) return;

  const options = {
    enableHighAccuracy: true,
    timeout: 6000,
    maximumAge: 3000,
  };

  // Start position tracking
  window.plugin.userLocation.browser.watchId = navigator.geolocation.watchPosition(
    window.plugin.userLocation.onBrowserLocationSuccess,
    window.plugin.userLocation.onBrowserLocationError,
    options
  );

  // Start orientation tracking
  if (window.plugin.userLocation.hasOrientation()) {
    const eventType = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventType, window.plugin.userLocation.onBrowserOrientationChange, true);
  }

  window.plugin.userLocation.browser.isActive = true;
};

// Geolocation callbacks
window.plugin.userLocation.onBrowserLocationSuccess = function (position) {
  const { latitude: lat, longitude: lng } = position.coords;
  window.plugin.userLocation.onLocationChange(lat, lng);
};

window.plugin.userLocation.onBrowserLocationError = function (error) {
  console.warn('IITC User Location: Browser geolocation error:', error);
};

window.plugin.userLocation.onBrowserOrientationChange = function (event) {
  const { type, alpha, webkitCompassHeading, absolute } = event;

  let heading = null;

  // Priority: deviceorientationabsolute → webkitCompassHeading → absolute fallback
  if (type === 'deviceorientationabsolute' && alpha !== null) {
    heading = 360 - alpha;
  } else if (webkitCompassHeading !== undefined) {
    heading = webkitCompassHeading;
  } else if (absolute === true && alpha !== null) {
    heading = 360 - alpha;
  }

  if (heading !== null) {
    // Simple normalization to 0-360 range
    heading = heading % 360;
    window.plugin.userLocation.onOrientationChange(heading);
  }
};

window.plugin.userLocation.onZoomEnd = function () {
  const { circle, locationLayer } = window.plugin.userLocation;
  const shouldShow = window.map.getZoom() >= 16 && !L.Path.CANVAS;

  if (shouldShow && !locationLayer.hasLayer(circle)) {
    locationLayer.addLayer(circle);
  } else if (!shouldShow && locationLayer.hasLayer(circle)) {
    locationLayer.removeLayer(circle);
  }
};

window.plugin.userLocation.locate = function (lat, lng, accuracy, persistentZoom) {
  if (window.plugin.userLocation.follow) {
    window.plugin.userLocation.follow = false;
    window.app?.setFollowMode?.(false);
    return;
  }

  const latlng = new L.LatLng(lat, lng);

  const latAccuracy = (180 * accuracy) / 40075017;
  const lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * lat);

  const bounds = new L.LatLngBounds([lat - latAccuracy, lng - lngAccuracy], [lat + latAccuracy, lng + lngAccuracy]);

  // an extremely close view is pretty pointless (especially with maps that support zoom level 20+)
  // so limit to 17 (enough to see all portals)
  const zoom = persistentZoom ? window.map.getZoom() : Math.min(window.map.getBoundsZoom(bounds), 17);

  if (window.map.getCenter().distanceTo(latlng) < 10) {
    window.plugin.userLocation.follow = true;
    window.app?.setFollowMode?.(true);
  }

  window.map.setView(latlng, zoom);
};

window.plugin.userLocation.onLocationChange = function (lat, lng) {
  if (!window.plugin.userLocation.marker) return;

  const latlng = new L.LatLng(lat, lng);
  const { user, marker, circle } = window.plugin.userLocation;

  user.latlng = latlng;
  marker.setLatLng(latlng);
  circle.setLatLng(latlng);

  // Update distance to portal plugin if available
  if (window.plugin.distanceToPortal) {
    window.plugin.distanceToPortal.currentLoc = latlng;
    window.plugin.distanceToPortal.updateDistance();
  }

  // Follow mode logic
  if (window.plugin.userLocation.follow) {
    // move map if marker moves more than 35% from the center
    // 100% - 2*15% = 70% → 35% from center in either direction
    const bounds = window.map.getBounds().pad(-0.15);
    if (!bounds.contains(latlng)) {
      window.map.setView(latlng);
    }
  }

  // HOOK: fired when the marker location is changed
  window.runHooks('pluginUserLocation', { event: 'onLocationChange', data: user });
};

window.plugin.userLocation.onOrientationChange = function (direction) {
  const { marker, user } = window.plugin.userLocation;
  if (!marker) return;

  user.direction = direction;

  const icon = marker._icon;
  if (!icon) return;

  const container = $('.container', icon);

  if (direction === null) {
    container.removeClass('arrow').addClass('circle').css({
      webkitTransform: '',
      transform: '',
    });
  } else {
    container
      .removeClass('circle')
      .addClass('arrow')
      .css({
        webkitTransform: `rotate(${direction}deg)`,
        transform: `rotate(${direction}deg)`,
      });
  }

  // HOOK: fired when the marker direction is changed
  window.runHooks('pluginUserLocation', { event: 'onOrientationChange', data: user });
};

window.plugin.userLocation.getUser = function () {
  return window.plugin.userLocation.user;
};

const setup = window.plugin.userLocation.setup;

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

