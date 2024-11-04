// ==UserScript==
// @author         xelio
// @name           IITC plugin: Keys
// @category       Misc
// @version        0.4.3.20241104.092523
// @description    Allow manual entry of key counts for each portal. Use the 'keys-on-map' plugin to show the numbers on the map, and 'sync' to share between multiple browsers or desktop/mobile.
// @id             keys
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR773/plugins/keys.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR773/plugins/keys.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/keys.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-11-04-092523';
plugin_info.pluginId = 'keys';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.4.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.4.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.4.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
window.plugin.keys = function () {};

// delay in ms
window.plugin.keys.SYNC_DELAY = 5000;

window.plugin.keys.LOCAL_STORAGE_KEY = 'plugin-keys-data';

window.plugin.keys.KEY = { key: 'plugin-keys-data', field: 'keys' };
window.plugin.keys.UPDATE_QUEUE = { key: 'plugin-keys-data-queue', field: 'updateQueue' };
window.plugin.keys.UPDATING_QUEUE = { key: 'plugin-keys-data-updating-queue', field: 'updatingQueue' };

window.plugin.keys.keys = {};
window.plugin.keys.updateQueue = {};
window.plugin.keys.updatingQueue = {};

window.plugin.keys.enableSync = false;

window.plugin.keys.disabledMessage = null;
window.plugin.keys.contentHTML = null;

window.plugin.keys.addToSidebar = function () {
  if (typeof Storage === 'undefined') {
    $('#portaldetails > .imgpreview').after(window.plugin.keys.disabledMessage);
    return;
  }

  $('#portaldetails > .imgpreview').after(window.plugin.keys.contentHTML);
  window.plugin.keys.updateDisplayCount();
};

window.plugin.keys.updateDisplayCount = function () {
  var guid = window.selectedPortal;
  var count = window.plugin.keys.keys[guid] || 0;
  $('#keys-count').html(count);
};

window.plugin.keys.addKey = function (addCount, guid) {
  if (guid === undefined) guid = window.selectedPortal;

  var oldCount = window.plugin.keys.keys[guid];
  var newCount = Math.max((oldCount || 0) + addCount, 0);
  if (oldCount !== newCount) {
    if (newCount === 0) {
      delete window.plugin.keys.keys[guid];
      window.plugin.keys.updateQueue[guid] = null;
    } else {
      window.plugin.keys.keys[guid] = newCount;
      window.plugin.keys.updateQueue[guid] = newCount;
    }

    window.plugin.keys.storeLocal(window.plugin.keys.KEY);
    window.plugin.keys.storeLocal(window.plugin.keys.UPDATE_QUEUE);
    window.plugin.keys.updateDisplayCount();
    window.runHooks('pluginKeysUpdateKey', { guid: guid, count: newCount });
    window.plugin.keys.delaySync();
  }
};

// Delay the syncing to group a few updates in a single request
window.plugin.keys.delaySync = function () {
  if (!window.plugin.keys.enableSync) return;
  clearTimeout(window.plugin.keys.delaySync.timer);
  window.plugin.keys.delaySync.timer = setTimeout(function () {
    window.plugin.keys.delaySync.timer = null;
    window.plugin.keys.syncNow();
  }, window.plugin.keys.SYNC_DELAY);
};

// Store the updateQueue in updatingQueue and upload
window.plugin.keys.syncNow = function () {
  if (!window.plugin.keys.enableSync) return;
  $.extend(window.plugin.keys.updatingQueue, window.plugin.keys.updateQueue);
  window.plugin.keys.updateQueue = {};
  window.plugin.keys.storeLocal(window.plugin.keys.UPDATING_QUEUE);
  window.plugin.keys.storeLocal(window.plugin.keys.UPDATE_QUEUE);

  window.plugin.sync.updateMap('keys', 'keys', Object.keys(window.plugin.keys.updatingQueue));
};

