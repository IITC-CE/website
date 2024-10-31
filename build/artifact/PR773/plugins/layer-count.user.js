// ==UserScript==
// @author         fkloft
// @name           IITC plugin: Layer count
// @category       Info
// @version        0.2.5.20241031.090250
// @description    Allow users to count nested fields
// @id             layer-count
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR773/plugins/layer-count.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR773/plugins/layer-count.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/layer-count.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-10-31-090250';
plugin_info.pluginId = 'layer-count';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.2.5',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var layerCount = {};
window.plugin.layerCount = layerCount;

var tooltip;
function calculate(ev) {
  var point = ev.layerPoint;
  var fields = window.fields;
  var layersRes = 0,
    layersEnl = 0,
    layersDrawn = 0;

  for (var guid in fields) {
    var field = fields[guid];

    // we don't need to check the field's bounds first. pnpoly is pretty simple math.
    // Checking the bounds is about 50 times slower than just using pnpoly
    var rings = field._rings ? field._rings[0] : [];
    if (!rings.length) {
      for (var i = 0, len = field._latlngs.length; i < len; i++) {
        rings.push(window.map.latLngToLayerPoint(field._latlngs[i]));
      }
    }
    if (window.pnpoly(rings, point)) {
      if (field.options.team === window.TEAM_ENL) {
        layersEnl++;
      } else if (field.options.team === window.TEAM_RES) {
        layersRes++;
      }
    }
  }

  if (window.plugin.drawTools) {
    window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.GeodesicPolygon && layer._rings && window.pnpoly(layer._rings[0], point)) {
        layersDrawn++;
      }
    });
  }

  var content;
  if (layersRes !== 0 && layersEnl !== 0) {
    content = 'Res: ' + layersRes + ' + Enl: ' + layersEnl + ' = ' + (layersRes + layersEnl) + ' fields';
  } else if (layersRes !== 0) {
    content = 'Res: ' + layersRes + ' field(s)';
  } else if (layersEnl !== 0) {
    content = 'Enl: ' + layersEnl + ' field(s)';
  } else {
    content = 'No fields';
  }
  if (layersDrawn !== 0) {
    content += '; draw: ' + layersDrawn + ' polygon(s)';
  }
  tooltip.innerHTML = content;
}

function setup() {
  $('<style>').prop('type', 'text/css').html('\
.leaflet-control-layer-count a\
{\
	background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+Cgk8ZyBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjQ7c3Ryb2tlOm5vbmUiPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSw2IHoiLz4KCQk8cGF0aCBkPSJNIDYsMjQgMjQsMjQgMTUsMTIgeiIvPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSwxOCB6Ii8+Cgk8L2c+Cjwvc3ZnPgo=");\
}\
.leaflet-control-layer-count a.active\
{\
	background-color: #BBB;\
}\
.leaflet-control-layer-count-tooltip\
{\
	background-color: rgba(255, 255, 255, 0.6);\
	display: none;\
	height: 24px;\
	left: 30px;\
	line-height: 24px;\
	margin-left: 15px;\
	margin-top: -12px;\
	padding: 0 10px;\
	position: absolute;\
	top: 50%;\
	white-space: nowrap;\
	width: auto;\
}\
.leaflet-control-layer-count a.active .leaflet-control-layer-count-tooltip\
{\
	display: block;\
}\
.leaflet-control-layer-count-tooltip:before\
{\
	border-color: transparent rgba(255, 255, 255, 0.6);\
	border-style: solid;\
	border-width: 12px 12px 12px 0;\
	content: "";\
	display: block;\
	height: 0;\
	left: -12px;\
	position: absolute;\
	width: 0;\
}\
').appendTo('head');

  var LayerCount = L.Control.extend({
    options: {
      position: 'topleft',
    },

    onAdd: function (map) {
      var button = document.createElement('a');
      button.className = 'leaflet-bar-part';
      button.addEventListener(
        'click',
        function toggle() {
          var btn = this;
          if (btn.classList.contains('active')) {
            map.off('click', calculate);
            btn.classList.remove('active');
          } else {
            map.on('click', calculate);
            btn.classList.add('active');
            setTimeout(function () {
              tooltip.textContent = 'Click on map';
            }, 10);
          }
        },
        false
      );
      button.title = 'Count nested fields';

      tooltip = document.createElement('div');
      tooltip.className = 'leaflet-control-layer-count-tooltip';
      button.appendChild(tooltip);

      var container = document.createElement('div');
      container.className = 'leaflet-control-layer-count leaflet-bar';
      container.appendChild(button);
      return container;
    },

    onRemove: function (map) {
      map.off('click', calculate);
    },
  });
  var ctrl = new LayerCount();
  ctrl.addTo(window.map);
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

