// ==UserScript==
// @author         Costaspap
// @name           IITC plugin: Localized scoreboard
// @version        0.3.3.20240208.114659
// @category       Info
// @description    Display a scoreboard about all visible portals with statistics about both teams,like average portal level,link & field counts etc.
// @id             scoreboard
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR659/plugins/scoreboard.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR659/plugins/scoreboard.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/scoreboard.png
// @icon64         https://iitc.app/extras/plugin-icons/scoreboard-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-02-08-114659';
plugin_info.pluginId = 'scoreboard';
//END PLUGIN AUTHORS NOTE

/* global IITC -- eslint */
/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// A plug in by Costaspap and harisbitsakou

// use own namespace for plugin
var scoreboard = {};
window.plugin.scoreboard = scoreboard;

function getPortalsInfo (portals,bounds) {
  function init () {
    return {
      placeHolders: 0,
      total: 0,
      level8: 0,
      levels: 0,
      maxLevel: 0,
      health: 0
    };
  }
  var score = window.TEAM_NAMES.map(() => init());
  portals = portals.filter(function (portal) { // only consider portals in view
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
    if (info.level === 8) { team.level8++; }
    team.maxLevel = Math.max(team.maxLevel,info.level);
    team.total++;
  });

  if (portals.length) {
    [TEAM_RES,TEAM_ENL].forEach(function (teamN) {
      var team = score[teamN];
      team.health = team.total ? (team.health/team.total).toFixed(1)+'%' : '-';
      team.levels = team.total ? (team.levels/team.total).toFixed(1) : '-';
      team.level8 = team.level8 || '-';
      team.maxLevel = team.maxLevel || '-';
      team.total = team.placeHolders ? team.total + ' + ' + team.placeHolders : team.total;
    });
    return {
      enl: score[TEAM_ENL],
      res: score[TEAM_RES]
    };
  }
}

function getEntitiesCount (entities,bounds) {
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
  };
}

function makeTable (portals,linksCount,fieldsCount) {

  var html = '';
  html += '<table>'
  + '<colgroup><col><col class="enl"><col class="res"></colgroup>'
  + '<tr>'
  + '<th>Metrics</th>'
  + '<th class="enl">Enlightened</th>'
  + '<th class="res">Resistance</th>'
  + '</tr>\n';

  html += '<tr><td>Portals</td>'
    +'<td>'+portals.enl.total+'</td>'
    +'<td>'+portals.res.total+'</td></tr>'
  +'<tr><td>avg Level</td>'
    +'<td>'+portals.enl.levels+'</td>'
    +'<td>'+portals.res.levels+'</td></tr>'
  + '<tr><td>avg Health</td>'
    +'<td>'+portals.enl.health+'</td>'
    +'<td>'+portals.res.health+'</td></tr>'
  +'<tr><td>Level 8</td>'
    +'<td>'+portals.enl.level8+'</td>'
    +'<td>'+portals.res.level8+'</td></tr>'
  +'<tr><td>Max Level</td>'
    +'<td>'+portals.enl.maxLevel+'</td>'
    +'<td>'+portals.res.maxLevel+'</td></tr>'
  +'<tr><td>Links</td>'
    +'<td>'+linksCount.enl+'</td>'
    +'<td>'+linksCount.res+'</td></tr>'
  +'<tr><td>Fields</td>'
    +'<td>'+fieldsCount.enl+'</td>'
    +'<td>'+fieldsCount.res+'</td></tr>';

  html += '</table>';
  return html;
}

function displayScoreboard () {
  function toArr (entities) {
    return Object.keys(entities).map(function (guid) {
      return entities[guid];
    });
  }
  var bounds = map.getBounds();
  var portals = getPortalsInfo(toArr(window.portals),bounds);
  var html = '';
  if (portals) {
    var linksCount = getEntitiesCount(toArr(window.links),bounds);
    var fieldsCount = getEntitiesCount(toArr(window.fields),bounds);
    html += makeTable(portals,linksCount,fieldsCount);
  } else {
    html += '<p>Nothing to show!<p>';
  }

  if (map.getZoom() < 15) {
    html += '<p class="disclaimer"><b>Zoom in for a more accurate scoreboard!</b></p>';
  }

  html = '<div id="scoreboard">' + html + '</div>';
  if (window.useAppPanes()) {
    $(html).addClass('mobile').appendTo(document.body);
  } else {
    dialog({
      html: html,
      dialogClass: 'ui-dialog-scoreboard',
      title: 'Scoreboard',
      id: 'Scoreboard'
    });
  }
}

function setup () {
  if (window.useAppPanes()) {
    app.addPane('plugin-Scoreboard', 'Scoreboard', 'ic_action_view_as_list_compact');
    addHook('paneChanged', function (pane) {
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

  $('<style>').html('\
    #scoreboard table { margin-top: 5px; border-collapse: collapse; width: 100%; background-color: #1b415e }\
    #scoreboard tr { border-bottom: 1px solid #0b314e; color: white; }\
    #scoreboard td, #scoreboard th { padding: 3px 10px; text-align: left; }\
    #scoreboard col.enl { background-color: #017f01; }\
    #scoreboard col.res { background-color: #005684; }\
    #scoreboard .disclaimer { margin-top: 10px; color: yellow; }\
    #scoreboard.mobile { position: absolute; top: 0; width: 100%; }\
    ').appendTo('head');
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

