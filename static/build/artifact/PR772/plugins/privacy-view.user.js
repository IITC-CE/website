// ==UserScript==
// @author         johnd0e
// @name           IITC plugin: Privacy view on Intel
// @category       Misc
// @version        1.2.2.20241103.111649
// @description    Hide info from intel which shouldn't leak to players of the other faction.
// @id             privacy-view
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR772/plugins/privacy-view.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR772/plugins/privacy-view.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/privacy-view.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-11-03-111649';
plugin_info.pluginId = 'privacy-view';
//END PLUGIN AUTHORS NOTE

/* global IITC -- eslint */
/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '1.2.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '1.2.1',
    changes: ['Fix plugin on mobile'],
  },
  {
    version: '1.2.0',
    changes: ['IITC.toolbox API is used to create plugin buttons and refactoring'],
  },
  {
    version: '1.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var privacyView = {};
window.plugin.privacyView = privacyView;
privacyView.activate = true;
privacyView.is_active = false;
privacyView.text = {
  true: 'Privacy active',
  false: 'Privacy inactive',
};

privacyView.toggle = () => {
  privacyView.is_active = !privacyView.is_active;
  document.body.classList.toggle('privacy_active', privacyView.is_active);
  if (window.isSmartphone()) {
    IITC.toolbox.updateButton('privacytoggle', { label: privacyView.text[privacyView.is_active] });
  } else {
    $('#privacytoggle').text(privacyView.is_active ? 'Privacy active' : 'Privacy inactive');
    if (!privacyView.is_active) {
      // refresh chat
      window.startRefreshTimeout(0.1 * 1000);
    }
  }
};

function setup() {
  $('<style>')
    .html(
      '.privacy_active #playerstat,' +
        '.privacy_active #chatinput,' +
        '.privacy_active #chatcontrols > a:not(#privacytoggle),' +
        '.privacy_active #chat { display: none; }' +
        '.privacy_active #chatcontrols { bottom: 0; top: auto }' +
        '.privacy_active .leaflet-left .leaflet-control {margin-left: 10px}'
    )
    .appendTo('head');

  if (window.isSmartphone()) {
    IITC.toolbox.addButton({
      id: 'privacytoggle',
      label: 'Permalink',
      title: '[9]',
      action: privacyView.toggle,
      accesskey: '9',
    });
  } else {
    $('<a id="privacytoggle" accesskey="9">')
      .click(function () {
        window.plugin.privacyView.toggle();
      })
      .attr('title', '[9]')
      .prependTo('#chatcontrols');
  }

  if (privacyView.activate) {
    privacyView.toggle();
  }
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

