// ==UserScript==
// @author         breunigs
// @name           IITC plugin: Player level guess
// @category       Info
// @version        0.5.11.20250610.093952
// @description    Try to determine player levels from the data available in the current view.
// @id             player-level-guess
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/player-level-guess.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/player-level-guess.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/player-level-guess.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-06-10-093952';
plugin_info.pluginId = 'player-level-guess';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.5.11',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.5.10',
    changes: ['Exclude Machina', 'Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.5.9',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.5.8',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.guessPlayerLevels = function () {};
window.plugin.guessPlayerLevels.BURSTER_RANGES = [0, 42, 48, 58, 72, 90, 112, 138, 168];

// we prepend a hash sign (#) in front of the player name in storage in order to prevent accessing a pre-defined property
// (like constructor, __defineGetter__, etc.

window.plugin.guessPlayerLevels.setupCallback = function () {
  IITC.toolbox.addButton({
    label: 'Guess player levels',
    title: 'Show player level guesses based on resonator placement in displayed portals',
    action: window.plugin.guessPlayerLevels.guess,
  });
  window.addHook('portalDetailLoaded', window.plugin.guessPlayerLevels.extractPortalData);
  window.addHook('publicChatDataAvailable', window.plugin.guessPlayerLevels.extractChatData);
};

// This function is intended to be called by other plugins
window.plugin.guessPlayerLevels.fetchLevelByPlayer = function (nick) {
  var cache = window.plugin.guessPlayerLevels._nameToLevelCache;

  if (cache['#' + nick] === undefined) cache = window.plugin.guessPlayerLevels._loadLevels();

  var details = cache['#' + nick];
  if (details === undefined) return 1;
  if (typeof details === 'number') return details;
  return details.guessed;
};

// This function is intended to be called by other plugins
window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer = function (nick) {
  var cache = window.plugin.guessPlayerLevels._nameToLevelCache;

  if (cache['#' + nick] === undefined) cache = window.plugin.guessPlayerLevels._loadLevels();

  var details = cache['#' + nick];
  if (details === undefined) return { min: 1, guessed: 1 };
  if (typeof details === 'number') return { min: 1, guessed: details };
  return details;
};

window.plugin.guessPlayerLevels._nameToLevelCache = {};
window.plugin.guessPlayerLevels._localStorageLastUpdate = 0;

window.plugin.guessPlayerLevels._loadLevels = function () {
  // no use in reading localStorage repeatedly
  if (window.plugin.guessPlayerLevels._localStorageLastUpdate < Date.now() - 10 * 1000) {
    try {
      var cache = JSON.parse(localStorage['plugin-guess-player-levels']);
      window.plugin.guessPlayerLevels._nameToLevelCache = cache;
      window.plugin.guessPlayerLevels._localStorageLastUpdate = Date.now();
    } catch {
      /* empty */
    }
  }

  return window.plugin.guessPlayerLevels._nameToLevelCache;
};

window.plugin.guessPlayerLevels.setLevelTitle = function (dom) {
  // expects dom node with nick in its child text node

  var el = $(dom);
  var nick = el.text();
  if (nick[0] === '@') nick = nick.substring(1);

  var details = window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer(nick);

  function getLevel(lvl) {
    return `<span style="display:inline-block;padding:4px;color:white;background-color:${window.COLORS_LVL[lvl]}">${lvl}</span>`;
  }

  var text = `<span style="color: ${el.css('color')}">${nick}</span>\n`;
  text += 'Min player level: ' + getLevel(details.min);
  if (details.min !== details.guessed) text += '\nGuessed player level: ' + getLevel(details.guessed);

  window.setupTooltips(el);

  /*
  This code looks hacky but since we are a little late within the mouseenter so
  we need to improvise a little. The open method doesn't open the tooltip directly.
  It starts the whole opening procedure (including the timeout etc) and is normally
  started by the mousemove event of the enhanced element.
  */
  el.addClass('help') // Add the "Help Mouse Cursor"
    .attr('title', text) // Set the title for the jquery tooltip
    .tooltip('open') // Start the "open" method
    .attr('title', null); // And remove the title to prevent the browsers tooltip
};

window.plugin.guessPlayerLevels.setupChatNickHelper = function () {
  $(document).on('mouseenter', '.nickname, .pl_nudge_player', function () {
    window.plugin.guessPlayerLevels.setLevelTitle(this);
  });
};

window.plugin.guessPlayerLevels.extractPortalData = function (data) {
  if (!data.success) return;

  var r = data.details.resonators;

  /* Due to the Jarvis Virus/ADA Refactor it's possible for a player to own resonators on a portal at a higher level
     than the player themselves. It is not possible to detect for sure when this has happened, but in many cases it will
     result in an impossible deployment arrangement (more than 1 L8/7 res, more than 2 L6/5 res, etc). If we detect this
     case, we ignore all resonators owned by that player on the portal
     Hint: This can only happen to the owner of the portal, so resonators by other players can be used to determine
     their minimal level */

  var owner = (data.details.owner && data.details.owner) || '';
  var ownerModCount = 0;
  data.details.mods.forEach(function (mod) {
    if (mod && mod.owner === owner) ownerModCount++;
  });

  var players = {};

  $.each(r, function (ind, reso) {
    if (!reso) return true;

    if (!players[reso.owner]) players[reso.owner] = [];

    if (players[reso.owner][reso.level] === undefined) players[reso.owner][reso.level] = 1;
    else players[reso.owner][reso.level]++;
  });

  for (const nickname in players) {
    var ignore = false;
    var minLevel = 0;
    let certain;

    if (nickname === owner) {
      if (ownerModCount > 2)
        // more than 2 mods by capturing player --> portal was flipped, ignore their resonators
        continue;
      certain = false;
    } else {
      // not deployed by owner - player must be at least that level
      certain = true;
    }

    players[nickname].forEach(function (count, level) {
      if (window.MAX_RESO_PER_PLAYER[level] < count) ignore = true;

      if (count > 0) minLevel = level;
    });

    if (ignore) continue;

    window.plugin.guessPlayerLevels.savePlayerLevel(nickname, minLevel, certain);
  }
};

window.plugin.guessPlayerLevels.extractChatData = function (data) {
  var attackData = {};
  function addAttackMessage(nick, timestamp, portal) {
    var details = window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer(nick);
    if (details.guessed === 8 || details.min === 8) return; // we wouldn't get better results, so skip the calcula
    if (!attackData[nick]) attackData[nick] = {};
    if (!attackData[nick][timestamp]) attackData[nick][timestamp] = [];
    attackData[nick][timestamp].push(portal);
  }

  data.result.forEach(function (msg) {
    var plext = msg[2].plext;

    // search for "x deployed an Ly Resonator on z"
    if (
      plext.plextType === 'SYSTEM_BROADCAST' &&
      plext.markup.length === 5 &&
      plext.markup[0][0] === 'PLAYER' &&
      plext.markup[1][0] === 'TEXT' &&
      plext.markup[1][1].plain === ' deployed an ' &&
      plext.markup[2][0] === 'TEXT' &&
      plext.markup[3][0] === 'TEXT' &&
      plext.markup[3][1].plain === ' Resonator on '
    ) {
      const nick = plext.markup[0][1].plain;
      var lvl = parseInt(plext.markup[2][1].plain.slice(1), 10);
      window.plugin.guessPlayerLevels.savePlayerLevel(nick, lvl, true);
    }

    // search for "x destroyed an Ly Resonator on z"
    if (
      plext.plextType === 'SYSTEM_BROADCAST' &&
      plext.markup.length === 5 &&
      plext.markup[0][0] === 'PLAYER' &&
      plext.markup[1][0] === 'TEXT' &&
      plext.markup[1][1].plain === ' destroyed an ' &&
      plext.markup[2][0] === 'TEXT' &&
      plext.markup[3][0] === 'TEXT' &&
      plext.markup[3][1].plain === ' Resonator on '
    ) {
      const nick = plext.markup[0][1].plain;
      const portal = plext.markup[4][1];
      addAttackMessage(nick, msg[1], portal);
    }

    // search for "Your Lx Resonator on y was destroyed by z"
    if (
      plext.plextType === 'SYSTEM_NARROWCAST' &&
      plext.markup.length === 6 &&
      plext.markup[0][0] === 'TEXT' &&
      plext.markup[0][1].plain === 'Your ' &&
      plext.markup[1][0] === 'TEXT' &&
      plext.markup[2][0] === 'TEXT' &&
      plext.markup[2][1].plain === ' Resonator on ' &&
      plext.markup[3][0] === 'PORTAL' &&
      plext.markup[4][0] === 'TEXT' &&
      plext.markup[4][1].plain === ' was destroyed by ' &&
      plext.markup[5][0] === 'PLAYER'
    ) {
      const nick = plext.markup[5][1].plain;
      const portal = plext.markup[3][1];
      addAttackMessage(nick, msg[1], portal);
    }

    // search for "Your Portal x neutralized by y"
    // search for "Your Portal x is under attack by y"
    if (
      plext.plextType === 'SYSTEM_NARROWCAST' &&
      plext.markup.length === 4 &&
      plext.markup[0][0] === 'TEXT' &&
      plext.markup[0][1].plain === 'Your Portal ' &&
      plext.markup[1][0] === 'PORTAL' &&
      plext.markup[2][0] === 'TEXT' &&
      (plext.markup[2][1].plain === ' neutralized by ' || plext.markup[2][1].plain === ' is under attack by ') &&
      plext.markup[3][0] === 'PLAYER'
    ) {
      const nick = plext.markup[3][1].plain;
      const portal = plext.markup[1][1];
      addAttackMessage(nick, msg[1], portal);
    }
  });

  for (const nick in attackData) {
    for (const timestamp in attackData[nick]) {
      // remove duplicates
      var latlngs = [];
      var portals = {};
      attackData[nick][timestamp].forEach(function (portal) {
        // no GUID in the data any more - but we need some unique string. use the latE6,lngE6
        var id = portal.latE6 + ',' + portal.lngE6;
        if (id in portals) return;
        portals[id] = 1;
        latlngs.push({ x: portal.lngE6 / 1e6, y: portal.latE6 / 1e6 });
      });
      if (latlngs.length < 2)
        // we need at least 2 portals to calculate burster range
        continue;

      window.plugin.guessPlayerLevels.handleAttackData(nick, latlngs);
    }
  }
};

window.plugin.guessPlayerLevels.handleAttackData = function (nick, latlngs) {
  /*
    This is basically the smallest enclosing circle problem. The algorithm is for points on a plane, but for our ranges
    (X8 has 168m) this should work.
    http://www.cs.uu.nl/docs/vakken/ga/slides4b.pdf
    http://nayuki.eigenstate.org/page/smallest-enclosing-circle
    http://everything2.com/title/Circumcenter
  */
  var circle = {
    x: latlngs[0].x,
    y: latlngs[0].y,
    radius: 0,
  };
  for (let i = 1; i < latlngs.length; i++) {
    const latlng = latlngs[i];
    if (!window.plugin.guessPlayerLevels.isPointInCircle(latlng, circle))
      circle = window.plugin.guessPlayerLevels.calculateCircleWithAnchor(latlngs.slice(0, i + 1), latlng);
  }

  // circle.range is useless, because it is calculated in degrees (simplified algorithm!)
  var latlng = L.latLng(circle.y, circle.x);
  var range = 0;
  for (let i = 0; i < latlngs.length; i++) {
    var d = latlng.distanceTo([latlngs[i].y, latlngs[i].x]);
    if (d > range) range = d;
  }

  // In earlier versions, the algorithm failed. Should be fixed now, but just to be sure, we ignore escalating values...
  if (circle.x === 0 || circle.y === 0 || range > 1000) {
    console.warn('ignoring attack data: ', nick, latlngs, circle, range);
    return;
  }

  var burster = window.plugin.guessPlayerLevels.BURSTER_RANGES;

  // res can be up to 40m from a portal, so attack notifications for portals, say, 100m apart could
  // actually be a weapon range as low as 20m. however, typical deployments are a bit less than 40m, and resonators
  // can only be deployed on the 8 compass points. a value of 40m x 2 would never be wrong
  var reso_range_correction = 40 * 2;
  // however, the full correction often under-estimates.

  for (let i = burster.length - 1; i >= 1; i--) {
    if (range >= burster[i] + reso_range_correction) {
      window.plugin.guessPlayerLevels.savePlayerLevel(nick, Math.min(i + 1, window.MAX_PORTAL_LEVEL), true);
      break;
    }
  }

  // L.circle(latlng, range, {
  //  weight:1,
  //  title: nick + ", " + range + "m"
  // }).addTo(map);
};

window.plugin.guessPlayerLevels.calculateCircleWithAnchor = function (latlngs, anchor) {
  var circle = {
    x: anchor.x,
    y: anchor.y,
    radius: 0,
  };
  for (var i = 0; i < latlngs.length; i++) {
    var p = latlngs[i];
    if (!window.plugin.guessPlayerLevels.isPointInCircle(p, circle)) {
      if (circle.radius === 0)
        // for the first two points
        circle = window.plugin.guessPlayerLevels.calculateCircleFromBisector(p, anchor);
      else circle = window.plugin.guessPlayerLevels.calculateCircleWithAnchors(latlngs.slice(0, i + 1), anchor, p);
    }
  }
  return circle;
};

window.plugin.guessPlayerLevels.calculateCircleWithAnchors = function (latlngs, a, b) {
  var circle = window.plugin.guessPlayerLevels.calculateCircleFromBisector(a, b);
  for (var i = 0; i < latlngs.length; i++) {
    var c = latlngs[i];
    if (!window.plugin.guessPlayerLevels.isPointInCircle(c, circle)) {
      var dA = a.x * a.x + a.y * a.y;
      var dB = b.x * b.x + b.y * b.y;
      var dC = c.x * c.x + c.y * c.y;

      circle.x = (dA * (c.y - b.y) + dB * (a.y - c.y) + dC * (b.y - a.y)) / (2 * (a.x * (c.y - b.y) + b.x * (a.y - c.y) + c.x * (b.y - a.y)));
      circle.y = -(dA * (c.x - b.x) + dB * (a.x - c.x) + dC * (b.x - a.x)) / (2 * (a.x * (c.y - b.y) + b.x * (a.y - c.y) + c.x * (b.y - a.y)));

      circle.radius = Math.max(
        window.plugin.guessPlayerLevels.getDistance(a, circle),
        window.plugin.guessPlayerLevels.getDistance(b, circle),
        window.plugin.guessPlayerLevels.getDistance(c, circle)
      );
    }
  }
  return circle;
};

window.plugin.guessPlayerLevels.calculateCircleFromBisector = function (p, q) {
  return {
    x: (p.x + q.x) / 2,
    y: (p.y + q.y) / 2,
    radius: window.plugin.guessPlayerLevels.getDistance(p, q) / 2,
  };
};

window.plugin.guessPlayerLevels.isPointInCircle = function (point, circle) {
  var d = window.plugin.guessPlayerLevels.getDistance(point, circle);
  return d - 1e-10 <= circle.radius; // subtract a small epsilon to return true even if point is on the edge
};

window.plugin.guessPlayerLevels.getDistance = function (a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

window.plugin.guessPlayerLevels.savePlayerLevel = function (nick, level, certain) {
  var cache = window.plugin.guessPlayerLevels._loadLevels();

  var details = cache['#' + nick];
  if (details === undefined) details = { min: 1, guessed: 1 };
  if (typeof details === 'number') details = { min: 1, guessed: details };

  if (certain) {
    if (details.min >= level) return;

    details.min = level;
    if (details.guessed < details.min) details.guessed = details.min;
  } else {
    if (details.guessed >= level) return;

    details.guessed = level;
  }

  window.plugin.guessPlayerLevels._nameToLevelCache['#' + nick] = details;

  // to minimize accesses to localStorage, writing is delayed a bit

  if (window.plugin.guessPlayerLevels._writeTimeout) clearTimeout(window.plugin.guessPlayerLevels._writeTimeout);

  window.plugin.guessPlayerLevels._writeTimeout = setTimeout(function () {
    localStorage['plugin-guess-player-levels'] = JSON.stringify(window.plugin.guessPlayerLevels._nameToLevelCache);
  }, 500);
};

window.plugin.guessPlayerLevels.guess = function () {
  var playersRes = {};
  var playersEnl = {};
  $.each(window.portals, function (guid) {
    var details = window.portalDetail.get(guid);
    if (details) {
      var r = details.resonators;
      $.each(r, function (ind, reso) {
        if (!reso) return true;
        var nick = reso.owner;
        if (window.isSystemPlayer(nick)) return true;

        var lvl = window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer(nick).min;
        if (!lvl) return true;

        if (window.getTeam(details) === window.TEAM_ENL) playersEnl[nick] = lvl;
        else playersRes[nick] = lvl;
      });

      if (details.captured) {
        var nick = details.owner;
        if (window.isSystemPlayer(nick)) return true;
        var lvl = window.plugin.guessPlayerLevels.fetchLevelDetailsByPlayer(nick).min;
        if (!lvl) return true;

        if (window.getTeam(details) === window.TEAM_ENL) playersEnl[nick] = lvl;
        else playersRes[nick] = lvl;
      }
    }
  });

  var s = 'Players have at least the following level:\n\n';
  s += 'Resistance:\t&nbsp;&nbsp;&nbsp;\tEnlightened:\t\n';

  var namesR = window.plugin.guessPlayerLevels.sort(playersRes);
  var namesE = window.plugin.guessPlayerLevels.sort(playersEnl);
  var totallvlR = 0;
  var totallvlE = 0;
  var max = Math.max(namesR.length, namesE.length);

  function makeRow(nick, lvl, team) {
    if (!nick) return '\t';

    var color = window.COLORS[team];
    if (nick === window.PLAYER.nickname) color = '#fd6'; // highlight the player's name in a unique colour (similar to @player mentions from others in the chat text itself)

    return `<mark class="nickname" style="color:${color}">${nick}</mark>\t${lvl}`;
  }

  var nick, lvl, lineE, lineR;
  for (var i = 0; i < max; i++) {
    nick = namesR[i];
    lvl = playersRes[nick];
    lineR = makeRow(nick, lvl, window.TEAM_RES);
    if (!isNaN(parseInt(lvl))) totallvlR += parseInt(lvl);

    nick = namesE[i];
    lvl = playersEnl[nick];
    lineE = makeRow(nick, lvl, window.TEAM_ENL);
    if (!isNaN(parseInt(lvl))) totallvlE += parseInt(lvl);

    s += '\n' + lineR + '\t' + lineE + '\n';
  }
  s += '\nTotal level :\t' + totallvlR + '\tTotal level :\t' + totallvlE;
  s += '\nTotal player:\t' + namesR.length + '\tTotal player:\t' + namesE.length;
  var averageR = 0,
    averageE = 0;
  if (namesR.length > 0) averageR = totallvlR / namesR.length;
  if (namesE.length > 0) averageE = totallvlE / namesE.length;
  s += '\nAverage level:\t' + averageR.toFixed(2) + '\tAverage level:\t' + averageE.toFixed(2);
  s += '\n\nOnly players from recently viewed portal details are listed.';

  window.dialog({
    text: s,
    title: 'Player levels: R' + averageR.toFixed(2) + ', E' + averageE.toFixed(2),
    id: 'guess-player-levels',
    width: 350,
    buttons: {
      'RESET GUESSES': function () {
        // clear all guessed levels from local storage
        localStorage.removeItem('plugin-guess-player-levels');
        window.plugin.guessPlayerLevels._nameToLevelCache = {};
        // now force all portals through the callback manually
        $.each(window.portals, function (guid) {
          var details = window.portalDetail.get(guid);
          if (details) window.plugin.guessPlayerLevels.extractPortalData({ details: details, success: true });
        });
        // and re-open the dialog (on a minimal timeout - so it's not closed while processing this callback)
        setTimeout(window.plugin.guessPlayerLevels.guess, 1);
      },
    },
  });
};

window.plugin.guessPlayerLevels.sort = function (playerHash) {
  return Object.keys(playerHash).sort(function (a, b) {
    if (playerHash[a] < playerHash[b]) return 1;
    if (playerHash[a] > playerHash[b]) return -1;

    if (a.toLowerCase() < b.toLowerCase()) return -1;
    if (a.toLowerCase() > b.toLowerCase()) return 1;
    return 0;
  });
};

var setup = function () {
  window.plugin.guessPlayerLevels.setupCallback();
  window.plugin.guessPlayerLevels.setupChatNickHelper();
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