// Call after IITC and all plugin loaded
window.plugin.keys.registerFieldForSyncing = function () {
  if (!window.plugin.sync) return;
  window.plugin.sync.registerMapForSync('keys', 'keys', window.plugin.keys.syncCallback, window.plugin.keys.syncInitialed);
};

// Call after local or remote change uploaded
window.plugin.keys.syncCallback = function (pluginName, fieldName, e, fullUpdated) {
  if (fieldName === 'keys') {
    window.plugin.keys.storeLocal(window.plugin.keys.KEY);
    // All data is replaced if other client update the data during this client offline,
    // fire 'pluginKeysRefreshAll' to notify a full update
    if (fullUpdated) {
      window.plugin.keys.updateDisplayCount();
      window.runHooks('pluginKeysRefreshAll');
      return;
    }

    if (!e) return;
    if (e.isLocal) {
      // Update pushed successfully, remove it from updatingQueue
      delete window.plugin.keys.updatingQueue[e.property];
    } else {
      // Remote update
      delete window.plugin.keys.updateQueue[e.property];
      window.plugin.keys.storeLocal(window.plugin.keys.UPDATE_QUEUE);
      window.plugin.keys.updateDisplayCount();
      window.runHooks('pluginKeysUpdateKey', { guid: e.property, count: window.plugin.keys.keys[e.property] });
    }
  }
};

// syncing of the field is initialed, upload all queued update
window.plugin.keys.syncInitialed = function (pluginName, fieldName) {
  if (fieldName === 'keys') {
    window.plugin.keys.enableSync = true;
    if (Object.keys(window.plugin.keys.updateQueue).length > 0) {
      window.plugin.keys.delaySync();
    }
  }
};

window.plugin.keys.storeLocal = function (mapping) {
  if (typeof window.plugin.keys[mapping.field] !== 'undefined' && window.plugin.keys[mapping.field] !== null) {
    localStorage[mapping.key] = JSON.stringify(window.plugin.keys[mapping.field]);
  } else {
    localStorage.removeItem(mapping.key);
  }
};

window.plugin.keys.loadLocal = function (mapping) {
  var objectJSON = localStorage[mapping.key];
  if (!objectJSON) return;
  window.plugin.keys[mapping.field] = mapping.convertFunc ? mapping.convertFunc(JSON.parse(objectJSON)) : JSON.parse(objectJSON);
};

// For backward compatibility, will change to use loadLocal after a few version
window.plugin.keys.loadKeys = function () {
  var keysObjectJSON = localStorage[window.plugin.keys.KEY.key];
  if (!keysObjectJSON) return;
  var keysObject = JSON.parse(keysObjectJSON);
  // Move keys data up one level, it was {keys: keys_data} in localstorage in previous version
  window.plugin.keys.keys = keysObject.keys ? keysObject.keys : keysObject;
  if (keysObject.keys) window.plugin.keys.storeLocal(window.plugin.keys.KEY);
};

window.plugin.keys.setupCSS = function () {
  $('<style>').prop('type', 'text/css').html('\
#keys-content-outer {\
  display: table;\
  width: 100%;\
  height: 26px;\
  text-align: center;\
}\
\
#keys-content-outer > div{\
  display: inline-block;\
  vertical-align: middle;\
  margin: 6px 3px 1px 3px;\
}\
\
#keys-label {\
  padding: 0 4px;\
  cursor: help;\
}\
\
#keys-add {\
}\
\
#keys-count {\
  width: 26px;\
  height: 18px !important;\
  border: 1px solid;\
  text-align: center;\
  cursor: help;\
}\
\
#keys-subtract {\
}\
\
.keys-button {\
  position:relative;\
  width: 16px;\
  height: 16px !important;\
}\
\
.keys-button > div {\
  background-color: rgb(32, 168, 177);\
  position: absolute;\
}\
\
.keys-button-minus {\
  width: 100%;\
  height: 4px;\
  top: 6px;\
}\
\
.keys-button-plus-h {\
  width: 100%;\
  height: 4px;\
  top: 6px;\
}\
\
.keys-button-plus-v {\
  width: 4px;\
  height: 100%;\
  left: 6px;\
}\
\
#keys-help {\
  font-weight: 900;\
  margin: 6px 3px 1px 20px !important;\
  cursor: help;\
}\
\
.portal-list-keys button {\
  font-family: monospace;\
  font-size: 0.9em;\
  text-align: center;\
  vertical-align: middle;\
  min-width: 0;\
  padding: 0;\
  width: 1.5em;\
  margin: -6px 0 -3px;\
}\
#portalslist.mobile .portal-list-keys button {\
  width: 3em;\
  height: 1.5em;\
}\
.portal-list-keys .plus {\
  margin-left: 0.3em;\
  margin-right: -1px;\
}\
\
').appendTo('head');
};

