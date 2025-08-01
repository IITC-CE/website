// ==UserScript==
// @author         3ch01c
// @name           IITC plugin: Uniques
// @category       Misc
// @version        0.2.7.20250709.180413
// @description    Allow manual entry of portals visited/captured. Use the 'highlighter-uniques' plugin to show the uniques on the map, and 'sync' to share between multiple browsers or desktop/mobile. It will try and guess which portals you have captured from COMM/portal details, but this will not catch every case.
// @id             uniques
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/uniques.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/uniques.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/uniques.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-07-09-180413';
plugin_info.pluginId = 'uniques';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.2.7',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.2.6',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.2.5',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.uniques = function () {};

// delay in ms
window.plugin.uniques.SYNC_DELAY = 5000;

// maps the JS property names to localStorage keys
window.plugin.uniques.FIELDS = {
  uniques: 'plugin-uniques-data',
  updateQueue: 'plugin-uniques-data-queue',
  updatingQueue: 'plugin-uniques-data-updating-queue',
};

window.plugin.uniques.uniques = {};
window.plugin.uniques.updateQueue = {};
window.plugin.uniques.updatingQueue = {};

window.plugin.uniques.enableSync = false;

window.plugin.uniques.disabledMessage = null;
window.plugin.uniques.contentHTML = null;

window.plugin.uniques.isHighlightActive = false;

window.plugin.uniques.onPortalDetailsUpdated = function (data) {
  if (typeof Storage === 'undefined') {
    $('#portaldetails > .imgpreview').after(window.plugin.uniques.disabledMessage);
    return;
  }

  var guid = window.selectedPortal,
    details = data.portalDetails,
    nickname = window.PLAYER.nickname;
  if (details) {
    if (details.owner === nickname) {
      // FIXME: a virus flip will set the owner of the portal, but doesn't count as a unique capture
      window.plugin.uniques.updateCaptured(true);
      // no further logic required
    } else {
      function installedByPlayer(entity) {
        return entity && entity.owner === nickname;
      }

      if (details.resonators.some(installedByPlayer) || details.mods.some(installedByPlayer)) {
        window.plugin.uniques.updateVisited(true);
      }
    }
  }

  $('#portaldetails > .imgpreview').after(window.plugin.uniques.contentHTML);
  window.plugin.uniques.updateCheckedAndHighlight(guid);
};

