// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Privacy view on Intel
// @category       Misc
// @version        1.1.0.20230710.154249
// @description    Hide info from intel which shouldn't leak to players of the other faction.
// @id             privacy-view
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR647/plugins/privacy-view.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR647/plugins/privacy-view.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/privacy-view.png
// @icon64         https://iitc.app/extras/plugin-icons/privacy-view-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2023-07-10-154249';
plugin_info.pluginId = 'privacy-view';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
var privacyView = {};
window.plugin.privacyView = privacyView;
privacyView.activate = true;

function setup () {
  $('<style>')
    .html(
      '.privacy_active #playerstat,' +
      '.privacy_active #chatinput,' +
      '.privacy_active #chatcontrols > a:not(#privacytoggle),' +
      '.privacy_active #chat { display: none; }' +
      '.privacy_active #chatcontrols { bottom: 0; top: auto }' +
      '.privacy_active .leaflet-left .leaflet-control {margin-left: 10px}')
    .appendTo('head');

  var ctrl = $('<a id="privacytoggle" accesskey="9">')
    .click(function () {
      var active = document.body.classList.toggle('privacy_active');
      this.innerHTML = active ? 'Privacy active' : 'Privacy inactive';
      if (!active) { // refresh chat
        window.startRefreshTimeout(0.1*1000);
      }
    });

  if (window.isSmartphone()) {
    ctrl.appendTo('#toolbox');
  } else {
    ctrl
      .attr('title','[9]')
      .prependTo('#chatcontrols');
  }

  if (privacyView.activate) { ctrl.click(); }
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

