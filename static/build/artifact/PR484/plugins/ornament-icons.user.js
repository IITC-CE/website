// ==UserScript==
// @author         johtata
// @name           IITC plugin: ornament icons basic
// @category       Layer
// @version        0.1.0.20220723.000534
// @description    Add own icons and names for ornaments
// @id             ornament-icons
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR484/plugins/ornament-icons.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR484/plugins/ornament-icons.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2022-07-23-000534';
plugin_info.pluginId = 'ornament-icons';
//END PLUGIN AUTHORS NOTE


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
    //   url: 'data:image/png;base64,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'
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

