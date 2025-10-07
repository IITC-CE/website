// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Distance to portal
// @category       Portal Info
// @version        0.2.3.20251007.090452
// @description    Allows your current location to be set manually, then shows the distance to the selected portal. Useful when managing portal keys.
// @id             distance-to-portal
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR872/plugins/distance-to-portal.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR872/plugins/distance-to-portal.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/distance-to-portal.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2025-10-07-090452';
plugin_info.pluginId = 'distance-to-portal';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.distanceToPortal = function () {};

window.plugin.distanceToPortal.addDistance = function () {
  var div = $('<div>')
    .attr({
      id: 'portal-distance',
      title: 'Double-click to set/change current location',
    })
    .on('dblclick', window.plugin.distanceToPortal.setLocation);

  $('#resodetails').after(div);

  window.plugin.distanceToPortal.updateDistance();
};

window.plugin.distanceToPortal.formatDistance = function (dist) {
  if (dist >= 10000) {
    dist = Math.round(dist / 1000) + 'km';
  } else if (dist >= 1000) {
    dist = Math.round(dist / 100) / 10 + 'km';
  } else {
    dist = Math.round(dist) + 'm';
  }

  return dist;
};

window.plugin.distanceToPortal.updateDistance = function () {
  if (!(window.selectedPortal && window.portals[window.selectedPortal])) return;
  var portal = window.portals[window.selectedPortal];

  var ll = portal.getLatLng();

  if (window.plugin.distanceToPortal.currentLoc) {
    var dist = window.plugin.distanceToPortal.currentLoc.distanceTo(ll);

    dist = window.plugin.distanceToPortal.formatDistance(dist);

    var bearing = window.plugin.distanceToPortal.currentLoc.bearingTo(ll);
    var bearingWord = window.plugin.distanceToPortal.currentLoc.bearingWordTo(ll);

    $('#portal-distance')
      .text('Distance: ' + dist + ' ')
      .append(
        $('<span>')
          .addClass('portal-distance-bearing')
          .css({
            transform: 'rotate(' + bearing + 'deg)',
            '-moz-transform': 'rotate(' + bearing + 'deg)',
            '-webkit-transform': 'rotate(' + bearing + 'deg)',
          })
      )
      .append(document.createTextNode(' ' + window.zeroPad(bearing, 3) + '° ' + bearingWord));
  } else {
    $('#portal-distance').text('Location not set');
  }
};

window.plugin.distanceToPortal.setLocation = function () {
  if (window.plugin.distanceToPortal.currentLocMarker) {
    window.map.removeLayer(window.plugin.distanceToPortal.currentLocMarker);
    window.plugin.distanceToPortal.currentLocMarker = null;
    return;
  }

  if (!window.plugin.distanceToPortal.currentLoc) {
    window.plugin.distanceToPortal.currentLoc = window.map.getCenter();
  }

  window.plugin.distanceToPortal.currentLocMarker = L.marker(window.plugin.distanceToPortal.currentLoc, {
    icon: L.divIcon.coloredSvg('#444'),
    draggable: true,
    title: 'Drag to change current location',
  });

  window.plugin.distanceToPortal.currentLocMarker.on('drag', function () {
    window.plugin.distanceToPortal.currentLoc = window.plugin.distanceToPortal.currentLocMarker.getLatLng();

    localStorage['plugin-distance-to-portal'] = JSON.stringify({
      lat: window.plugin.distanceToPortal.currentLoc.lat,
      lng: window.plugin.distanceToPortal.currentLoc.lng,
    });

    if (window.selectedPortal) window.plugin.distanceToPortal.updateDistance();
  });

  window.map.addLayer(window.plugin.distanceToPortal.currentLocMarker);
};

window.plugin.distanceToPortal.setupPortalsList = function () {
  window.plugin.portalslist.fields.push({
    title: 'Dist',
    value: function (portal) {
      if (window.plugin.distanceToPortal.currentLoc) return window.plugin.distanceToPortal.currentLoc.distanceTo(portal.getLatLng());
      else return 0;
    },
    format: function (cell, portal, dist) {
      $(cell)
        .addClass('alignR')
        .text(dist ? window.plugin.distanceToPortal.formatDistance(dist) : '-');
    },
  });
};

