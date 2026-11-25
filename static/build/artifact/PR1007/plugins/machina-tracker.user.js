// ==UserScript==
// @name           IITC plugin: Machina tracker
// @author         McBen
// @category       Layer
// @version        1.1.3.20261125.122207
// @description    Show locations of Machina activities
// @id             machina-tracker
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR1007/plugins/machina-tracker.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR1007/plugins/machina-tracker.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/machina-tracker.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2026-11-25-122207';
plugin_info.pluginId = 'machina-tracker';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global IITC, L */

var changelog = [
  {
    version: '1.1.3',
    changes: ['Refactoring: use IITC.portal and IITC.chat APIs instead of legacy globals'],
  },
  { version: '1.1.2', changes: ['Refactoring: update Leaflet API usage'] },
  {
    version: '1.1.1',
    changes: ['Fix decayed messages attributed to Machina'],
  },
  {
    version: '1.1.0',
    changes: ['Using `IITC.utils.formatAgo` instead of the plugin own function'],
  },
  {
    version: '1.0.1',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '1.0.0',
    changes: ['First version'],
  },
];

// ensure plugin framework is there, even if iitc is not yet loaded
if (typeof window.plugin !== 'function') window.plugin = function () {};

// PLUGIN START ////////////////////////////////////////////////////////
// use own namespace for plugin
window.plugin.machinaTracker = function () {};
var machinaTracker = window.plugin.machinaTracker;

machinaTracker.MACHINA_TRACKER_MAX_TIME = 8 * 60 * 60 * 1000;
machinaTracker.MACHINA_TRACKER_MIN_ZOOM = 9;

machinaTracker.events = [];

machinaTracker.setup = () => {
  $('<style>').prop('type', 'text/css').html('\
.plugin-machina-tracker-popup a {\
    color: inherit;\
    text-decoration: underline;\
    text-decoration-style: dashed;\
    -moz-text-decoration-style: dashed;\
    -webkit-text-decoration-style: dashed;\
}\
\
.plugin-machina-tracker-popup-header {\
    white-space: nowrap;\
}\
\
ul.plugin-machina-tracker-link-list {\
    list-style: none;\
    padding-left: 1em;\
}\
\
ul.plugin-machina-tracker-link-list li {\
    position: relative;\
    display: flex;\
    justify-content: space-between;\
    white-space: nowrap;\
}\
\
ul.plugin-machina-tracker-link-list li a {\
    margin-right: 3px;\
}\
\
ul.plugin-machina-tracker-link-list li::before {\
    content: \'↴\';\
    position: absolute;\
    left: -1em;\
}\
\
.leaflet-tooltip.plugin-machina-tracker-label {\
    padding: 0 3px;\
    font-size: 11px;\
    line-height: 13px;\
}\
').appendTo('head');

  var iconImage = 'data:image/png;base64,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';

  machinaTracker.icon = new L.Icon({
    iconUrl: iconImage,
    iconSize: [26, 32],
    iconAnchor: [12, 32],
    tooltipAnchor: IITC.map.tooltipAnchors.pinTip,
  });

  machinaTracker.popup = new L.Popup({ offset: new L.Point([1, -34]) });
  machinaTracker.drawnTraces = new L.LayerGroup([], { minZoom: machinaTracker.MACHINA_TRACKER_MIN_ZOOM });
  window.addLayerGroup('Machina Tracker', machinaTracker.drawnTraces, true);

  window.addHook('publicChatDataAvailable', machinaTracker.handleData);

  window.map.on('zoomend', machinaTracker.zoomListener);
  machinaTracker.zoomListener();
  // last, as a change of the options redraws what is set up above
  machinaTracker.registerOptions();
  machinaTracker.applyHistoryLength();
  setInterval(machinaTracker.refreshTimes, 60 * 1000);
};

