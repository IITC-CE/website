// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Scoring cycle / checkpoint times
// @category       Info
// @version        0.2.1.20240121.090833
// @description    Show the times used for the septicycle and checkpoints for regional scoreboards.
// @id             score-cycle-times
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR690/plugins/score-cycle-times.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR690/plugins/score-cycle-times.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/score-cycle-times.png
// @icon64         https://iitc.app/extras/plugin-icons/score-cycle-times-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-01-21-090833';
plugin_info.pluginId = 'score-cycle-times';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.2.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var scoreCycleTimes = {};
window.plugin.scoreCycleTimes = scoreCycleTimes;

scoreCycleTimes.CHECKPOINT = 5 * 60 * 60 * 1000; // 5 hours per checkpoint
scoreCycleTimes.CYCLE = 7 * 5 * scoreCycleTimes.CHECKPOINT; // 7 25-hour 'days' per cycle
scoreCycleTimes.locale = navigator.languages;
scoreCycleTimes.dateTimeFormat = {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit'
};

scoreCycleTimes.formatRow = function (label, time) {
  var dateTime = new Date(time).toLocaleString(scoreCycleTimes.locale, scoreCycleTimes.dateTimeFormat);
  return '<tr><td>' + label + '</td><td>' + dateTime + '</td></tr>';
};

scoreCycleTimes.update = function () {
  // checkpoint and cycle start times are based on a simple modulus of the timestamp
  // no special epoch (other than the unix timestamp/javascript's 1970-01-01 00:00 UTC) is required

  // when regional scoreboards were introduced, the first cycle would have started at 2014-01-15 10:00 UTC - but it was
  // a few checkpoints in when scores were first added

  var now = Date.now();

  var cycleStart = Math.floor(now / scoreCycleTimes.CYCLE) * scoreCycleTimes.CYCLE;
  var cycleEnd = cycleStart + scoreCycleTimes.CYCLE;

  var checkpointStart = Math.floor(now / scoreCycleTimes.CHECKPOINT) * scoreCycleTimes.CHECKPOINT;
  var checkpointEnd = checkpointStart + scoreCycleTimes.CHECKPOINT;

  var html = '<table>'
    + scoreCycleTimes.formatRow('Cycle start', cycleStart)
    + scoreCycleTimes.formatRow('Previous checkpoint', checkpointStart)
    + scoreCycleTimes.formatRow('Next checkpoint', checkpointEnd)
    + scoreCycleTimes.formatRow('Cycle end', cycleEnd)
    + '</table>';

  $('#score_cycle_times_display').html(html);

  setTimeout(scoreCycleTimes.update, checkpointEnd-now);
};

function setup () {
  $('#sidebar').append('<div id="score_cycle_times_display"></div>');
  $('<style>')
    .html('#score_cycle_times_display { color: #ffce00; }')
    .appendTo('head');

  scoreCycleTimes.update();
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

