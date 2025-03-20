// ==UserScript==
// @author         Johtaja
// @name           IITC plugin: Highlight portals based on history
// @category       Highlighter
// @version        0.3.3.20250320.084703
// @description    Use the portal fill color to denote the portal has been visited, captured, scout controlled
// @id             highlight-portal-history
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/highlight-portal-history.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/highlight-portal-history.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/highlight-portal-history.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-03-20-084703';
plugin_info.pluginId = 'highlight-portal-history';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global L -- eslint */

var changelog = [
  {
    version: '0.3.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var portalsHistory = {};
window.plugin.portalHighlighterPortalsHistory = portalsHistory;

// exposed objects
portalsHistory.styles = {
  common: {
    fillOpacity: 1,
  },
  marked: {
    fillColor: 'red',
  },
  semiMarked: {
    fillColor: 'yellow',
  },
  commonOther: {
    // no action by default
  },
};

function highlightPortalsHistoryVisited(data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (history.captured) {
    data.portal.setStyle(s.captured);
  } else if (history.visited) {
    data.portal.setStyle(s.visited);
  } else if (!$.isEmptyObject(s.otherVC)) {
    data.portal.setStyle(s.otherVC);
  }
}

function highlightPortalsHistoryNotVisited(data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (!history.visited) {
    data.portal.setStyle(s.visitTarget);
  } else if (!history.captured) {
    data.portal.setStyle(s.captureTarget);
  } else if (!$.isEmptyObject(s.otherNotVC)) {
    data.portal.setStyle(s.otherNotVC);
  }
}

function highlightPortalsHistoryScoutControlled(data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (history.scoutControlled) {
    data.portal.setStyle(s.scoutControlled);
  } else if (!$.isEmptyObject(s.otherScout)) {
    data.portal.setStyle(s.otherScout);
  }
}

function highlightPortalsHistoryNotScoutControlled(data) {
  var history = data.portal.options.data.history;
  if (!history) {
    return;
  }
  var s = portalsHistory.styles;
  if (!history.scoutControlled) {
    data.portal.setStyle(s.scoutControllTarget);
  } else if (!$.isEmptyObject(s.otherNotScout)) {
    data.portal.setStyle(s.otherNotScout);
  }
}

// Creating styles based on a given template
function inherit(parentName, childNames) {
  var styles = portalsHistory.styles;
  childNames.forEach(function (name) {
    // Extension of _styles_ with a new _name_ object, created based on _parentName_ object.
    styles[name] = L.extend(L.Util.create(styles[parentName]), styles[name]);
  });
}

function setup() {
  inherit('common', ['marked', 'semiMarked']);
  inherit('semiMarked', ['visited', 'captureTarget']);
  inherit('marked', ['captured', 'visitTarget', 'scoutControlled', 'scoutControllTarget']);
  inherit('commonOther', ['otherVC', 'otherNotVC', 'otherScout', 'otherNotScout']);

  window.addPortalHighlighter('History: visited/captured', highlightPortalsHistoryVisited);
  window.addPortalHighlighter('History: not visited/captured', highlightPortalsHistoryNotVisited);
  window.addPortalHighlighter('History: scout controlled', highlightPortalsHistoryScoutControlled);
  window.addPortalHighlighter('History: not scout controlled', highlightPortalsHistoryNotScoutControlled);
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