machinaTracker.registerOptions = () => {
  IITC.options.register('machina-tracker', {
    title: 'Machina tracker',
    blocks: [
      {
        type: 'boolean',
        key: 'alwaysShowLabels',
        title: 'Always show time labels',
        description: 'Otherwise on hover. Touch screens show labels only when they are always shown',
        default: false,
        onChange: () => machinaTracker.redraw(),
      },
      {
        type: 'select',
        key: 'timeFormat',
        title: 'Time in labels and popups',
        description: 'Clock time has the date when it is not today',
        choices: [
          { value: 'relative', label: 'Time ago' },
          { value: 'absolute', label: 'Clock time' },
        ],
        default: 'relative',
        onChange: () => {
          machinaTracker.redraw();
          machinaTracker.refreshTimes();
        },
      },
      {
        type: 'select',
        key: 'historyHours',
        title: 'History length',
        description: 'Older actions are dropped. A longer history builds up while IITC stays open',
        choices: [
          { value: 1, label: '1 hour' },
          { value: 2, label: '2 hours' },
          { value: 4, label: '4 hours' },
          { value: 8, label: '8 hours' },
          { value: 12, label: '12 hours' },
          { value: 24, label: '1 day' },
          { value: 72, label: '3 days' },
          { value: 168, label: '1 week' },
        ],
        default: 8,
        onChange: () => {
          machinaTracker.applyHistoryLength();
          machinaTracker.discardOldData();
          machinaTracker.redraw();
        },
      },
    ],
  });
};

/**
 * Sets how long actions are kept from the History length option
 */
machinaTracker.applyHistoryLength = () => {
  machinaTracker.MACHINA_TRACKER_MAX_TIME = IITC.options.get('machina-tracker.historyHours') * 60 * 60 * 1000;
};

/**
 * Formats the time of an event in the chosen format
 *
 * @param {number} time - Time of the event in milliseconds
 * @param {number} now - Current time in milliseconds
 * @returns {string} Time ago, or the clock time with the date when it is not today
 */
machinaTracker.formatTime = (time, now) => {
  if (IITC.options.get('machina-tracker.timeFormat') === 'relative') return `${IITC.utils.formatAgo(time, now)} ago`;
  return IITC.utils.formatTimestamp(time, { now });
};

/**
 * Creates an element showing the time of an event in a popup, written again by `writeTimes`
 *
 * @param {number} time - Time of the event in milliseconds
 * @returns {HTMLElement} The element
 */
machinaTracker.timeElement = (time) => IITC.utils.createElement('span', { dataset: { time } }, machinaTracker.formatTime(time, Date.now()));

// writes the times in a popup again, so they are current and in the chosen format
machinaTracker.writeTimes = (container) => {
  const now = Date.now();
  for (const element of container.querySelectorAll('[data-time]')) element.textContent = machinaTracker.formatTime(Number(element.dataset.time), now);
};

// writes the times in open labels and popups again, so they stay current
machinaTracker.refreshTimes = () => {
  machinaTracker.drawnTraces.eachLayer((layer) => {
    const tooltip = layer.getTooltip();
    if (tooltip?.isOpen()) tooltip.update();
  });
  if (machinaTracker.popup.isOpen()) {
    machinaTracker.writeTimes(machinaTracker.popup.getContent());
    // a layout for the new width of the times, without panning back to a popup the map was moved away from
    const { autoPan } = machinaTracker.popup.options;
    machinaTracker.popup.options.autoPan = false;
    machinaTracker.popup.update();
    machinaTracker.popup.options.autoPan = autoPan;
  }
};

machinaTracker.redraw = () => {
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) return;
  machinaTracker.drawnTraces.clearLayers();
  machinaTracker.drawData();
};

machinaTracker.onClickListener = (event) => {
  var marker = event.target;

  if (marker.options.desc) {
    machinaTracker.writeTimes(marker.options.desc);
    machinaTracker.popup.setContent(marker.options.desc);
    machinaTracker.popup.setLatLng(marker.getLatLng());
    window.map.openPopup(machinaTracker.popup);
  }
};

machinaTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-list span:contains("Machina Tracker")').parent('label');
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) {
    machinaTracker.drawnTraces.clearLayers();
    ctrl.addClass('disabled').attr('data-popover', 'Zoom in to show those.');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    IITC.chat.backgroundChannelData('plugin.machinaTracker', 'all', false); // disable this plugin's interest in 'all' COMM
  } else {
    ctrl.removeClass('disabled').removeAttr('data-popover');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    IITC.chat.backgroundChannelData('plugin.machinaTracker', 'all', true); // enable this plugin's interest in 'all' COMM
  }
};

machinaTracker.getLimit = function () {
  return new Date().getTime() - machinaTracker.MACHINA_TRACKER_MAX_TIME;
};

machinaTracker.discardOldData = function () {
  var limit = machinaTracker.getLimit();
  machinaTracker.events = machinaTracker.events.reduce((result, event) => {
    event.to = event.to.filter((to) => to.time >= limit);
    if (event.to.length) {
      result.push(event);
    }
    return result;
  }, []);
};