window.plugin.distanceToPortal.setup = function () {
  // https://github.com/gregallensworth/Leaflet/
  // *** included: external/LatLng_Bearings.js ***
/*
 * extend Leaflet's LatLng class
 * giving it the ability to calculate the bearing to another LatLng
 * Usage example:
 *     here  = map.getCenter();   / some latlng
 *     there = L.latlng([37.7833,-122.4167]);
 *     var whichway = here.bearingWordTo(there);
 *     var howfar   = (here.distanceTo(there) / 1609.34).toFixed(2);
 *     alert("San Francisco is " + howfar + " miles, to the " + whichway );
 * 
 * Greg Allensworth   <greg.allensworth@gmail.com>
 * No license, use as you will, kudos welcome but not required, etc.
 */


L.LatLng.prototype.bearingTo = function(other) {
    var d2r  = Math.PI / 180;
    var r2d  = 180 / Math.PI;
    var lat1 = this.lat * d2r;
    var lat2 = other.lat * d2r;
    var dLon = (other.lng-this.lng) * d2r;
    var y    = Math.sin(dLon) * Math.cos(lat2);
    var x    = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    var brng = Math.atan2(y, x);
    brng = parseInt( brng * r2d );
    brng = (brng + 360) % 360;
    return brng;
};

L.LatLng.prototype.bearingWordTo = function(other) {
    var bearing = this.bearingTo(other);
    var bearingword = '';
    if      (bearing >=  22 && bearing <=  67) bearingword = 'NE';
    else if (bearing >=  67 && bearing <= 112) bearingword =  'E';
    else if (bearing >= 112 && bearing <= 157) bearingword = 'SE';
    else if (bearing >= 157 && bearing <= 202) bearingword =  'S';
    else if (bearing >= 202 && bearing <= 247) bearingword = 'SW';
    else if (bearing >= 247 && bearing <= 292) bearingword =  'W';
    else if (bearing >= 292 && bearing <= 337) bearingword = 'NW';
    else if (bearing >= 337 || bearing <=  22) bearingword =  'N';
    return bearingword;
};



;

  try {
    window.plugin.distanceToPortal.currentLoc = L.latLng(JSON.parse(localStorage['plugin-distance-to-portal']));
  } catch {
    window.plugin.distanceToPortal.currentLoc = null;
  }

  window.plugin.distanceToPortal.currentLocMarker = null;

  $('<style>').prop('type', 'text/css').html('\
#portal-distance {\
	text-align: center;\
}\
.portal-distance-bearing {\
	display: inline-block;\
	vertical-align: top;\
	position: relative;\
	height: 1em;\
	width: 1em;\
}\
.portal-distance-bearing:before, .portal-distance-bearing:after {\
	border-color: transparent currentcolor transparent transparent;\
	border-style: solid;\
	border-width: 0.75em 0.4em 0 0;\
	content: "";\
	height: 0;\
	width: 0;\
	position: absolute;\
	top: 0.15em;\
	left: 0.15em;\
	transform: skewY(-30deg);\
	-moz-transform: skewY(-30deg);\
	-webkit-transform: skewY(-30deg);\
}\
.portal-distance-bearing:after {\
	left: auto;\
	right: 0.15em;\
	transform: scaleX(-1) skewY(-30deg);\
	-moz-transform: scaleX(-1) skewY(-30deg);\
	-webkit-transform: scaleX(-1) skewY(-30deg);\
}\
\
').appendTo('head');

  window.addHook('portalDetailsUpdated', window.plugin.distanceToPortal.addDistance);

  if (window.plugin.portalslist) {
    window.plugin.distanceToPortal.setupPortalsList();
  }
};

var setup = window.plugin.distanceToPortal.setup;

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