window.plugin.uniques.onPublicChatDataAvailable = function (data) {
  var nick = window.PLAYER.nickname;
  data.result.forEach(function (msg) {
    var plext = msg[2].plext,
      markup = plext.markup;

    if (
      plext.plextType === 'SYSTEM_BROADCAST' &&
      markup.length === 5 &&
      markup[0][0] === 'PLAYER' &&
      markup[0][1].plain === nick &&
      markup[1][0] === 'TEXT' &&
      markup[1][1].plain === ' deployed an ' &&
      markup[2][0] === 'TEXT' &&
      markup[3][0] === 'TEXT' &&
      markup[3][1].plain === ' Resonator on ' &&
      markup[4][0] === 'PORTAL'
    ) {
      // search for "x deployed an Ly Resonator on z"
      var portal = markup[4][1];
      var guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalVisited(guid);
    } else if (
      plext.plextType === 'SYSTEM_BROADCAST' &&
      markup.length === 3 &&
      markup[0][0] === 'PLAYER' &&
      markup[0][1].plain === nick &&
      markup[1][0] === 'TEXT' &&
      markup[1][1].plain === ' deployed a Resonator on ' &&
      markup[2][0] === 'PORTAL'
    ) {
      // search for "x deployed a Resonator on z"
      const portal = markup[2][1];
      const guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalVisited(guid);
    } else if (
      plext.plextType === 'SYSTEM_BROADCAST' &&
      markup.length === 3 &&
      markup[0][0] === 'PLAYER' &&
      markup[0][1].plain === nick &&
      markup[1][0] === 'TEXT' &&
      markup[1][1].plain === ' captured ' &&
      markup[2][0] === 'PORTAL'
    ) {
      // search for "x captured y"
      const portal = markup[2][1];
      const guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalCaptured(guid);
    } else if (
      plext.plextType === 'SYSTEM_BROADCAST' &&
      markup.length === 5 &&
      markup[0][0] === 'PLAYER' &&
      markup[0][1].plain === nick &&
      markup[1][0] === 'TEXT' &&
      markup[1][1].plain === ' linked ' &&
      markup[2][0] === 'PORTAL' &&
      markup[3][0] === 'TEXT' &&
      markup[3][1].plain === ' to ' &&
      markup[4][0] === 'PORTAL'
    ) {
      // search for "x linked y to z"
      const portal = markup[2][1];
      const guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalVisited(guid);
    } else if (
      plext.plextType === 'SYSTEM_NARROWCAST' &&
      markup.length === 6 &&
      markup[0][0] === 'TEXT' &&
      markup[0][1].plain === 'Your ' &&
      markup[1][0] === 'TEXT' &&
      markup[2][0] === 'TEXT' &&
      markup[2][1].plain === ' Resonator on ' &&
      markup[3][0] === 'PORTAL' &&
      markup[4][0] === 'TEXT' &&
      markup[4][1].plain === ' was destroyed by ' &&
      markup[5][0] === 'PLAYER'
    ) {
      // search for "Your Lx Resonator on y was destroyed by z"
      const portal = markup[3][1];
      const guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalVisited(guid);
    } else if (
      plext.plextType === 'SYSTEM_NARROWCAST' &&
      markup.length === 5 &&
      markup[0][0] === 'TEXT' &&
      markup[0][1].plain === 'Your ' &&
      markup[1][0] === 'TEXT' &&
      markup[2][0] === 'TEXT' &&
      markup[2][1].plain === ' Resonator on ' &&
      markup[3][0] === 'PORTAL' &&
      markup[4][0] === 'TEXT' &&
      markup[4][1].plain === ' has decayed'
    ) {
      // search for "Your Lx Resonator on y has decayed"
      const portal = markup[3][1];
      const guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalVisited(guid);
    } else if (
      plext.plextType === 'SYSTEM_NARROWCAST' &&
      markup.length === 4 &&
      markup[0][0] === 'TEXT' &&
      markup[0][1].plain === 'Your Portal ' &&
      markup[1][0] === 'PORTAL' &&
      markup[2][0] === 'TEXT' &&
      (markup[2][1].plain === ' neutralized by ' || markup[2][1].plain === ' is under attack by ') &&
      markup[3][0] === 'PLAYER'
    ) {
      // search for "Your Portal x neutralized by y"
      // search for "Your Portal x is under attack by y"
      const portal = markup[1][1];
      const guid = window.findPortalGuidByPositionE6(portal.latE6, portal.lngE6);
      if (guid) window.plugin.uniques.setPortalVisited(guid);
    }
  });
};

window.plugin.uniques.updateCheckedAndHighlight = function (guid) {
  window.runHooks('pluginUniquesUpdateUniques', { guid: guid });

  if (guid === window.selectedPortal) {
    var uniqueInfo = window.plugin.uniques.uniques[guid],
      visited = (uniqueInfo && uniqueInfo.visited) || false,
      captured = (uniqueInfo && uniqueInfo.captured) || false;
    $('#visited').prop('checked', visited);
    $('#captured').prop('checked', captured);
  }

  if (window.plugin.uniques.isHighlightActive) {
    if (window.portals[guid]) {
      window.setMarkerStyle(window.portals[guid], guid === window.selectedPortal);
    }
  }
};

window.plugin.uniques.setPortalVisited = function (guid) {
  var uniqueInfo = window.plugin.uniques.uniques[guid];
  if (uniqueInfo) {
    if (uniqueInfo.visited) return;

    uniqueInfo.visited = true;
  } else {
    window.plugin.uniques.uniques[guid] = {
      visited: true,
      captured: false,
    };
  }

  window.plugin.uniques.updateCheckedAndHighlight(guid);
  window.plugin.uniques.sync(guid);
};

window.plugin.uniques.setPortalCaptured = function (guid) {
  var uniqueInfo = window.plugin.uniques.uniques[guid];
  if (uniqueInfo) {
    if (uniqueInfo.visited && uniqueInfo.captured) return;

    uniqueInfo.visited = true;
    uniqueInfo.captured = true;
  } else {
    window.plugin.uniques.uniques[guid] = {
      visited: true,
      captured: true,
    };
  }

  window.plugin.uniques.updateCheckedAndHighlight(guid);
  window.plugin.uniques.sync(guid);
};