machinaTracker.toLanLng = function (locationData) {
  return new L.LatLng(locationData.latE6 / 1e6, locationData.lngE6 / 1e6);
};

machinaTracker.createEvent = function (json) {
  var newEvent = { time: json[1] };
  json[2].plext.markup.forEach((markup) => {
    switch (markup[0]) {
      case 'PLAYER':
        newEvent.team = markup[1].team;
        break;
      case 'PORTAL':
        if (!newEvent.from) {
          newEvent.from = {
            latLng: machinaTracker.toLanLng(markup[1]),
            name: markup[1].name,
          };
        } else {
          newEvent.to = [
            {
              latLng: machinaTracker.toLanLng(markup[1]),
              name: markup[1].name,
              time: json[1],
            },
          ];
        }
        break;
    }
  });

  return newEvent;
};

machinaTracker.processNewData = function (data) {
  var limit = machinaTracker.getLimit();
  data.result.forEach((json) => {
    if (json[1] >= limit) {
      var newEvent = machinaTracker.createEvent(json);
      if (newEvent.from && newEvent.to && newEvent.team && [window.TEAM_MAC, window.TEAM_NONE].includes(window.teamStringToId(newEvent.team))) {
        var prevEvent = machinaTracker.events.find((e) => e.from.latLng.equals(newEvent.from.latLng));
        if (!prevEvent) {
          machinaTracker.events.push(newEvent);
        } else {
          var newTo = newEvent.to[0];
          if (!prevEvent.to.some((to) => newTo.latLng.equals(to.latLng) && newTo.time === to.time)) {
            prevEvent.to.push(newTo);
            prevEvent.to.sort((a, b) => a.time - b.time);
            prevEvent.time = prevEvent.to[0].time;
          }
        }
      }
    }
  });
};

machinaTracker.createPortalLink = (portal) =>
  IITC.utils.createElement(
    'a',
    {
      className: 'text-overflow-ellipsis',
      title: portal.name,
      href: IITC.portal.display.makePermalink(portal.latLng),
      onclick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        IITC.portal.selectByLatLng(portal.latLng);
      },
      ondblclick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.map.setView(portal.latLng, window.DEFAULT_ZOOM);
        IITC.portal.selectByLatLng(portal.latLng);
      },
    },
    portal.name
  );

machinaTracker.drawData = function () {
  var isTouchDev = window.isTouchDevice();
  const showAlways = IITC.options.get('machina-tracker.alwaysShowLabels');

  var split = machinaTracker.MACHINA_TRACKER_MAX_TIME / 4;
  var now = new Date().getTime();

  machinaTracker.events.forEach((event) => {
    var ageBucket = Math.min((now - event.time) / split, 3);
    var position = event.from.latLng;

    // written whenever the label is shown, so the time in it stays current
    const title = () => machinaTracker.formatTime(event.time, Date.now());
    var icon = machinaTracker.icon;
    var opacity = 1 - 0.2 * ageBucket;

    const el = IITC.utils.createElement;
    const popup = el(
      'div',
      { className: 'plugin-machina-tracker-popup' },
      el('div', { className: 'plugin-machina-tracker-popup-header' }, machinaTracker.createPortalLink(event.from)),
      el(
        'ul',
        { className: 'plugin-machina-tracker-link-list' },
        ...event.to.map((to) => el('li', {}, machinaTracker.createPortalLink(to), ' ', machinaTracker.timeElement(to.time)))
      )
    );

    const m = new L.Marker(position, { icon, opacity, desc: popup });
    // a label on hover needs a mouse, an ever shown one fades with the marker and keeps to one side
    if (showAlways) m.bindTooltip(title, { permanent: true, direction: 'right', opacity, className: 'plugin-machina-tracker-label' });
    else if (!isTouchDev) m.bindTooltip(title, { className: 'plugin-machina-tracker-label' });
    m.addEventListener('spiderfiedclick', machinaTracker.onClickListener);

    window.registerMarkerForOMS(m);
    m.addTo(machinaTracker.drawnTraces);
  });
};

machinaTracker.handleData = function (data) {
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) return;

  machinaTracker.discardOldData();
  machinaTracker.processNewData(data);

  machinaTracker.drawnTraces.clearLayers();
  machinaTracker.drawData();
};

var setup = machinaTracker.setup;

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

