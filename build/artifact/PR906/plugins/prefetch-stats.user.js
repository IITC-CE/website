// ==UserScript==
// @author         modos189
// @name           IITC plugin: Prefetch statistics
// @category       Debug
// @version        0.1.0.20260424.191504
// @description    Track and display portal detail prefetch statistics: total fetches, wasted prefetches, and cold fetches (no prefetch).
// @id             prefetch-stats
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR906/plugins/prefetch-stats.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR906/plugins/prefetch-stats.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/prefetch-stats.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2026-04-24-191504';
plugin_info.pluginId = 'prefetch-stats';
//END PLUGIN AUTHORS NOTE

/* exported setup --eslint */
/* global IITC -- eslint */

// use own namespace for plugin
window.plugin.prefetchStats = {};

var STORAGE_KEY = 'plugin-prefetch-stats';

var stats = {
  total: 0,
  prefetchWithoutClick: 0,
  clickWithoutPrefetch: 0,
};

function loadStats() {
  var stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  try {
    var parsed = JSON.parse(stored);
    stats.total = parsed.total || 0;
    stats.prefetchWithoutClick = parsed.prefetchWithoutClick || 0;
    stats.clickWithoutPrefetch = parsed.clickWithoutPrefetch || 0;
  } catch (e) {
    // ignore malformed data
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function buildDialogHtml() {
  var prefetchUsed = stats.total - stats.prefetchWithoutClick - stats.clickWithoutPrefetch;

  var rows = [
    ['Total portal data fetches', stats.total],
    ['Prefetched, then clicked (prefetch helped)', prefetchUsed],
    ['Prefetched, but never clicked (wasted prefetch)', stats.prefetchWithoutClick],
    ['Clicked without prior prefetch (cold fetch)', stats.clickWithoutPrefetch],
  ];

  var html = '<table id="prefetch-stats-table">';
  rows.forEach(function (row) {
    html += '<tr><td>' + row[0] + '</td><td class="prefetch-stats-num">' + Math.max(0, row[1]) + '</td></tr>';
  });
  html += '</table>';

  if (stats.total > 0) {
    var userFetches = prefetchUsed + stats.clickWithoutPrefetch;
    if (userFetches > 0) {
      var hitRate = ((prefetchUsed / userFetches) * 100).toFixed(1);
      html += '<p class="prefetch-stats-rate">Prefetch hit rate (user-triggered fetches): <b>' + hitRate + '%</b></p>';
    }

    var allPrefetches = prefetchUsed + stats.prefetchWithoutClick;
    if (allPrefetches > 0) {
      var usefulRate = ((prefetchUsed / allPrefetches) * 100).toFixed(1);
      html += '<p class="prefetch-stats-rate">Useful prefetch rate (prefetch requests used): <b>' + usefulRate + '%</b></p>';
    }
  }

  html += '<p><button id="prefetch-stats-reset">Reset statistics</button></p>';
  return html;
}

function showStats() {
  var container = window.dialog({
    html: buildDialogHtml(),
    title: 'Prefetch Statistics',
    id: 'plugin-prefetch-stats',
    width: 'auto',
  });

  container.on('click', '#prefetch-stats-reset', function () {
    window.plugin.prefetchStats.resetStats();
  });
}

window.plugin.prefetchStats.resetStats = function () {
  stats.total = 0;
  stats.prefetchWithoutClick = 0;
  stats.clickWithoutPrefetch = 0;
  saveStats();
  var dlg = document.getElementById('plugin-prefetch-stats');
  if (dlg) {
    $(dlg).html(buildDialogHtml());
    $(dlg).off('click', '#prefetch-stats-reset').on('click', '#prefetch-stats-reset', function () {
      window.plugin.prefetchStats.resetStats();
    });
  }
};

function onPortalDetailLoaded(data) {
  if (!data.success) return;

  stats.total++;

  if (data.prefetch) {
    // Prefetch response: check if user had already selected this portal (clicked it while loading)
    if (window.selectedPortal !== data.guid) {
      stats.prefetchWithoutClick++;
    }
  } else {
    // User-triggered fetch: no prefetch was in progress, so user clicked before the prefetch timer fired
    stats.clickWithoutPrefetch++;
  }

  saveStats();
}

function setup() {
  loadStats();

  window.addHook('portalDetailLoaded', onPortalDetailLoaded);

  IITC.toolbox.addButton({
    label: 'Prefetch stats',
    title: 'Show portal detail prefetch statistics',
    action: showStats,
  });

  $('<style>').prop('type', 'text/css').text(
    '#prefetch-stats-table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }' +
    '#prefetch-stats-table td { padding: 4px 8px; border-bottom: 1px solid #0b314e; }' +
    '#prefetch-stats-table .prefetch-stats-num { text-align: right; font-weight: bold; min-width: 4em; }' +
    '.prefetch-stats-rate { margin: 4px 0; }'
  ).appendTo('head');
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