window.plugin.keys.setupContent = function () {
  window.plugin.keys.contentHTML =
    '<div id="keys-content-outer">' +
    ' <div id="keys-label" title="Problem? Point to the question mark!">Key(s):</div>' +
    ' <div id="keys-add" class="keys-button" onclick="window.plugin.keys.addKey(-1);">' +
    '  <div class="keys-button-minus"></div>' +
    ' </div>' +
    ' <div id="keys-count" title="Problem? Point to the question mark!"></div>' +
    ' <div id="keys-subtract" class="keys-button" onclick="window.plugin.keys.addKey(1);">' +
    '  <div class="keys-button-plus-v"></div>' +
    '  <div class="keys-button-plus-h"></div>' +
    ' </div>' +
    ' <div id="keys-help" title="You MUST manually input your count of keys!\n' +
    'This plugin CANNOT automatically get the keys from Ingress!">?</div>' +
    '</div>';
  window.plugin.keys.disabledMessage = '<div id="keys-content-outer" title="Your browser do not support localStorage">Plugin Keys disabled</div>';
};

window.plugin.keys.setupPortalsList = function () {
  window.addHook('pluginKeysUpdateKey', function (data) {
    $('[data-list-keycount="' + data.guid + '"]').text(data.count);
  });

  window.addHook('pluginKeysRefreshAll', function () {
    $('[data-list-keycount]').each(function (i, element) {
      var guid = element.getAttribute('data-list-keycount');
      $(element).text(window.plugin.keys.keys[guid] || 0);
    });
  });

  window.plugin.portalslist.fields.push({
    title: 'Keys',
    value: function (portal) {
      return portal.options.guid;
    }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
    sort: function (guidA, guidB) {
      var keysA = window.plugin.keys.keys[guidA] || 0;
      var keysB = window.plugin.keys.keys[guidB] || 0;
      return keysA - keysB;
    },
    format: function (cell, portal, guid) {
      $(cell)
        .addClass('alignR portal-list-keys ui-dialog-buttonset') // ui-dialog-buttonset for proper button styles
        .append(
          $('<span>')
            .text(window.plugin.keys.keys[guid] || 0)
            .attr({
              class: 'value',
              'data-list-keycount': guid,
            })
        );
      // for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
      $('<button>')
        .text('+')
        .addClass('plus')
        .appendTo(cell)[0]
        .addEventListener(
          'click',
          function () {
            window.plugin.keys.addKey(1, guid);
          },
          false
        );
      $('<button>')
        .text('-')
        .addClass('minus')
        .appendTo(cell)[0]
        .addEventListener(
          'click',
          function () {
            window.plugin.keys.addKey(-1, guid);
          },
          false
        );
    },
  });
};

var setup = function () {
  // HOOKS:
  // - pluginKeysUpdateKey
  // - pluginKeysRefreshAll

  window.plugin.keys.setupCSS();
  window.plugin.keys.setupContent();
  window.plugin.keys.loadLocal(window.plugin.keys.UPDATE_QUEUE);
  window.plugin.keys.loadKeys();
  window.addHook('portalDetailsUpdated', window.plugin.keys.addToSidebar);
  window.plugin.keys.registerFieldForSyncing();

  if (window.plugin.portalslist) {
    window.plugin.keys.setupPortalsList();
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

