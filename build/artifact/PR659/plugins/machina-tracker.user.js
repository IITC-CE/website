// ==UserScript==
// @name           IITC plugin: Machina tracker
// @author         McBen
// @category       Layer
// @version        1.0.0.20230803.154036
// @description    Show locations of Machina activities
// @id             machina-tracker
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR659/plugins/machina-tracker.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR659/plugins/machina-tracker.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/machina-tracker.png
// @icon64         https://iitc.app/extras/plugin-icons/machina-tracker-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-08-03-154036';
plugin_info.pluginId = 'machina-tracker';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L */

var changelog = [
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
').appendTo('head');

  var iconImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMTEgMCA2LjYxNDYgMTAuODQ4IiB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhckdyYWRpZW50MTMwMzciIHgxPSIxNC4yOTgiIHgyPSIxNC4yMTUiIHkxPSI5LjYzMzgiIHkyPSIuNDkzNjQiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBzdG9wLWNvbG9yPSIjYmQwMDAwIiBvZmZzZXQ9IjAiLz48c3RvcCBzdG9wLWNvbG9yPSIjZTgwMDAwIiBvZmZzZXQ9IjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cGF0aCBkPSJtMTQuMzEgMGMtMS44MjMgMS40OTIyZS01IC0zLjMwMTIgMS40NzgxLTMuMzAxMiAzLjMwMTIgNi43OWUtNCAwLjQ5NzU2IDAuMTE0NjUgMC45ODc1MiAwLjMzMSAxLjQzNDFsLTAuMDAxNS0wLjAwMTU1IDIuOTU2NyA2LjExNDFjMS4wMjk2LTIuMTA2OCAyLjA1NzYtNC4yMTQzIDMuMDg3Ni02LjMyMDkgMC4xMTI4My0wLjIzMTEgMC4yMjc3Ni0wLjcyNDg4IDAuMjI4NTEtMS4yMjU4LTEuNWUtNSAtMS44MjMxLTEuNDc4MS0zLjMwMTItMy4zMDEyLTMuMzAxMnoiIGZpbGw9IiNhMDAiLz48cGF0aCBkPSJtMTQuMDE0IDAuMjc4NTVjLTEuOTMwOSAwLjEyMTItMy4zMDU5IDIuMzQyOC0yLjUyODIgNC4xMjExIDAuOTEzOTcgMS45NTc4IDEuODc4NSAzLjg5MjkgMi44MTE2IDUuODQyIDAuOTY2NTgtMi4wMzggMi4wMjY0LTQuMDQwMyAyLjkzNjMtNi4xMDAxIDAuNTc2ODgtMS44MTQ2LTAuOTE1ODktMy44ODM0LTIuODI3NC0zLjg3MzUtMC4xMzA3Mi0wLjAxMzc0Mi0wLjI2MTY0IDAuMDA4MDgxNi0wLjM5MjM5IDAuMDEwNTJ6IiBmaWxsPSIjZjAwIi8+PHBhdGggZD0ibTE0LjA0OSAwLjU0MDQ4Yy0xLjkxNDQgMC4wOTUwMTMtMy4xODUzIDIuNTA2Ni0yLjE0MTUgNC4xMzA3IDAuNzgwOTIgMS42NjE2IDEuNTkyNyAzLjMwODYgMi4zODk3IDQuOTYyNiAwLjkxMDE0LTEuOTYxNiAyLjAwNDctMy44NTU0IDIuNzU4MS01Ljg4MTcgMC4zMDMzNC0xLjcwNTUtMS4yNTkxLTMuNDQ0NS0zLjAwNjMtMy4yMTE2eiIgZmlsbD0idXJsKCNsaW5lYXJHcmFkaWVudDEzMDM3KSIvPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEuMDAwOCAwIDAgMS4wMDA4IC0uMDA4OTIxNCAtLjAwODc5MjEpIj48ZyB0cmFuc2Zvcm09Im1hdHJpeCguMDY4MTA4IDAgMCAuMDY4MTA4IDcuMTUzNCAtNi44NzQyKSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjZmZmIj48cGF0aCBkPSJtMTA1IDEyNy42M2EyMC44NjYgMjAuODY2IDAgMCAwLTIwLjg2NiAyMC44NjYgMjAuODY2IDIwLjg2NiAwIDAgMCAyMC44NjYgMjAuODY2IDIwLjg2NiAyMC44NjYgMCAwIDAgMjAuODY3LTIwLjg2NiAyMC44NjYgMjAuODY2IDAgMCAwLTIwLjg2Ny0yMC44NjZ6bTAgMS40OTA0YTE5LjM3NiAxOS4zNzYgMCAwIDEgMTkuMzc2IDE5LjM3NiAxOS4zNzYgMTkuMzc2IDAgMCAxLTE5LjM3NiAxOS4zNzYgMTkuMzc2IDE5LjM3NiAwIDAgMS0xOS4zNzYtMTkuMzc2IDE5LjM3NiAxOS4zNzYgMCAwIDEgMTkuMzc2LTE5LjM3NnoiIHN0cm9rZS13aWR0aD0iLjI2NzAzIi8+PGNpcmNsZSBjeD0iMTA1IiBjeT0iMTQ4LjUiIHI9IjE2Ljg5MiIgc3Ryb2tlLXdpZHRoPSIuMjE2MTciLz48cGF0aCBkPSJtMTA2LjQgMTQ5LjI3LTMuMzYyOS0yNC42NzIgMi4yNTA2LTAuMjc2NjEgNC40NDk2LTUuNTkzMy0wLjEyNzE1LTFlLTUgLTUuOTc1MS0xMC40MjQgMS4zOTg0IDEwLjA0My05LjIxNjMgMS4zMzQ1LTAuNTA4NjQtNC40NDkyLTIuNzk2OCA1Ljg0OCA1LjUzMDEgNC4xMzEzIDIuMjU0Ni0wLjI3Njk3IDMuMzcwNSAyNC43OHoiIHN0cm9rZS13aWR0aD0iLjI2NSIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM2LjI3NiA5Ljg3NDEpIiBzdHJva2Utd2lkdGg9Ii4yNjUiPjxwYXRoIGQ9Im02OS44ODUgMTQwLjQzIDE1LjA2OC0xOS44MjQgMS43ODcgMS4zOTU4IDcuMTAxNC0wLjgwODc0LTAuMDg5OTItMC4wODk5IDMuMTQ2MS0xMS41OTYtNi4xMTI4IDguMDkwNS03LjQ2MDUtNS41NzMzIDIuNzg2NC0zLjUwNTctNi4xMTI4IDIuMTU3NSAwLjk4OTA5IDYuODMxNiAxLjc5MDEgMS4zOTg0LTE1LjEzOSAxOS45MDZ6Ii8+PHBhdGggZD0ibTY4Ljk4NCAxNDAuOTggMjQuNjcyLTMuMzYyOCAwLjI3NjYyIDIuMjUwNiA1LjU5MzMgNC40NDk2LTVlLTYgLTAuMTI3MTYgMTAuNDI0LTUuOTc1MS0xMC4wNDMgMS4zOTg0LTEuMzM0NS05LjIxNjMgNC40NDkyLTAuNTA4NjQtNS44NDgtMi43OTY4LTQuMTMxMyA1LjUzMDEgMC4yNzY5OCAyLjI1NDYtMjQuNzggMy4zNzA1eiIvPjxwYXRoIGQ9Im02Ny45NTMgMTQwLjc0IDE5LjgyNCAxNS4wNjgtMS4zOTU4IDEuNzg3IDAuODA4NzQgNy4xMDE0IDAuMDg5OTEtMC4wODk5IDExLjU5NiAzLjE0NjEtOC4wOTA1LTYuMTEyOCA1LjU3MzMtNy40NjA1IDMuNTA1NyAyLjc4NjQtMi4xNTc1LTYuMTEyOC02LjgzMTYgMC45ODkwOC0xLjM5ODQgMS43OTAxLTE5LjkwNi0xNS4xMzl6Ii8+PHBhdGggZD0ibTY3LjM5NSAxMzkuODQgMy4zNjI5IDI0LjY3Mi0yLjI1MDYgMC4yNzY2MS00LjQ0OTYgNS41OTMzIDAuMTI3MTUgMWUtNSA1Ljk3NTEgMTAuNDI0LTEuMzk4NC0xMC4wNDMgOS4yMTYzLTEuMzM0NSAwLjUwODY0IDQuNDQ5MiAyLjc5NjgtNS44NDgtNS41MzAxLTQuMTMxMy0yLjI1NDYgMC4yNzY5Ny0zLjM3MDUtMjQuNzh6Ii8+PC9nPjxnIHN0cm9rZS13aWR0aD0iLjI2NSI+PHBhdGggZD0ibTEwMy45MSAxNDguNjgtMTUuMDY4IDE5LjgyNC0xLjc4Ny0xLjM5NTgtNy4xMDE0IDAuODA4NzQgMC4wODk5MiAwLjA4OTktMy4xNDYxIDExLjU5NiA2LjExMjgtOC4wOTA1IDcuNDYwNSA1LjU3MzMtMi43ODY0IDMuNTA1NyA2LjExMjgtMi4xNTc1LTAuOTg5MDktNi44MzE2LTEuNzkwMS0xLjM5ODQgMTUuMTM5LTE5LjkwNnoiLz48cGF0aCBkPSJtMTA0LjgyIDE0OC4xMy0yNC42NzIgMy4zNjI4LTAuMjc2NjItMi4yNTA2LTUuNTkzMy00LjQ0OTYgNWUtNiAwLjEyNzE2LTEwLjQyNCA1Ljk3NTEgMTAuMDQzLTEuMzk4NCAxLjMzNDUgOS4yMTYzLTQuNDQ5MiAwLjUwODY0IDUuODQ4IDIuNzk2OCA0LjEzMTMtNS41MzAxLTAuMjc2OTgtMi4yNTQ2IDI0Ljc4LTMuMzcwNXoiLz48cGF0aCBkPSJtMTA1Ljg1IDE0OC4zNy0xOS44MjQtMTUuMDY4IDEuMzk1OC0xLjc4Ny0wLjgwODc0LTcuMTAxNC0wLjA4OTkxIDAuMDg5OS0xMS41OTYtMy4xNDYxIDguMDkwNSA2LjExMjgtNS41NzMzIDcuNDYwNS0zLjUwNTctMi43ODY0IDIuMTU3NSA2LjExMjggNi44MzE2LTAuOTg5MDggMS4zOTg0LTEuNzkwMSAxOS45MDYgMTUuMTM5eiIvPjwvZz48L2c+PC9nPjwvc3ZnPgo=';

  machinaTracker.icon = L.icon({
    iconUrl: iconImage,
    iconSize: [26, 32],
    iconAnchor: [12, 32],
  });

  machinaTracker.popup = new L.Popup({ offset: L.point([1, -34]) });
  machinaTracker.drawnTraces = new L.LayerGroup([], { minZoom: machinaTracker.MACHINA_TRACKER_MIN_ZOOM });
  window.addLayerGroup('Machina Tracker', machinaTracker.drawnTraces, true);

  window.addHook('publicChatDataAvailable', machinaTracker.handleData);

  window.map.on('zoomend', machinaTracker.zoomListener);
  machinaTracker.zoomListener();
};

