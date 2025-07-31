// ==UserScript==
// @author         Costaspap
// @name           IITC plugin: Localized scoreboard
// @version        0.4.1.20250731.130558
// @category       Info
// @description    Display a scoreboard about all visible portals with statistics about both teams,like average portal level,link & field counts etc.
// @id             scoreboard
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/scoreboard.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/scoreboard.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/scoreboard.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-07-31-130558';
plugin_info.pluginId = 'scoreboard';
//END PLUGIN AUTHORS NOTE

/* global IITC -- eslint */
/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.4.1',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.4.0',
    changes: ['Includes information on Machina', 'Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.4',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// A plug in by Costaspap and harisbitsakou

// use own namespace for plugin
var scoreboard = {};
window.plugin.scoreboard = scoreboard;

function getPortalsInfo(portals, bounds) {
  function init() {
    return {
      placeHolders: 0,
      total: 0,
      level8: 0,
      levels: 0,
      maxLevel: 0,
      health: 0,
    };
  }
  var score = window.TEAM_NAMES.map(() => init());
  portals = portals.filter(function (portal) {
    // only consider portals in view
    return bounds.contains(portal.getLatLng());
  });
  portals.forEach(function (portal) {
    var info = portal.options;
    var teamN = info.team;
    var team = score[teamN];
    if (!info.data.title) {
      team.placeHolders++;
      return;
    }
    team.health += info.data.health;
    team.levels += info.level;
    if (info.level === 8) {
      team.level8++;
    }
    team.maxLevel = Math.max(team.maxLevel, info.level);
    team.total++;
  });

  if (portals.length) {
    [window.TEAM_RES, window.TEAM_ENL, window.TEAM_MAC].forEach(function (teamN) {
      var team = score[teamN];
      team.health = team.total ? (team.health / team.total).toFixed(1) + '%' : '-';
      team.levels = team.total ? (team.levels / team.total).toFixed(1) : '-';
      team.level8 = team.level8 || '-';
      team.maxLevel = team.maxLevel || '-';
      team.total = team.placeHolders ? team.total + ' + ' + team.placeHolders : team.total;
    });
    return {
      enl: score[window.TEAM_ENL],
      res: score[window.TEAM_RES],
      mac: score[window.TEAM_MAC],
    };
  }
}

function getEntitiesCount(entities, bounds) {
  // only consider entities that start/end on-screen
  // todo: consider entities that have intersections with map bounds
  var total = entities.filter(function (ent) {
    return ent.getLatLngs().some(function (point) {
      return bounds.contains(point);
    });
  });

  var counts = total.reduce((n, l) => {
    n[l.options.team] = (n[l.options.team] || 0) + 1;
    return n;
  }, []);
  return {
    enl: counts[window.TEAM_ENL] || 0,
    res: counts[window.TEAM_RES] || 0,
    mac: counts[window.TEAM_MAC] || 0,
  };
}

function makeTable(portals, linksCount, fieldsCount) {
  var html = '';
  html +=
    '<table>' +
    '<colgroup><col><col class="enl"><col class="res"><col class="mac"></colgroup>' +
    '<tr>' +
    '<th>Metrics</th>' +
    '<th class="enl">Enlightened</th>' +
    '<th class="res">Resistance</th>' +
    '<th class="mac">__MACHINA__</th>' +
    '</tr>\n';

  const lines = [
    ['Portals', portals.enl.total, portals.res.total, portals.mac.total],
    ['avg Level', portals.enl.levels, portals.res.levels, portals.mac.levels],
    ['avg Health', portals.enl.health, portals.res.health, portals.mac.health],
    ['Level 8', portals.enl.level8, portals.res.level8, portals.mac.level8],
    ['Max Level', portals.enl.maxLevel, portals.res.maxLevel, portals.mac.maxLevel],
    ['Links', linksCount.enl, linksCount.res, linksCount.mac],
    ['Fields', fieldsCount.enl, fieldsCount.res, fieldsCount.mac],
  ];

  html += lines.map((line) => {
    const cells = line.map((cell) => `<td>${cell}</td>`);
    return `<tr>${cells}</tr>`;
  });

  html += '</table>';
  return html;
}

function displayScoreboard() {
  function toArr(entities) {
    return Object.keys(entities).map(function (guid) {
      return entities[guid];
    });
  }
  var bounds = window.map.getBounds();
  var portals = getPortalsInfo(toArr(window.portals), bounds);
  var html = '';
  if (portals) {
    var linksCount = getEntitiesCount(toArr(window.links), bounds);
    var fieldsCount = getEntitiesCount(toArr(window.fields), bounds);
    html += makeTable(portals, linksCount, fieldsCount);
  } else {
    html += '<p>Nothing to show!<p>';
  }

  if (window.map.getZoom() < 15) {
    html += '<p class="disclaimer"><b>Zoom in for a more accurate scoreboard!</b></p>';
  }

  html = '<div id="scoreboard">' + html + '</div>';
  if (window.useAppPanes()) {
    $(html).addClass('mobile').appendTo(document.body);
  } else {
    window.dialog({
      html: html,
      width: 'auto',
      dialogClass: 'ui-dialog-scoreboard',
      title: 'Scoreboard',
      id: 'Scoreboard',
    });
  }
}

function setup() {
  if (window.useAppPanes()) {
    window.app.addPane('plugin-Scoreboard', 'Scoreboard', 'ic_action_view_as_list_compact');
    window.addHook('paneChanged', function (pane) {
      if (pane === 'plugin-Scoreboard') {
        displayScoreboard();
      } else {
        $('#scoreboard').remove();
      }
    });
  } else {
    IITC.toolbox.addButton({
      label: 'Scoreboard',
      title: 'Display a dynamic scoreboard in the current view',
      action: displayScoreboard,
    });
  }

  $('<style>')
    .html(
      '\
    #scoreboard table { margin-top: 5px; border-collapse: collapse; width: 100%; background-color: #1b415e }\
    #scoreboard tr { border-bottom: 1px solid #0b314e; color: white; }\
    #scoreboard td, #scoreboard th { padding: 3px 10px; text-align: left; }\
    #scoreboard col.enl { background-color: #017f01; }\
    #scoreboard col.res { background-color: #005684; }\
    #scoreboard col.mac { background-color: #7f3333; }\
    #scoreboard .disclaimer { margin-top: 10px; color: yellow; }\
    #scoreboard.mobile { position: absolute; top: 0; width: 100%; }\
    '
    )
    .appendTo('head');
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