window.plugin.uniques.updateVisited = function (visited, guid) {
  if (guid === undefined) guid = window.selectedPortal;

  var uniqueInfo = window.plugin.uniques.uniques[guid];
  if (!uniqueInfo) {
    window.plugin.uniques.uniques[guid] = uniqueInfo = {
      visited: false,
      captured: false,
    };
  }

  if (visited === uniqueInfo.visited) return;

  if (visited) {
    uniqueInfo.visited = true;
  } else {
    // not visited --> not captured
    uniqueInfo.visited = false;
    uniqueInfo.captured = false;
  }

  window.plugin.uniques.updateCheckedAndHighlight(guid);
  window.plugin.uniques.sync(guid);
};

window.plugin.uniques.updateCaptured = function (captured, guid) {
  if (guid === undefined) guid = window.selectedPortal;

  var uniqueInfo = window.plugin.uniques.uniques[guid];
  if (!uniqueInfo) {
    window.plugin.uniques.uniques[guid] = uniqueInfo = {
      visited: false,
      captured: false,
    };
  }

  if (captured === uniqueInfo.captured) return;

  if (captured) {
    // captured --> visited
    uniqueInfo.captured = true;
    uniqueInfo.visited = true;
  } else {
    uniqueInfo.captured = false;
  }

  window.plugin.uniques.updateCheckedAndHighlight(guid);
  window.plugin.uniques.sync(guid);
};

// stores the gived GUID for sync
window.plugin.uniques.sync = function (guid) {
  window.plugin.uniques.updateQueue[guid] = true;
  window.plugin.uniques.storeLocal('uniques');
  window.plugin.uniques.storeLocal('updateQueue');
  window.plugin.uniques.syncQueue();
};

// sync the queue, but delay the actual sync to group a few updates in a single request
window.plugin.uniques.syncQueue = function () {
  if (!window.plugin.uniques.enableSync) return;

  clearTimeout(window.plugin.uniques.syncTimer);

  window.plugin.uniques.syncTimer = setTimeout(function () {
    window.plugin.uniques.syncTimer = null;

    $.extend(window.plugin.uniques.updatingQueue, window.plugin.uniques.updateQueue);
    window.plugin.uniques.updateQueue = {};
    window.plugin.uniques.storeLocal('updatingQueue');
    window.plugin.uniques.storeLocal('updateQueue');

    window.plugin.sync.updateMap('uniques', 'uniques', Object.keys(window.plugin.uniques.updatingQueue));
  }, window.plugin.uniques.SYNC_DELAY);
};

// Call after IITC and all plugin loaded
window.plugin.uniques.registerFieldForSyncing = function () {
  if (!window.plugin.sync) return;
  window.plugin.sync.registerMapForSync('uniques', 'uniques', window.plugin.uniques.syncCallback, window.plugin.uniques.syncInitialed);
};

// Call after local or remote change uploaded
window.plugin.uniques.syncCallback = function (pluginName, fieldName, e, fullUpdated) {
  if (fieldName === 'uniques') {
    window.plugin.uniques.storeLocal('uniques');
    // All data is replaced if other client update the data during this client
    // offline,
    // fire 'pluginUniquesRefreshAll' to notify a full update
    if (fullUpdated) {
      // a full update - update the selected portal sidebar
      if (window.selectedPortal) {
        window.plugin.uniques.updateCheckedAndHighlight(window.selectedPortal);
      }
      // and also update all highlights, if needed
      if (window.plugin.uniques.isHighlightActive) {
        window.resetHighlightedPortals();
      }

      window.runHooks('pluginUniquesRefreshAll');
      return;
    }

    if (!e) return;
    if (e.isLocal) {
      // Update pushed successfully, remove it from updatingQueue
      delete window.plugin.uniques.updatingQueue[e.property];
    } else {
      // Remote update
      delete window.plugin.uniques.updateQueue[e.property];
      window.plugin.uniques.storeLocal('updateQueue');
      window.plugin.uniques.updateCheckedAndHighlight(e.property);
      window.runHooks('pluginUniquesUpdateUniques', { guid: e.property });
    }
  }
};