machinaTracker.onClickListener = (event) => {
  var marker = event.target;

  if (marker.options.desc) {
    machinaTracker.popup.setContent(marker.options.desc);
    machinaTracker.popup.setLatLng(marker.getLatLng());
    window.map.openPopup(machinaTracker.popup);
  }
};

machinaTracker.zoomListener = function () {
  var ctrl = $('.leaflet-control-layers-list span:contains("Machina Tracker")').parent('label');
  if (window.map.getZoom() < machinaTracker.MACHINA_TRACKER_MIN_ZOOM) {
    machinaTracker.drawnTraces.clearLayers();
    ctrl.addClass('disabled').attr('title', 'Zoom in to show those.');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    window.chat.backgroundChannelData('plugin.machinaTracker', 'all', false); // disable this plugin's interest in 'all' COMM
  } else {
    ctrl.removeClass('disabled').attr('title', '');
    // note: zoomListener is also called at init time to set up things, so we only need to do this in here
    window.chat.backgroundChannelData('plugin.machinaTracker', 'all', true); // enable this plugin's interest in 'all' COMM
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
  return L.latLng(locationData.latE6 / 1e6, locationData.lngE6 / 1e6);
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
      if (newEvent.from && newEvent.to && [window.TEAM_MAC, window.TEAM_NONE].includes(window.teamStringToId(newEvent.team))) {
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

machinaTracker.ago = function (time, now) {
  var s = (now - time) / 1000;
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var returnVal = m + 'm';
  if (h > 0) {
    returnVal = h + 'h' + returnVal;
  }
  return returnVal + ' ago';
};

machinaTracker.createPortalLink = function (portal) {
  return $('<a>')
    .addClass('text-overflow-ellipsis')
    .text(portal.name)
    .prop({
      title: portal.name,
      href: window.makePermalink(portal.latLng),
    })
    .click((event) => {
      window.selectPortalByLatLng(portal.latLng);
      event.preventDefault();
      return false;
    })
    .dblclick((event) => {
      window.map.setView(portal.latLng, window.DEFAULT_ZOOM);
      window.selectPortalByLatLng(portal.latLng);
      event.preventDefault();
      return false;
    });
};

machinaTracker.drawData = function () {
  var isTouchDev = window.isTouchDevice();

  var split = machinaTracker.MACHINA_TRACKER_MAX_TIME / 4;
  var now = new Date().getTime();

  machinaTracker.events.forEach((event) => {
    var ageBucket = Math.min((now - event.time) / split, 3);
    var position = event.from.latLng;

    var title = isTouchDev ? '' : machinaTracker.ago(event.time, now);
    var icon = machinaTracker.icon;
    var opacity = 1 - 0.2 * ageBucket;

    var popup = $('<div>').addClass('plugin-machina-tracker-popup');
    $('<div>').addClass('plugin-machina-tracker-popup-header').append(machinaTracker.createPortalLink(event.from)).appendTo(popup);

    var linkList = $('<ul>').addClass('plugin-machina-tracker-link-list');
    linkList.appendTo(popup);

    event.to.forEach((to) => {
      $('<li>').append(machinaTracker.createPortalLink(to)).append(' ').append(machinaTracker.ago(to.time, now)).appendTo(linkList);
    });

    var m = L.marker(position, { icon: icon, opacity: opacity, desc: popup[0], title: title });
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

