// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Direction of links on map
// @category       Tweaks
// @version        0.2.4.20250701.075233
// @description    Show the direction of links on the map by adding short dashes to the line at the origin portal.
// @id             link-show-direction
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/link-show-direction.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/link-show-direction.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/link-show-direction.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-07-01-075233';
plugin_info.pluginId = 'link-show-direction';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.2.4',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.3',
    changes: ['Default value for link show direction mode was set to Static near origin', 'IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.2.2',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.linkShowDirection = function () {};
window.plugin.linkShowDirection.ANIMATE_UPDATE_TIME = 1000; // 1000ms = 1s

// Hack:
// 100000 - a large enough number to be the equivalent of 100%, which is not supported Leaflet when displaying with canvas
window.plugin.linkShowDirection.styles = {
  Disabled: [null],
  'Static *': ['30,5,15,5,15,5,2,5,2,5,2,5,2,5,30,0'],
  'Static near origin': ['10,5,5,5,5,5,5,5,100000'],
  'Animate near origin': [
    '10,5,5,5,5,5,5,5,100000',
    '12,5,5,5,5,5,5,3,100000',
    '14,5,5,5,5,5,5,1,100000',
    '10,1,5,5,5,5,5,5,100000',
    '10,3,5,5,5,5,5,5,100000',
  ],
  'Animate full link': ['4,6,4,6,4,6,4,6', '0,2,4,6,4,6,4,4', '0,4,4,6,4,6,4,2', '0,6,4,6,4,6,4,0', '2,6,4,6,4,6,2,0'],
};
window.plugin.linkShowDirection.dashArray = null;
window.plugin.linkShowDirection.frame = 0;
window.plugin.linkShowDirection.moving = false;

window.plugin.linkShowDirection.animateLinks = function () {
  var frames = window.plugin.linkShowDirection.styles[window.plugin.linkShowDirection.mode];
  if (!frames) frames = [null];

  if (!window.plugin.linkShowDirection.moving) {
    var frame = window.plugin.linkShowDirection.frame;
    frame = (frame + 1) % frames.length;
    window.plugin.linkShowDirection.frame = frame;

    window.plugin.linkShowDirection.dashArray = frames[frame];
    window.plugin.linkShowDirection.addAllLinkStyles();
  }

  if (frames.length < 2) return; // no animation needed

  // browsers don't render the SVG style changes until after the timer function has finished.
  // this means if we start the next timeout in here a lot of the delay time will be taken by the browser itself
  // re-rendering the screen. in the worst case, the timer will run out before the render completes, and fire immediately
  // this would mean the user has no chance to interact with IITC
  // to prevent this, create a short timer that then sets the timer for the next frame. if the browser is slow to render,
  // the short timer should fire later, at which point the desired ANIMATE_UPDATE_TIME timer is started
  clearTimeout(window.plugin.linkShowDirection.timer);
  window.plugin.linkShowDirection.timer = setTimeout(function () {
    clearTimeout(window.plugin.linkShowDirection.timer);
    window.plugin.linkShowDirection.timer = setTimeout(window.plugin.linkShowDirection.animateLinks, window.plugin.linkShowDirection.ANIMATE_UPDATE_TIME);
  }, 10);
};

window.plugin.linkShowDirection.addAllLinkStyles = function () {
  $.each(window.links, function (guid, link) {
    window.plugin.linkShowDirection.addLinkStyle(link);
  });

  if (window.plugin.drawTools && localStorage['plugin-linkshowdirection-drawtools'] === 'true') {
    window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
      if (layer instanceof L.GeodesicPolyline) window.plugin.linkShowDirection.addLinkStyle(layer);
    });
  }
};

window.plugin.linkShowDirection.addLinkStyle = function (link) {
  link.setStyle({ dashArray: window.plugin.linkShowDirection.dashArray });
};

window.plugin.linkShowDirection.removeDrawToolsStyle = function () {
  if (!window.plugin.drawTools) return;

  window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
    if (layer instanceof L.GeodesicPolyline) layer.setStyle({ dashArray: null });
  });
};

window.plugin.linkShowDirection.showDialog = function () {
  var div = document.createElement('div');

  $.each(window.plugin.linkShowDirection.styles, function (style) {
    var label = div.appendChild(document.createElement('label'));
    var input = label.appendChild(document.createElement('input'));
    input.type = 'radio';
    input.name = 'plugin-link-show-direction';
    input.value = style;
    if (style === window.plugin.linkShowDirection.mode) {
      input.checked = true;
    }

    input.addEventListener(
      'click',
      function () {
        window.plugin.linkShowDirection.mode = style;
        localStorage['plugin-linkshowdirection-mode'] = style;
        window.plugin.linkShowDirection.animateLinks();
      },
      false
    );

    label.appendChild(document.createTextNode(' ' + style));

    div.appendChild(document.createElement('br'));
  });

  div.appendChild(
    document.createTextNode(
      " * Static: six segments will indicate each link's direction. " +
        "Two long segments are on the origin's side, follow by four short segments on the destination's side."
    )
  );

  if (window.plugin.drawTools) {
    div.appendChild(document.createElement('br'));

    var label = div.appendChild(document.createElement('label'));
    var input = label.appendChild(document.createElement('input'));
    input.type = 'checkbox';
    input.checked = localStorage['plugin-linkshowdirection-drawtools'] === 'true';

    input.addEventListener(
      'click',
      function () {
        localStorage['plugin-linkshowdirection-drawtools'] = input.checked.toString();

        if (input.checked) window.plugin.linkShowDirection.animateLinks();
        else window.plugin.linkShowDirection.removeDrawToolsStyle();
      },
      false
    );

    label.appendChild(document.createTextNode(' Apply to DrawTools'));
  }

  window.dialog({
    id: 'plugin-link-show-direction',
    html: div,
    title: 'Show link direction',
  });
};

window.plugin.linkShowDirection.setup = function () {
  IITC.toolbox.addButton({
    label: 'LinkDirection Opt',
    action: window.plugin.linkShowDirection.showDialog,
  });

  window.addHook('linkAdded', function (data) {
    window.plugin.linkShowDirection.addLinkStyle(data.link);
  });

  const default_mode = 'Static near origin';
  try {
    window.plugin.linkShowDirection.mode = localStorage['plugin-linkshowdirection-mode'] || default_mode;
  } catch (e) {
    console.warn(e);
    window.plugin.linkShowDirection.mode = default_mode;
  }

  window.plugin.linkShowDirection.animateLinks();

  // set up move start/end handlers to pause animations while moving
  window.map.on('movestart', function () {
    window.plugin.linkShowDirection.moving = true;
  });
  window.map.on('moveend', function () {
    window.plugin.linkShowDirection.moving = false;
  });
};

var setup = window.plugin.linkShowDirection.setup;

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