// syncing of the field is initialed, upload all queued update
window.plugin.uniques.syncInitialed = function (pluginName, fieldName) {
  if (fieldName === 'uniques') {
    window.plugin.uniques.enableSync = true;
    if (Object.keys(window.plugin.uniques.updateQueue).length > 0) {
      window.plugin.uniques.syncQueue();
    }
  }
};

window.plugin.uniques.storeLocal = function (name) {
  var key = window.plugin.uniques.FIELDS[name];
  if (key === undefined) return;

  var value = window.plugin.uniques[name];

  if (typeof value !== 'undefined' && value !== null) {
    localStorage[key] = JSON.stringify(window.plugin.uniques[name]);
  } else {
    localStorage.removeItem(key);
  }
};

window.plugin.uniques.loadLocal = function (name) {
  var key = window.plugin.uniques.FIELDS[name];
  if (key === undefined) return;

  if (localStorage[key] !== undefined) {
    window.plugin.uniques[name] = JSON.parse(localStorage[key]);
  }
};

/** ************************************************************************************************************************************************************/
/** HIGHLIGHTER ************************************************************************************************************************************************/
/** ************************************************************************************************************************************************************/
window.plugin.uniques.highlighter = {
  highlight: function (data) {
    var guid = data.portal.options.ent[0];
    var uniqueInfo = window.plugin.uniques.uniques[guid];

    var style = {};

    if (uniqueInfo) {
      if (uniqueInfo.captured) {
        // captured (and, implied, visited too) - no highlights
      } else if (uniqueInfo.visited) {
        style.fillColor = 'yellow';
        style.fillOpacity = 0.6;
      } else {
        // we have an 'uniqueInfo' entry for the portal, but it's not set visited or captured?
        // could be used to flag a portal you don't plan to visit, so use a less opaque red
        style.fillColor = 'red';
        style.fillOpacity = 0.5;
      }
    } else {
      // no visit data at all
      style.fillColor = 'red';
      style.fillOpacity = 0.7;
    }

    data.portal.setStyle(style);
  },

  setSelected: function (active) {
    window.plugin.uniques.isHighlightActive = active;
  },
};

window.plugin.uniques.setupCSS = function () {
  $('<style>').prop('type', 'text/css').html('\
#uniques-container {\
  display: block;\
  text-align: center;\
  margin: 6px 3px 1px 3px;\
  padding: 0 4px;\
}\
#uniques-container label {\
  margin: 0 0.5em;\
}\
#uniques-container input {\
  vertical-align: middle;\
}\
\
.portal-list-uniques input[type=\'checkbox\'] {\
  padding: 0;\
  height: auto;\
  margin-top: -5px;\
  margin-bottom: -5px;\
}\
').appendTo('head');
};

window.plugin.uniques.setupContent = function () {
  window.plugin.uniques.contentHTML =
    '<div id="uniques-container">' +
    '<label><input type="checkbox" id="visited" onclick="window.plugin.uniques.updateVisited($(this).prop(\'checked\'))"> Visited</label>' +
    '<label><input type="checkbox" id="captured" onclick="window.plugin.uniques.updateCaptured($(this).prop(\'checked\'))"> Captured</label>' +
    '</div>';
  window.plugin.uniques.disabledMessage =
    '<div id="uniques-container" class="help" title="Your browser does not support localStorage">Plugin Uniques disabled</div>';
};

