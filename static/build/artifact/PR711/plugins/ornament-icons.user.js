// ==UserScript==
// @author         johtata
// @name           IITC plugin: Ornament icons basic
// @category       Layer
// @version        0.1.1.20240227.093417
// @description    Add own icons and names for ornaments
// @id             ornament-icons
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR711/plugins/ornament-icons.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR711/plugins/ornament-icons.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/ornament-icons.png
// @icon64         https://iitc.app/extras/plugin-icons/ornament-icons-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-02-27-093417';
plugin_info.pluginId = 'ornament-icons';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

/**********************
// Added as part of the Ingress #Helios in 2014, ornaments
// are additional image overlays for portals.
// currently there are 6 known types of ornaments: ap$x$suffix
// - cluster portals (without suffix)
// - volatile portals (_v)
// - meeting points (_start)
// - finish points (_end)
//
// Beacons and Frackers were introduced at the launch of the Ingress
// ingame store on November 1st, 2015
// - Beacons (pe$TAG - $NAME) ie: 'peNIA - NIANTIC'
// - Frackers ('peFRACK')
// (there are 7 different colors for each of them)
//
// Ornament IDs are dynamic. NIANTIC might change them at any time without prior notice.
// New ornamnent IDs found on the map will be recorded and saved to knownOrnaments from
// which the Ornaments dialog will be filled with checked checkboxes.
// To exclude a set of ornaments, even if they have not yet shown up on the map, the user
// can add an entry to excludedOrnaments, which will compared (startsWith) to all known and
// future IDs. example: "ap" to exclude all Ornaments for anomalies (ap1, ap2, ap2_v)

      Known ornaments (as of July 2022)
      // anomaly
      ap1, ap2, ap3, ap4, ap5, ap6, ap7, ap8, ap9
      & variations with _v, _end, _start
      // various beacons
      peFRACK, peNIA, peNEMESIS, peTOASTY, peFW_ENL, peFW_RES, peBN_BLM
      // battle beacons
      peBB_BATTLE_RARE, peBB_BATTLE,
      // battle winner beacons
      peBN_ENL_WINNER, peBN_RES_WINNER, peBN_TIED_WINNER,
      peBN_ENL_WINNER-60, peBN_RES_WINNER-60, peBN_TIED_WINNER-60,
      // battle rewards CAT 1-6
      peBR_REWARD-10_125_38, peBR_REWARD-10_150_75, peBR_REWARD-10_175_113,
      peBR_REWARD-10_200_150, peBR_REWARD-10_225_188, peBR_REWARD-10_250_225,
      // shards
      peLOOK
      // scouting
      sc5_p        // volatile scouting portal
      // battle
      bb_s         // scheduled RareBattleBeacons
      // various beacons
      peFRACK      // Fracker beacon

  The icon object holds optional definitions for the ornaments an beacons.
  'ornamentID' : {
    name: 'meaningful name',     // shows up in dialog
    layer: 'name for the Layer', // shows up in layerchooser, optional, if not set
                                 // ornament will be in "Ornaments"
    url: 'url',                  // from which the image will be taken, optional,
                                 // 84x84px is default, if not set, stock images will be
                                 // used
    offset: [dx,dy],             // optional, shift the ornament vertically or horizontally by
                                 // dx*size and dy*size. negative values will shift down
                                 // and left. [0.5, 0] to place right above the portal.
                                 // default is [0, 0] (center)
    opacity: 0..1                // optional, default is 0.6
  }

**********************/

// use own namespace for plugin
window.plugin.ornamentIcons = function () {};

window.plugin.ornamentIcons.jsonUrl = 'https://iitc.app/extras/ornaments/definitions.json';

// append or overwrite external definitions
window.plugin.ornamentIcons.setIcons = function(externalIconDefinitions) {
  const localIconDefinitions = {
    // give a name, leave layer to default, url and offset ([0, 0.5] to place above the portal)
    // 'peTOASTY': {
    //   name: 'TOASTY',
    //   offset: [0, 0.5],
    //   url: '##include_img:images/ornament-TOASTY.svg##' // replace "##" with single "@"
    // }
  };
  window.ornaments.icon = {...window.ornaments.icon, ...externalIconDefinitions, ...localIconDefinitions};
}

function setup () {
  fetch(window.plugin.ornamentIcons.jsonUrl).then(response => {
    response.json().then(data => {
      window.plugin.ornamentIcons.setIcons(data.ornaments);
    })
  });

}
/* exported setup */

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