window.plugin.uniques.setupPortalsList = function () {
  window.addHook('pluginUniquesUpdateUniques', function (data) {
    var info = window.plugin.uniques.uniques[data.guid];
    if (!info) info = { visited: false, captured: false };

    $(`[data-list-uniques="${data.guid}"].visited`).prop('checked', !!info.visited);
    $(`[data-list-uniques="${data.guid}"].captured`).prop('checked', !!info.captured);
  });

  window.addHook('pluginUniquesRefreshAll', function () {
    $('[data-list-uniques]').each(function (i, element) {
      var guid = element.getAttribute('data-list-uniques');

      var info = window.plugin.uniques.uniques[guid];
      if (!info) info = { visited: false, captured: false };

      var e = $(element);
      if (e.hasClass('visited')) e.prop('checked', !!info.visited);
      if (e.hasClass('captured')) e.prop('checked', !!info.captured);
    });
  });

  function uniqueValue(guid) {
    var info = window.plugin.uniques.uniques[guid];
    if (!info) return 0;

    if (info.visited && info.captured) return 2;
    if (info.visited) return 1;
  }

  window.plugin.portalslist.fields.push({
    title: 'Visit',
    value: function (portal) {
      // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
      return portal.options.guid;
    },
    sort: function (guidA, guidB) {
      return uniqueValue(guidA) - uniqueValue(guidB);
    },
    format: function (cell, portal, guid) {
      var info = window.plugin.uniques.uniques[guid];
      if (!info) info = { visited: false, captured: false };

      $(cell).addClass('portal-list-uniques');

      // for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
      $('<input>')
        .prop({
          type: 'checkbox',
          className: 'visited',
          title: 'Portal visited?',
          checked: !!info.visited,
        })
        .attr('data-list-uniques', guid)
        .appendTo(cell)[0]
        .addEventListener(
          'change',
          function (ev) {
            window.plugin.uniques.updateVisited(this.checked, guid);
            ev.preventDefault();
            return false;
          },
          false
        );
      $('<input>')
        .prop({
          type: 'checkbox',
          className: 'captured',
          title: 'Portal captured?',
          checked: !!info.captured,
        })
        .attr('data-list-uniques', guid)
        .appendTo(cell)[0]
        .addEventListener(
          'change',
          function (ev) {
            window.plugin.uniques.updateCaptured(this.checked, guid);
            ev.preventDefault();
            return false;
          },
          false
        );
    },
  });
};

window.plugin.uniques.onMissionChanged = function (data) {
  if (!data.local) return;

  var mission = window.plugin.missions && window.plugin.missions.getMissionCache(data.mid, false);
  if (!mission) return;

  window.plugin.uniques.checkMissionWaypoints(mission);
};

window.plugin.uniques.onMissionLoaded = function (data) {
  // the mission has been loaded, but the dialog isn't visible yet.
  // we'll wait a moment so the mission dialog is opened behind the confirmation prompt
  setTimeout(function () {
    window.plugin.uniques.checkMissionWaypoints(data.mission);
  }, 0);
};

window.plugin.uniques.checkMissionWaypoints = function (mission) {
  if (!(window.plugin.missions && window.plugin.missions.checkedMissions[mission.guid])) return;

  if (!mission.waypoints) return;

  function isValidWaypoint(wp) {
    // might be hidden or field trip card
    if (!(wp && wp.portal && wp.portal.guid)) return false;

    // only use hack, deploy, link, field and upgrade; ignore photo and passphrase
    if (wp.objectiveNum <= 0 || wp.objectiveNum > 5) return false;

    return true;
  }
  function isVisited(wp) {
    var guid = wp.portal.guid,
      uniqueInfo = window.plugin.uniques.uniques[guid],
      visited = (uniqueInfo && uniqueInfo.visited) || false;

    return visited;
  }

  // check if all waypoints are already visited
  if (
    mission.waypoints.every(function (wp) {
      if (!isValidWaypoint(wp)) return true;
      return isVisited(wp);
    })
  )
    return;

  if (!confirm(`The mission ${mission.title} contains waypoints not yet marked as visited.\n\nDo you want to set them to 'visited' now?`)) return;

  mission.waypoints.forEach(function (wp) {
    if (!isValidWaypoint(wp)) return;
    if (isVisited(wp)) return;

    window.plugin.uniques.setPortalVisited(wp.portal.guid);
  });
};

var setup = function () {
  // HOOKS:
  // - pluginUniquesUpdateUniques
  // - pluginUniquesRefreshAll

  window.plugin.uniques.setupCSS();
  window.plugin.uniques.setupContent();
  window.plugin.uniques.loadLocal('uniques');
  window.addPortalHighlighter('Uniques', window.plugin.uniques.highlighter);
  window.addHook('portalDetailsUpdated', window.plugin.uniques.onPortalDetailsUpdated);
  window.addHook('publicChatDataAvailable', window.plugin.uniques.onPublicChatDataAvailable);
  window.plugin.uniques.registerFieldForSyncing();

  // to mark mission portals as visited
  window.addHook('plugin-missions-mission-changed', window.plugin.uniques.onMissionChanged);
  window.addHook('plugin-missions-loaded-mission', window.plugin.uniques.onMissionLoaded);

  if (window.plugin.portalslist) {
    window.plugin.uniques.setupPortalsList();
  }
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

