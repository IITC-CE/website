// ==UserScript==
// @author         ZasoGD
// @name           IITC plugin: Bookmarks for maps and portals
// @category       Controls
// @version        0.4.6.20250709.180413
// @description    Save your favorite Maps and Portals and move the intel map with a click. Works with sync. Supports Multi-Project-Extension
// @id             bookmarks
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/bookmarks.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/bookmarks.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/bookmarks.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-07-09-180413';
plugin_info.pluginId = 'bookmarks';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.4.6',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.4.5',
    changes: ['Simplying API for adding a new portal', 'Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.4.4',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.4.3',
    changes: ['Extracted "formatDistance" function for global use'],
  },
];

/* **********************************************************************

  HOOKS:
  - pluginBkmrksEdit: fired when a bookmarks/folder is removed, added or sorted, also when a folder is opened/closed;
  - pluginBkmrksOpenOpt: fired when the "Bookmarks Options" panel is opened (you can add new options);
  - pluginBkmrksSyncEnd: fired when the sync is finished;

********************************************************************** */

// use own namespace for plugin
window.plugin.bookmarks = function () {};

window.plugin.bookmarks.SYNC_DELAY = 5000;

window.plugin.bookmarks.KEY_OTHER_BKMRK = 'idOthers';
window.plugin.bookmarks.KEY_STORAGE = 'plugin-bookmarks';
window.plugin.bookmarks.KEY_STATUS_BOX = 'plugin-bookmarks-box';

window.plugin.bookmarks.KEY = { key: window.plugin.bookmarks.KEY_STORAGE, field: 'bkmrksObj' };
window.plugin.bookmarks.IsDefaultStorageKey = true; // as default on startup
window.plugin.bookmarks.UPDATE_QUEUE = { key: 'plugin-bookmarks-queue', field: 'updateQueue' };
window.plugin.bookmarks.UPDATING_QUEUE = { key: 'plugin-bookmarks-updating-queue', field: 'updatingQueue' };

window.plugin.bookmarks.bkmrksObj = {};
window.plugin.bookmarks.statusBox = {};
window.plugin.bookmarks.updateQueue = {};
window.plugin.bookmarks.updatingQueue = {};

window.plugin.bookmarks.IDcount = 0;

window.plugin.bookmarks.enableSync = false;

window.plugin.bookmarks.starLayers = {};
window.plugin.bookmarks.starLayerGroup = null;

window.plugin.bookmarks.isSmart = undefined;

/** *******************************************************************************************************************/

// Generate an ID for the bookmark (date time + random number)
window.plugin.bookmarks.generateID = function () {
  var d = new Date();
  var ID = d.getTime().toString() + window.plugin.bookmarks.IDcount.toString() + (Math.floor(Math.random() * 99) + 1);
  window.plugin.bookmarks.IDcount++;
  ID = 'id' + ID.toString();
  return ID;
};

// Format the string
window.plugin.bookmarks.escapeHtml = function (text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#47;')
    .replace(/\\/g, '&#92;');
};

window.plugin.bookmarks.escapeUnicode = function (str) {
  for (var result = '', index = 0, charCode; !isNaN((charCode = str.charCodeAt(index))); ) {
    if ((charCode & 127) === charCode) {
      result += str[index];
    } else {
      result += '\\u' + ('0000' + charCode.toString(16)).slice(-4);
    }
    index++;
  }
  return result;
};

// Update the localStorage
window.plugin.bookmarks.saveStorage = function () {
  localStorage[window.plugin.bookmarks.KEY_STORAGE] = JSON.stringify(window.plugin.bookmarks.bkmrksObj);
};

// Load the localStorage
window.plugin.bookmarks.loadStorage = function () {
  window.plugin.bookmarks.bkmrksObj = JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]);
};

window.plugin.bookmarks.saveStorageBox = function () {
  localStorage[window.plugin.bookmarks.KEY_STATUS_BOX] = JSON.stringify(window.plugin.bookmarks.statusBox);
};

window.plugin.bookmarks.loadStorageBox = function () {
  window.plugin.bookmarks.statusBox = JSON.parse(localStorage[window.plugin.bookmarks.KEY_STATUS_BOX]);
};

window.plugin.bookmarks.upgradeToNewStorage = function () {
  if (localStorage['plugin-bookmarks-portals-data'] && localStorage['plugin-bookmarks-maps-data']) {
    var oldStor_1 = JSON.parse(localStorage['plugin-bookmarks-maps-data']);
    var oldStor_2 = JSON.parse(localStorage['plugin-bookmarks-portals-data']);

    window.plugin.bookmarks.bkmrksObj.maps = oldStor_1.bkmrk_maps;
    window.plugin.bookmarks.bkmrksObj.portals = oldStor_2.bkmrk_portals;
    window.plugin.bookmarks.saveStorage();

    localStorage.removeItem('plugin-bookmarks-maps-data');
    localStorage.removeItem('plugin-bookmarks-portals-data');
    localStorage.removeItem('plugin-bookmarks-status-box');
  }
};

window.plugin.bookmarks.createStorage = function () {
  if (!localStorage[window.plugin.bookmarks.KEY_STORAGE]) {
    window.plugin.bookmarks.bkmrksObj.maps = { idOthers: { label: 'Others', state: 1, bkmrk: {} } };
    window.plugin.bookmarks.bkmrksObj.portals = { idOthers: { label: 'Others', state: 1, bkmrk: {} } };
    window.plugin.bookmarks.saveStorage();
  }
  if (!localStorage[window.plugin.bookmarks.KEY_STATUS_BOX]) {
    window.plugin.bookmarks.statusBox.show = 1;
    window.plugin.bookmarks.statusBox.page = 0;
    window.plugin.bookmarks.statusBox.pos = { x: 100, y: 100 };
    window.plugin.bookmarks.saveStorageBox();
  }
};

window.plugin.bookmarks.refreshBkmrks = function () {
  $('#bkmrk_maps > ul, #bkmrk_portals > ul').remove();

  window.plugin.bookmarks.loadStorage();
  window.plugin.bookmarks.loadList('maps');
  window.plugin.bookmarks.loadList('portals');

  window.plugin.bookmarks.updateStarPortal();
  window.plugin.bookmarks.jquerySortableScript();
};

/** *************************************************************************************************************************************************************/

// Show/hide the bookmarks box
window.plugin.bookmarks.switchStatusBkmrksBox = function (status) {
  var newStatus = status;

  if (newStatus === 'switch') {
    if (window.plugin.bookmarks.statusBox.show === 1) {
      newStatus = 0;
    } else {
      newStatus = 1;
    }
  }

  if (newStatus === 1) {
    $('#bookmarksBox').css('height', 'auto');
    $('#bkmrksTrigger').css('height', '0');
  } else {
    $('#bkmrksTrigger').css('height', '64px');
    $('#bookmarksBox').css('height', '0');
  }

  window.plugin.bookmarks.statusBox['show'] = newStatus;
  window.plugin.bookmarks.saveStorageBox();
};

window.plugin.bookmarks.onPaneChanged = function (pane) {
  if (pane === 'plugin-bookmarks') $('#bookmarksBox').css('display', '');
  else $('#bookmarksBox').css('display', 'none');
};

// Switch list (maps/portals)
window.plugin.bookmarks.switchPageBkmrksBox = function (elem, page) {
  window.plugin.bookmarks.statusBox.page = page;
  window.plugin.bookmarks.saveStorageBox();

  $('h5').removeClass('current');
  $(elem).addClass('current');

  var sectList = '#' + $(elem).attr('class').replace(' current', '');
  $('#bookmarksBox .bookmarkList').removeClass('current');
  $(sectList).addClass('current');
};

// Switch the status folder to open/close (in the localStorage)
window.plugin.bookmarks.openFolder = function (elem) {
  $(elem).parent().parent('li').toggleClass('open');

  var typeList = $(elem).parent().parent().parent().parent('div').attr('id').replace('bkmrk_', '');
  var ID = $(elem).parent().parent('li').attr('id');

  var newFlag;
  var flag = window.plugin.bookmarks.bkmrksObj[typeList][ID]['state'];
  if (flag) {
    newFlag = 0;
  } else if (!flag) {
    newFlag = 1;
  }

  window.plugin.bookmarks.bkmrksObj[typeList][ID]['state'] = newFlag;
  window.plugin.bookmarks.saveStorage();
  window.runHooks('pluginBkmrksEdit', { target: 'folder', action: newFlag ? 'open' : 'close', id: ID });
};

// Load the HTML bookmarks
window.plugin.bookmarks.loadList = function (typeList) {
  var element = '';
  var elementTemp = '';
  var elementExc = '';
  var returnToMap = '';

  if (window.plugin.bookmarks.isSmart) {
    returnToMap = "window.show('map');";
  }

  // For each folder
  var list = window.plugin.bookmarks.bkmrksObj[typeList];

  for (var idFolders in list) {
    var folders = list[idFolders];
    var active = '';

    // Create a label and a anchor for the sortable
    var folderDelete =
      '<span class="folderLabel"><a class="bookmarksRemoveFrom" onclick="window.plugin.bookmarks.removeElement(this, \'folder\');return false;" title="Remove this folder">X</a>';
    var folderName =
      '<a class="bookmarksAnchor" onclick="window.plugin.bookmarks.openFolder(this);return false"><span></span>' + folders['label'] + '</a></span>'; // <span><span></span></span>';
    var folderLabel = folderDelete + folderName;

    if (folders['state']) {
      active = ' open';
    }
    if (idFolders === window.plugin.bookmarks.KEY_OTHER_BKMRK) {
      folderLabel = '';
      active = ' othersBookmarks open';
    }
    // Create a folder
    elementTemp = `<li class="bookmarkFolder${active}" id="${idFolders}">${folderLabel}<ul>`;

    // For each bookmark
    var fold = folders['bkmrk'];
    for (var idBkmrk in fold) {
      var btn_link;
      var btn_remove = `<a class="bookmarksRemoveFrom" onclick="window.plugin.bookmarks.removeElement(this, '${typeList}');return false;" title="Remove from bookmarks">X</a>`;

      var btn_move = '';
      if (window.plugin.bookmarks.isSmart) {
        btn_move = `<a class="bookmarksMoveIn" onclick="window.plugin.bookmarks.dialogMobileSort('${typeList}', this);return false;">=</a>`;
      }

      var bkmrk = fold[idBkmrk];
      var label = bkmrk['label'];
      var latlng = bkmrk['latlng'];

      // If it's a map
      if (typeList === 'maps') {
        if (bkmrk['label'] === '') {
          label = bkmrk['latlng'] + ' [' + bkmrk['z'] + ']';
        }
        btn_link = `<a class="bookmarksLink" onclick="${returnToMap}window.map.setView([${latlng}], ${bkmrk['z']});return false;">${label}</a>`;
      }
      // If it's a portal
      else if (typeList === 'portals') {
        var guid = bkmrk['guid'];
        const bookmarks_onclick = `$('a.bookmarksLink.selected').removeClass('selected');${returnToMap}window.zoomToAndShowPortal('${guid}', [${latlng}]);return false;`;
        btn_link = `<a class="bookmarksLink" onclick="${bookmarks_onclick}">${label}</a>`;
      }
      // Create the bookmark
      elementTemp += '<li class="bkmrk" id="' + idBkmrk + '">' + btn_remove + btn_move + btn_link + '</li>';
    }
    elementTemp += '</li></ul>';

    // Add folder 'Others' in last position
    if (idFolders !== window.plugin.bookmarks.KEY_OTHER_BKMRK) {
      element += elementTemp;
    } else {
      elementExc = elementTemp;
    }
  }
  element += elementExc;
  element = '<ul>' + element + '</ul>';

  // Append all folders and bookmarks
  $('#bkmrk_' + typeList).append(element);
};

/** *************************************************************************************************************************************************************/

window.plugin.bookmarks.findByGuid = function (guid) {
  var list = window.plugin.bookmarks.bkmrksObj['portals'];

  for (var idFolders in list) {
    for (var idBkmrk in list[idFolders]['bkmrk']) {
      var portalGuid = list[idFolders]['bkmrk'][idBkmrk]['guid'];
      if (guid === portalGuid) {
        return { id_folder: idFolders, id_bookmark: idBkmrk };
      }
    }
  }
};

// Append a 'star' flag in sidebar.
window.plugin.bookmarks.onPortalSelectedPending = false;
window.plugin.bookmarks.onPortalSelected = function () {
  $('.bkmrksStar').remove();

  if (window.selectedPortal === null) return;

  if (!window.plugin.bookmarks.onPortalSelectedPending) {
    window.plugin.bookmarks.onPortalSelectedPending = true;

    setTimeout(function () {
      // the sidebar is constructed after firing the hook
      window.plugin.bookmarks.onPortalSelectedPending = false;

      $('.bkmrksStar').remove();

      if (typeof Storage === 'undefined') {
        $('#portaldetails > .imgpreview').after(window.plugin.bookmarks.htmlDisabledMessage);
        return;
      }

      // Prepend a star to mobile status-bar
      if (window.plugin.bookmarks.isSmart) {
        $('#updatestatus').prepend(window.plugin.bookmarks.htmlStar);
        $('#updatestatus .bkmrksStar').attr('title', '');
      }

      $('#portaldetails > h3.title').prepend(window.plugin.bookmarks.htmlStar);
      window.plugin.bookmarks.updateStarPortal();
    }, 0);
  }
};

// Update the status of the star (when a portal is selected from the map/bookmarks-list)
window.plugin.bookmarks.updateStarPortal = function () {
  var guid = window.selectedPortal;
  $('.bkmrksStar').removeClass('favorite');
  $('.bkmrk a.bookmarksLink.selected').removeClass('selected');

  // If current portal is into bookmarks: select bookmark portal from portals list and select the star
  if (localStorage[window.plugin.bookmarks.KEY_STORAGE].search(guid) !== -1) {
    var bkmrkData = window.plugin.bookmarks.findByGuid(guid);
    if (bkmrkData) {
      $('.bkmrk#' + bkmrkData['id_bookmark'] + ' a.bookmarksLink').addClass('selected');
      $('.bkmrksStar').addClass('favorite');
    }
  }
};

// Switch the status of the star
window.plugin.bookmarks.switchStarPortal = function (guid) {
  if (guid === undefined) guid = window.selectedPortal;

  // If portal is saved in bookmarks: Remove this bookmark
  var bkmrkData = window.plugin.bookmarks.findByGuid(guid);
  if (bkmrkData) {
    var list = window.plugin.bookmarks.bkmrksObj['portals'];
    delete list[bkmrkData['id_folder']]['bkmrk'][bkmrkData['id_bookmark']];
    $('.bkmrk#' + bkmrkData['id_bookmark'] + '').remove();

    window.plugin.bookmarks.saveStorage();
    window.plugin.bookmarks.updateStarPortal();

    window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'remove', folder: bkmrkData['id_folder'], id: bkmrkData['id_bookmark'], guid: guid });
    console.log('BOOKMARKS: removed portal (' + bkmrkData['id_bookmark'] + ' situated in ' + bkmrkData['id_folder'] + ' folder)');
  }
  // If portal isn't saved in bookmarks: Add this bookmark
  else {
    window.plugin.bookmarks.addPortalBookmarkByGuid(guid, true);
  }
};

/**
 * Adds a portal to the default bookmark folder.
 *
 * @param {L.circleMarker} marker - As enhanced when added to
 * window.portals.
 * @param {boolean} doPostProcess - Whether additional post-processing
 * should be done after the bookmark was added.  E.g., saving to local
 * storage, refreshing the widget, and running hooks.  If part of a batch
 * update, this should probably be false.
 */
window.plugin.bookmarks.addPortalBookmarkByMarker = function (marker, doPostProcess) {
  const guid = marker.options.guid;
  const label = marker.options.data.title;
  const ll = marker.getLatLng();
  const latlng = `${ll.lat},${ll.lng}`;
  const ID = window.plugin.bookmarks.generateID();

  window.plugin.bookmarks.bkmrksObj['portals'][window.plugin.bookmarks.KEY_OTHER_BKMRK]['bkmrk'][ID] = {
    guid: guid,
    latlng: latlng,
    label: label,
  };

  if (doPostProcess) {
    window.plugin.bookmarks.saveStorage();
    window.plugin.bookmarks.refreshBkmrks();
    window.runHooks('pluginBkmrksEdit', {
      target: 'portal',
      action: 'add',
      id: ID,
      guid: guid,
    });
    console.log(`BOOKMARKS: added portal ${ID}`);
  }
};

/**
 * Adds a portal to the default bookmark folder.
 *
 * @param {string} guid - The GUID of the portal.
 * @param {boolean} doPostProcess - Whether additional post processing
 * should be done after the bookmark was added.  E.g., saving to local
 * storage, refreshing the widget, and running hooks.  If part of a batch
 * update, this should probably be false.
 * @throws {Error} - If guid does not exist in window.portals.
 */
window.plugin.bookmarks.addPortalBookmarkByGuid = function (guid, doPostProcess) {
  const marker = window.portals[guid];
  if (marker) {
    window.plugin.bookmarks.addPortalBookmarkByMarker(marker, doPostProcess);
  } else {
    throw new Error(`Could not find portal information for guid "${guid}"`);
  }
};

/**
 * Adds a portal to the default bookmark folder.
 *
 * The window.plugin.bookmarks.addPortalBookmarkBy{Guid,Marker}() functions
 * should be used for new code.
 *
 * @deprecated
 * @param {string} guid - The GUID of the portal.
 * @param {string} latlng - 'lat,lng' for the portal.
 * @param {string} label - The title of the portal.  Typically this is the
 * same value as the options.data.title property from the appropriate
 * window.portals entry, though nothing enforces this.
 */
window.plugin.bookmarks.addPortalBookmark = function (guid, latlng, label) {
  var ID = window.plugin.bookmarks.generateID();

  // Add bookmark in the localStorage
  window.plugin.bookmarks.bkmrksObj['portals'][window.plugin.bookmarks.KEY_OTHER_BKMRK]['bkmrk'][ID] = { guid: guid, latlng: latlng, label: label };

  window.plugin.bookmarks.saveStorage();
  window.plugin.bookmarks.refreshBkmrks();
  window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'add', id: ID, guid: guid });
  console.log('BOOKMARKS: added portal ' + ID);
};

// Add BOOKMARK/FOLDER
window.plugin.bookmarks.addElement = function (elem, type) {
  var ID = window.plugin.bookmarks.generateID();
  var typeList = $(elem).parent().parent('div').attr('id');

  // Get the label | Convert some characters | Set the input (empty)
  var input = `#${typeList} .addForm input`;
  var label = $(input).val();
  label = window.plugin.bookmarks.escapeHtml(label);
  $(input).val('');

  // Add a map
  if (type === 'map') {
    // Get the coordinates and zoom
    var c = window.map.getCenter();
    var lat = Math.round(c.lat * 1e6) / 1e6;
    var lng = Math.round(c.lng * 1e6) / 1e6;
    var latlng = lat + ',' + lng;
    var zoom = parseInt(window.map.getZoom());
    // Add bookmark in the localStorage
    window.plugin.bookmarks.bkmrksObj['maps'][window.plugin.bookmarks.KEY_OTHER_BKMRK]['bkmrk'][ID] = { label: label, latlng: latlng, z: zoom };
  } else {
    if (label === '') {
      label = 'Folder';
    }
    var short_type = typeList.replace('bkmrk_', '');
    // Add new folder in the localStorage
    window.plugin.bookmarks.bkmrksObj[short_type][ID] = { label: label, state: 1, bkmrk: {} };
  }
  window.plugin.bookmarks.saveStorage();
  window.plugin.bookmarks.refreshBkmrks();
  window.runHooks('pluginBkmrksEdit', { target: type, action: 'add', id: ID });
  console.log('BOOKMARKS: added ' + type + ' ' + ID);
};

// Remove BOOKMARK/FOLDER
window.plugin.bookmarks.removeElement = function (elem, type) {
  if (type === 'maps' || type === 'portals') {
    const typeList = $(elem).parent().parent().parent().parent().parent('div').attr('id');
    const ID = $(elem).parent('li').attr('id');
    var IDfold = $(elem).parent().parent().parent('li').attr('id');
    var guid = window.plugin.bookmarks.bkmrksObj[typeList.replace('bkmrk_', '')][IDfold]['bkmrk'][ID].guid;

    delete window.plugin.bookmarks.bkmrksObj[typeList.replace('bkmrk_', '')][IDfold]['bkmrk'][ID];
    $(elem).parent('li').remove();

    if (type === 'portals') {
      window.plugin.bookmarks.updateStarPortal();
      window.plugin.bookmarks.saveStorage();

      window.runHooks('pluginBkmrksEdit', { target: 'portal', action: 'remove', folder: IDfold, id: ID, guid: guid });
      console.log('BOOKMARKS: removed portal (' + ID + ' situated in ' + IDfold + ' folder)');
    } else {
      window.plugin.bookmarks.saveStorage();
      window.runHooks('pluginBkmrksEdit', { target: 'map', action: 'remove', id: ID });
      console.log('BOOKMARKS: removed map ' + ID);
    }
  } else if (type === 'folder') {
    const typeList = $(elem).parent().parent().parent().parent('div').attr('id');
    const ID = $(elem).parent().parent('li').attr('id');

    delete window.plugin.bookmarks.bkmrksObj[typeList.replace('bkmrk_', '')][ID];
    $(elem).parent().parent('li').remove();
    window.plugin.bookmarks.saveStorage();
    window.plugin.bookmarks.updateStarPortal();
    window.runHooks('pluginBkmrksEdit', { target: 'folder', action: 'remove', id: ID });
    console.log('BOOKMARKS: removed folder ' + ID);
  }
};

window.plugin.bookmarks.deleteMode = function () {
  $('#bookmarksBox').removeClass('moveMode').toggleClass('deleteMode');
};

window.plugin.bookmarks.moveMode = function () {
  $('#bookmarksBox').removeClass('deleteMode').toggleClass('moveMode');
};

window.plugin.bookmarks.mobileSortIDb = '';
window.plugin.bookmarks.mobileSortIDf = '';
window.plugin.bookmarks.dialogMobileSort = function (type, elem) {
  window.plugin.bookmarks.mobileSortIDb = $(elem).parent('li.bkmrk').attr('id');
  window.plugin.bookmarks.mobileSortIDf = $(elem).parent('li.bkmrk').parent('ul').parent('li.bookmarkFolder').attr('id');

  if (type === 'maps') {
    type = 1;
  } else if (type === 'portals') {
    type = 2;
  }

  window.dialog({
    html: window.plugin.bookmarks.dialogLoadListFolders('bookmarksDialogMobileSort', 'window.plugin.bookmarks.mobileSort', true, type),
    dialogClass: 'ui-dialog-bkmrksSet-copy',
    id: 'plugin-bookmarks-move-bookmark',
    title: 'Bookmarks - Move Bookmark',
  });
};

window.plugin.bookmarks.mobileSort = function (elem) {
  var type = $(elem).data('type');
  var idBkmrk = window.plugin.bookmarks.mobileSortIDb;
  var newFold = $(elem).data('id');
  var oldFold = window.plugin.bookmarks.mobileSortIDf;

  var Bkmrk = window.plugin.bookmarks.bkmrksObj[type][oldFold].bkmrk[idBkmrk];

  delete window.plugin.bookmarks.bkmrksObj[type][oldFold].bkmrk[idBkmrk];

  window.plugin.bookmarks.bkmrksObj[type][newFold].bkmrk[idBkmrk] = Bkmrk;

  window.plugin.bookmarks.saveStorage();
  window.plugin.bookmarks.refreshBkmrks();
  window.runHooks('pluginBkmrksEdit', { target: 'bookmarks', action: 'sort' });
  window.plugin.bookmarks.mobileSortIDf = newFold;
  console.log(`Move Bookmarks ${type} ID:${idBkmrk} from folder ID:${oldFold} to folder ID:${newFold}`);
};

window.plugin.bookmarks.onSearch = function (query) {
  var term = query.term.toLowerCase();

  $.each(window.plugin.bookmarks.bkmrksObj.maps, function (id, folder) {
    $.each(folder.bkmrk, function (id, bookmark) {
      if (bookmark.label.toLowerCase().indexOf(term) === -1) return;

      query.addResult({
        title: window.escapeHtmlSpecialChars(bookmark.label),
        description: `Map in folder "${window.escapeHtmlSpecialChars(folder.label)}"`,
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADYSURBVCiRldExLoRxEAXw33xZ4QIKB9BQWPl0yFKJA4hCo1CqXMABVA6gcgkFnc7/s7VQaByAgoYdhU3sZr9NmGSaee/NvJeJUkr6R3WgrusYm/ajJ7zr5t3ouGmarFrXpFPpuA2aFDSxIWxjXz/mWy25jx3hEAsqS0NsFi/68YxHlXPK8MKbGwR6GN06g0XhwYrrX0tb+enJAS5b8pzp5gk5GM+wl1/C1YQgfEwPPbA+JN3iAgMsTxeEOWlXNzet5pHKGl7HOKWUzEx/6VJKdvj54IT3KfUNvrNZ/jYm+uoAAAAASUVORK5CYII=',
        position: L.latLng(bookmark.latlng.split(',')),
        zoom: bookmark.z,
        onSelected: window.plugin.bookmarks.onSearchResultSelected,
      });
    });
  });

  $.each(window.plugin.bookmarks.bkmrksObj.portals, function (id, folder) {
    $.each(folder.bkmrk, function (id, bookmark) {
      if (bookmark.label.toLowerCase().indexOf(term) === -1) return;

      query.addResult({
        title: window.escapeHtmlSpecialChars(bookmark.label),
        description: `Bookmark in folder "${window.escapeHtmlSpecialChars(folder.label)}"`,
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAN1wAADdcBQiibeAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADFSURBVCiRrdEtTkMBEATgb19C0gsgEEgMFW2TooAURzgACoNAorgAB6jqAVBcghBQYPmxBAQeBYYQ4C2CJvTlPUibMG53ZpKZ3chMs6Bo3N7EwG2sTG9Ih9J+ExW1SFexpnCBNyzq5VPdcB2bwi4WsIz5Mf+OR9wrjHTy9DvSi3MEBhNimMOScKfj7KfDRn54sIPjhj5D3Twgy2rp7fwUTuotvU6O1SuVVseiSxyhRPt3Q2hJW7q5rpd7Cn08VyT/8+k/8AVY7Dd1pA43RAAAAABJRU5ErkJggg==',
        position: L.latLng(bookmark.latlng.split(',')),
        guid: bookmark.guid,
        onSelected: window.plugin.bookmarks.onSearchResultSelected,
      });
    });
  });
};

window.plugin.bookmarks.onSearchResultSelected = function (result, event) {
  if (result.guid) {
    // portal
    var guid = result.guid;
    if (event.type === 'dblclick') window.zoomToAndShowPortal(guid, result.position);
    else if (window.portals[guid]) window.renderPortalDetails(guid);
    else window.selectPortalByLatLng(result.position);
  } else if (result.zoom) {
    // map
    window.map.setView(result.position, result.zoom);
  }
  return true; // prevent default behavior
};

/** *************************************************************************************************************************************************************/

// Saved the new sort of the folders (in the localStorage)
window.plugin.bookmarks.sortFolder = function (typeList) {
  var keyType = typeList.replace('bkmrk_', '');

  var newArr = {};
  $(`#${typeList} li.bookmarkFolder`).each(function () {
    var idFold = $(this).attr('id');
    newArr[idFold] = window.plugin.bookmarks.bkmrksObj[keyType][idFold];
  });
  window.plugin.bookmarks.bkmrksObj[keyType] = newArr;
  window.plugin.bookmarks.saveStorage();

  window.runHooks('pluginBkmrksEdit', { target: 'folder', action: 'sort' });
  console.log('BOOKMARKS: sorted folder');
};

// Saved the new sort of the bookmarks (in the localStorage)
window.plugin.bookmarks.sortBookmark = function (typeList) {
  var keyType = typeList.replace('bkmrk_', '');
  var newArr = {};

  $(`#${typeList} li.bookmarkFolder`).each(function () {
    var idFold = $(this).attr('id');
    newArr[idFold] = window.plugin.bookmarks.bkmrksObj[keyType][idFold];
    newArr[idFold].bkmrk = {};
  });

  $(`#${typeList} li.bkmrk`).each(function () {
    window.plugin.bookmarks.loadStorage();

    var idFold = $(this).parent().parent('li').attr('id');
    var id = $(this).attr('id');

    var list = window.plugin.bookmarks.bkmrksObj[keyType];
    for (var idFoldersOrigin in list) {
      for (var idBkmrk in list[idFoldersOrigin]['bkmrk']) {
        if (idBkmrk === id) {
          newArr[idFold].bkmrk[id] = window.plugin.bookmarks.bkmrksObj[keyType][idFoldersOrigin].bkmrk[id];
        }
      }
    }
  });
  window.plugin.bookmarks.bkmrksObj[keyType] = newArr;
  window.plugin.bookmarks.saveStorage();
  window.runHooks('pluginBkmrksEdit', { target: 'bookmarks', action: 'sort' });
  console.log('BOOKMARKS: sorted bookmark (portal/map)');
};

window.plugin.bookmarks.jquerySortableScript = function () {
  $('.bookmarkList > ul').sortable({
    items: 'li.bookmarkFolder:not(.othersBookmarks)',
    handle: '.bookmarksAnchor',
    placeholder: 'sortable-placeholder',
    helper: 'clone', // fix accidental click in firefox
    forcePlaceholderSize: true,
    update: function (event, ui) {
      var typeList = ui.item.parent().parent('.bookmarkList').attr('id');
      window.plugin.bookmarks.sortFolder(typeList);
    },
  });

  $('.bookmarkList ul li ul').sortable({
    items: 'li.bkmrk',
    connectWith: '.bookmarkList ul ul',
    handle: '.bookmarksLink',
    placeholder: 'sortable-placeholder',
    helper: 'clone', // fix accidental click in firefox
    forcePlaceholderSize: true,
    update: function (event, ui) {
      var typeList = ui.item.parent().parent().parent().parent('.bookmarkList').attr('id');
      window.plugin.bookmarks.sortBookmark(typeList);
    },
  });
};

/** ************************************************************************************************************************************************************/
/** OPTIONS ****************************************************************************************************************************************************/
/** ************************************************************************************************************************************************************/
// Manual import, export and reset data
window.plugin.bookmarks.manualOpt = function () {
  window.dialog({
    html: window.plugin.bookmarks.htmlSetbox,
    dialogClass: 'ui-dialog-bkmrksSet',
    id: 'plugin-bookmarks-options',
    title: 'Bookmarks Options',
  });

  window.runHooks('pluginBkmrksOpenOpt');
};

window.plugin.bookmarks.optAlert = function (message) {
  $('.ui-dialog-bkmrksSet .ui-dialog-buttonset').prepend('<p class="bkrmks-alert" style="float:left;margin-top:4px;">' + message + '</p>');
  $('.bkrmks-alert').delay(2500).fadeOut();
};

window.plugin.bookmarks.optCopy = function () {
  if (window.isApp && window.app.shareString) {
    return window.app.shareString(window.plugin.bookmarks.escapeUnicode(localStorage[window.plugin.bookmarks.KEY_STORAGE]));
  } else {
    window.dialog({
      html:
        '<p><a onclick="$(\'.ui-dialog-bkmrksSet-copy textarea\').select();">Select all</a> and press CTRL+C to copy it.</p><textarea readonly>' +
        window.plugin.bookmarks.escapeUnicode(localStorage[window.plugin.bookmarks.KEY_STORAGE]) +
        '</textarea>',
      dialogClass: 'ui-dialog-bkmrksSet-copy',
      id: 'plugin-bookmarks-export',
      title: 'Bookmarks Export',
    });
  }
};

window.plugin.bookmarks.optExport = function () {
  var data = localStorage[window.plugin.bookmarks.KEY_STORAGE];
  window.saveFile(data, 'IITC-bookmarks.json', 'application/json');
};

window.plugin.bookmarks.optPaste = function () {
  var promptAction = prompt('Press CTRL+V to paste it.', '');
  if (promptAction !== null && promptAction !== '') {
    try {
      JSON.parse(promptAction); // try to parse JSON first
      localStorage[window.plugin.bookmarks.KEY_STORAGE] = promptAction;
      window.plugin.bookmarks.refreshBkmrks();
      window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'import' });
      console.log('BOOKMARKS: reset and imported bookmarks');
      window.plugin.bookmarks.optAlert('Successful. ');
    } catch (e) {
      console.warn('BOOKMARKS: failed to import data: ' + e);
      window.plugin.bookmarks.optAlert('<span style="color: #f88">Import failed </span>');
    }
  }
};

window.plugin.bookmarks.optImport = function () {
  L.FileListLoader.loadFiles({ accept: 'application/json' }).on('load', function (e) {
    try {
      JSON.parse(e.reader.result); // try to parse JSON first
      localStorage[window.plugin.bookmarks.KEY_STORAGE] = e.reader.result;
      window.plugin.bookmarks.refreshBkmrks();
      window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'import' });
      console.log('BOOKMARKS: reset and imported bookmarks');
      window.plugin.bookmarks.optAlert('Successful. ');
    } catch (e) {
      console.warn('BOOKMARKS: failed to import data: ' + e);
      window.plugin.bookmarks.optAlert('<span style="color: #f88">Import failed </span>');
    }
  });
};

window.plugin.bookmarks.optReset = function () {
  var promptAction = confirm('All bookmarks will be deleted. Are you sure?', '');
  if (promptAction) {
    delete localStorage[window.plugin.bookmarks.KEY_STORAGE];
    window.plugin.bookmarks.createStorage();
    window.plugin.bookmarks.loadStorage();
    window.plugin.bookmarks.refreshBkmrks();
    window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'reset' });
    console.log('BOOKMARKS: reset all bookmarks');
    window.plugin.bookmarks.optAlert('Successful. ');
  }
};

window.plugin.bookmarks.optBox = function (command) {
  if (!window.isApp) {
    switch (command) {
      case 'save':
        var boxX = parseInt($('#bookmarksBox').css('top'));
        var boxY = parseInt($('#bookmarksBox').css('left'));
        window.plugin.bookmarks.statusBox.pos = { x: boxX, y: boxY };
        window.plugin.bookmarks.saveStorageBox();
        window.plugin.bookmarks.optAlert('Position acquired. ');
        break;
      case 'reset':
        $('#bookmarksBox').css({ top: 100, left: 100 });
        window.plugin.bookmarks.optBox('save');
        break;
    }
  } else {
    window.plugin.bookmarks.optAlert('Only IITC desktop. ');
  }
};

window.plugin.bookmarks.dialogLoadListFolders = function (idBox, clickAction, showOthersF, scanType /* 0 = maps&portals; 1 = maps; 2 = portals*/) {
  var list = JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]);
  var listHTML = '';
  var foldHTML = '';
  var elemGenericFolder = '';

  // For each type and folder
  for (var type in list) {
    if (scanType === 0 || (scanType === 1 && type === 'maps') || (scanType === 2 && type === 'portals')) {
      listHTML += '<h3>' + type + ':</h3>';

      for (var idFolders in list[type]) {
        var label = list[type][idFolders]['label'];

        // Create a folder
        foldHTML = `<div class="bookmarkFolder" id="${idFolders}" data-type="${type}" data-id="${idFolders}" onclick="${clickAction}(this);return false;">${label}</div>`;

        if (idFolders !== window.plugin.bookmarks.KEY_OTHER_BKMRK) {
          listHTML += foldHTML;
        } else {
          if (showOthersF === true) {
            elemGenericFolder = foldHTML;
          }
        }
      }
    }
    listHTML += elemGenericFolder;
    elemGenericFolder = '';
  }

  // Append all folders
  var r = `<div class="bookmarksDialog" id="${idBox}">${listHTML}</div>`;
  return r;
};

window.plugin.bookmarks.renameFolder = function (elem) {
  var type = $(elem).data('type');
  var idFold = $(elem).data('id');

  var promptAction = prompt('Insert a new name.', '');
  if (promptAction !== null && promptAction !== '') {
    try {
      var newName = window.plugin.bookmarks.escapeHtml(promptAction);

      window.plugin.bookmarks.bkmrksObj[type][idFold].label = newName;
      $('#bookmarksDialogRenameF #' + idFold).text(newName);
      window.plugin.bookmarks.saveStorage();
      window.plugin.bookmarks.refreshBkmrks();
      window.runHooks('pluginBkmrksEdit', { target: 'all', action: 'import' });

      console.log('BOOKMARKS: renamed bookmarks folder');
      window.plugin.bookmarks.optAlert('Successful. ');
    } catch (e) {
      console.warn('BOOKMARKS: failed to rename folder: ' + e);
      window.plugin.bookmarks.optAlert('<span style="color: #f88">Rename failed </span>');
    }
  }
};

window.plugin.bookmarks.optRenameF = function () {
  window.dialog({
    html: window.plugin.bookmarks.dialogLoadListFolders('bookmarksDialogRenameF', 'window.plugin.bookmarks.renameFolder', false, 0),
    dialogClass: 'ui-dialog-bkmrksSet-copy',
    id: 'plugin-bookmarks-rename-folder',
    title: 'Bookmarks Rename Folder',
  });
};

/** ************************************************************************************************************************************************************/
/** AUTO DRAW **************************************************************************************************************************************************/
/** ************************************************************************************************************************************************************/
window.plugin.bookmarks.dialogDrawer = function () {
  window.dialog({
    html: window.plugin.bookmarks.dialogLoadList,
    dialogClass: 'ui-dialog-autodrawer',
    id: 'plugin-bookmarks-move-bookmark',
    title: 'Bookmarks - Auto Draw',
    buttons: {
      DRAW: function () {
        window.plugin.bookmarks.draw(0);
      },
      'DRAW&VIEW': function () {
        window.plugin.bookmarks.draw(1);
      },
    },
  });
  window.plugin.bookmarks.autoDrawOnSelect();
};

window.plugin.bookmarks.draw = function (view) {
  var latlngs = [];
  $('#bkmrksAutoDrawer a.bkmrk.selected').each(function (i) {
    var tt = $(this).data('latlng');
    latlngs[i] = tt;
  });

  if (latlngs.length >= 2 && latlngs.length <= 3) {
    // TODO: add an API to draw-tools rather than assuming things about its internals

    var layer, layerType;
    if (latlngs.length === 2) {
      layer = L.geodesicPolyline(latlngs, window.plugin.drawTools.lineOptions);
      layerType = 'polyline';
    } else {
      layer = L.geodesicPolygon(latlngs, window.plugin.drawTools.polygonOptions);
      layerType = 'polygon';
    }

    window.map.fire('draw:created', {
      layer: layer,
      layerType: layerType,
    });

    if ($('#bkmrkClearSelection').prop('checked')) $('#bkmrksAutoDrawer a.bkmrk.selected').removeClass('selected');

    if (window.plugin.bookmarks.isSmart) {
      window.show('map');
    }

    // Shown the layer if it is hidden
    if (!window.map.hasLayer(window.plugin.drawTools.drawnItems)) {
      window.map.addLayer(window.plugin.drawTools.drawnItems);
    }

    if (view) {
      window.map.fitBounds(layer.getBounds());
    }
  }
};

window.plugin.bookmarks.autoDrawOnSelect = function () {
  var latlngs = [];
  $('#bkmrksAutoDrawer a.bkmrk.selected').each(function (i) {
    var tt = $(this).data('latlng');
    latlngs[i] = tt;
  });

  var text = 'You must select 2 or 3 portals!';
  var color = 'red';

  function distanceElement(distance) {
    var text = window.formatDistance(distance);
    return distance >= 200000 ? '<em title="Long distance link" class="help longdistance">' + text + '</em>' : text;
  }

  if (latlngs.length === 2) {
    var distance = L.latLng(latlngs[0]).distanceTo(latlngs[1]);
    text = 'Distance between portals: ' + distanceElement(distance);
    color = '';
  } else if (latlngs.length === 3) {
    var distances = latlngs.map(function (ll1, i, latlngs) {
      var ll2 = latlngs[(i + 1) % 3];
      return distanceElement(L.latLng(ll1).distanceTo(ll2));
    });
    text = 'Distances: ' + distances.join(', ');
    color = '';
  }

  $('#bkmrksAutoDrawer p').html(text).css('color', color);
};

window.plugin.bookmarks.dialogLoadList = function () {
  var r = 'The "<a href="' + 'https://iitc.app/' + '" target="_BLANK"><strong>Draw Tools</strong></a>" plugin is required.</span>';

  if (!window.plugin.bookmarks || !window.plugin.drawTools) {
    $('.ui-dialog-autodrawer .ui-dialog-buttonset .ui-button:not(:first)').hide();
  } else {
    var portalsList = JSON.parse(localStorage[window.plugin.bookmarks.KEY_STORAGE]);
    var element = '';
    var elementTemp = '';
    var elemGenericFolder = '';

    // For each folder
    var list = portalsList.portals;
    for (var idFolders in list) {
      var folders = list[idFolders];

      // Create a label and a anchor for the sortable
      var folderLabel = `<a class="folderLabel" onclick="$(this).siblings('div').toggle();return false;">${folders['label']}</a>`;

      // Create a folder
      elementTemp = `<div class="bookmarkFolder" id="${idFolders}">${folderLabel}<div>`;

      // For each bookmark
      var fold = folders['bkmrk'];
      for (var idBkmrk in fold) {
        var bkmrk = fold[idBkmrk];
        var label = bkmrk['label'];
        var latlng = bkmrk['latlng'];

        // Create the bookmark
        elementTemp += `<a class="bkmrk" id="${idBkmrk}" onclick="$(this).toggleClass('selected');return false" data-latlng="[${latlng}]">${label}</a>`;
      }
      elementTemp += '</div></div>';

      if (idFolders !== window.plugin.bookmarks.KEY_OTHER_BKMRK) {
        element += elementTemp;
      } else {
        elemGenericFolder += elementTemp;
      }
    }
    element += elemGenericFolder;

    // Append all folders and bookmarks
    r =
      '<div id="bkmrksAutoDrawer">' +
      '<label style="margin-bottom: 9px; display: block;">' +
      '<input style="vertical-align: middle;" type="checkbox" id="bkmrkClearSelection" checked>' +
      ' Clear selection after drawing</label>' +
      '<p style="margin-bottom:9px;color:red">You must select 2 or 3 portals!</p>' +
      '<div onclick="window.plugin.bookmarks.autoDrawOnSelect();return false;">' +
      element +
      '</div>' +
      '</div>';
  }
  return r;
};

/** ************************************************************************************************************************************************************/
/** SYNC *******************************************************************************************************************************************************/
/** ************************************************************************************************************************************************************/
// Delay the syncing to group a few updates in a single request
window.plugin.bookmarks.delaySync = function () {
  if (!window.plugin.bookmarks.enableSync || !window.plugin.bookmarks.IsDefaultStorageKey) return;
  clearTimeout(window.plugin.bookmarks.delaySync.timer);
  window.plugin.bookmarks.delaySync.timer = setTimeout(function () {
    window.plugin.bookmarks.delaySync.timer = null;
    window.plugin.bookmarks.syncNow();
  }, window.plugin.bookmarks.SYNC_DELAY);
};

// Store the updateQueue in updatingQueue and upload
window.plugin.bookmarks.syncNow = function () {
  if (!window.plugin.bookmarks.enableSync || !window.plugin.bookmarks.IsDefaultStorageKey) return;
  $.extend(window.plugin.bookmarks.updatingQueue, window.plugin.bookmarks.updateQueue);
  window.plugin.bookmarks.updateQueue = {};
  window.plugin.bookmarks.storeLocal(window.plugin.bookmarks.UPDATING_QUEUE);
  window.plugin.bookmarks.storeLocal(window.plugin.bookmarks.UPDATE_QUEUE);

  window.plugin.sync.updateMap('bookmarks', window.plugin.bookmarks.KEY.field, Object.keys(window.plugin.bookmarks.updatingQueue));
};

// Call after IITC and all plugin loaded
window.plugin.bookmarks.registerFieldForSyncing = function () {
  if (!window.plugin.sync) return;
  window.plugin.sync.registerMapForSync(
    'bookmarks',
    window.plugin.bookmarks.KEY.field,
    window.plugin.bookmarks.syncCallback,
    window.plugin.bookmarks.syncInitialized
  );
};

// Call after local or remote change uploaded
window.plugin.bookmarks.syncCallback = function (pluginName, fieldName, e, fullUpdated) {
  if (fieldName === window.plugin.bookmarks.KEY.field) {
    window.plugin.bookmarks.storeLocal(window.plugin.bookmarks.KEY);
    // All data is replaced if other client update the data during this client offline,
    if (fullUpdated) {
      window.plugin.bookmarks.refreshBkmrks();
      window.plugin.bookmarks.resetAllStars();
      window.runHooks('pluginBkmrksSyncEnd', { target: 'all', action: 'sync' });
      console.log('BOOKMARKS: synchronized all from drive after offline');
      return;
    }

    if (!e) return;
    if (e.isLocal) {
      // Update pushed successfully, remove it from updatingQueue
      delete window.plugin.bookmarks.updatingQueue[e.property];
      console.log('BOOKMARKS: synchronized to drive');
    } else {
      // Remote update
      delete window.plugin.bookmarks.updateQueue[e.property];
      window.plugin.bookmarks.storeLocal(window.plugin.bookmarks.UPDATE_QUEUE);
      window.plugin.bookmarks.refreshBkmrks();
      window.plugin.bookmarks.resetAllStars();
      window.runHooks('pluginBkmrksSyncEnd', { target: 'all', action: 'sync' });
      console.log('BOOKMARKS: synchronized all from remote');
    }
  }
};

// syncing of the field is initialized, upload all queued update
window.plugin.bookmarks.syncInitialized = function (pluginName, fieldName) {
  if (fieldName === window.plugin.bookmarks.KEY.field) {
    window.plugin.bookmarks.enableSync = true;
    if (Object.keys(window.plugin.bookmarks.updateQueue).length > 0) {
      window.plugin.bookmarks.delaySync();
    }
  }
};

window.plugin.bookmarks.storeLocal = function (mapping) {
  if (typeof window.plugin.bookmarks[mapping.field] !== 'undefined' && window.plugin.bookmarks[mapping.field] !== null) {
    localStorage[mapping.key] = JSON.stringify(window.plugin.bookmarks[mapping.field]);
  } else {
    localStorage.removeItem(mapping.key);
  }
};

window.plugin.bookmarks.loadLocal = function (mapping) {
  var objectJSON = localStorage[mapping.key];
  if (!objectJSON) return;
  window.plugin.bookmarks[mapping.field] = mapping.convertFunc ? mapping.convertFunc(JSON.parse(objectJSON)) : JSON.parse(objectJSON);
};

window.plugin.bookmarks.syncBkmrks = function () {
  window.plugin.bookmarks.loadLocal(window.plugin.bookmarks.KEY);

  window.plugin.bookmarks.updateQueue = window.plugin.bookmarks.bkmrksObj;
  window.plugin.bookmarks.storeLocal(window.plugin.bookmarks.UPDATE_QUEUE);

  window.plugin.bookmarks.delaySync();
  window.plugin.bookmarks.loadLocal(window.plugin.bookmarks.KEY); // switch back to active storage related to KEY
};

/** ************************************************************************************************************************************************************/
/** HIGHLIGHTER ************************************************************************************************************************************************/
/** ************************************************************************************************************************************************************/
window.plugin.bookmarks.highlight = function (data) {
  var guid = data.portal.options.ent[0];
  if (window.plugin.bookmarks.findByGuid(guid)) {
    data.portal.setStyle({ fillColor: 'red' });
  }
};

window.plugin.bookmarks.highlightRefresh = function (data) {
  if (window._current_highlighter === 'Bookmarked Portals') {
    if (
      data.action === 'sync' ||
      data.target === 'portal' ||
      (data.target === 'folder' && data.action === 'remove') ||
      (data.target === 'all' && data.action === 'import') ||
      (data.target === 'all' && data.action === 'reset') ||
      (data.target === 'all' && data.action === 'MPEswitch')
    ) {
      window.changePortalHighlights('Bookmarked Portals');
    }
  }
};

/** ************************************************************************************************************************************************************/
/** BOOKMARKED PORTALS LAYER ***********************************************************************************************************************************/
/** ************************************************************************************************************************************************************/
window.plugin.bookmarks.addAllStars = function () {
  var list = window.plugin.bookmarks.bkmrksObj.portals;

  for (var idFolders in list) {
    for (var idBkmrks in list[idFolders]['bkmrk']) {
      var latlng = list[idFolders]['bkmrk'][idBkmrks].latlng.split(',');
      var guid = list[idFolders]['bkmrk'][idBkmrks].guid;
      var lbl = list[idFolders]['bkmrk'][idBkmrks].label;
      window.plugin.bookmarks.addStar(guid, latlng, lbl);
    }
  }
};

window.plugin.bookmarks.resetAllStars = function () {
  for (const guid in window.plugin.bookmarks.starLayers) {
    var starInLayer = window.plugin.bookmarks.starLayers[guid];
    window.plugin.bookmarks.starLayerGroup.removeLayer(starInLayer);
    delete window.plugin.bookmarks.starLayers[guid];
  }
  window.plugin.bookmarks.addAllStars();
  console.log('resetAllStars done');
};

window.plugin.bookmarks.addStar = function (guid, latlng, lbl) {
  var star = L.marker(latlng, {
    title: lbl,
    icon: L.icon({
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAoCAMAAACo9wirAAAAzFBMVEXbuTR9YwDd0T+ulyry2VDt53/s5Jv34a+tmUbJtGRtVwAtJADg14j304viyIZeSwDXyH5IOQD07JLPvnhqVQBuWACmkjpgTQBxWwC4p1WchikRDQCPdxeBaAQTDwADAgAOCwAAAAAAAAAAAAALCQAAAAAAAAAAAAD9+Jb97IT+3VT9+WH+0i3993D+80793Yr/yXL+5Tr+6XL+zEP/z2X+vSX+zB/+52L/qw393SX89xr9+yv/siP/vUf9+Dv+20P+rgH+xQv+vgH+twNAe/b8AAAAKHRSTlPywvLj+vn4/OLrqFb0/PSS8Hb77meB4FGX5t1A2dUkEy8HDQoaAwEAoclaPQAAAo1JREFUeF5VkeeyozAMRrPphdwkdIxpBu7SSe/llvd/p5VxlMx+PxiMzhxJuPX3mc/PzzgIQwYJwyCGoyggwMuRav6BmKrLGgQBrBvUkuQkkSWLGh5DooX1UNWlXplDyp6kq5EXCqL1qlu9srpfIPeq7FmaIBCIA9WScyjznC/3XOZEEAsABIFBoH6GUrt9v5zPQEAXFoCiAWLPkUqon+8lIbl4kRwfmggABFZSXXh9PhbopUos1fWCBoAJnT4MCMMlZLHQE/Hed/wIFA3gkiSvqjLtK45tO/N+WlZVnhA7YgKAFZK83dGJM5v4rmFSonfaeWotoEcDhJqSVl06W0A5gviTGelWqTJzvZADcWjO11XVIzPbjzzGPFfT4bxWTD8SAANgtTrIQ8eF3QPmDOXDarWej/mUL+C0SgfU91gcR3TAj42BNQDMAMDpwBfzwjCi/cMJgNFMGGBIY5g+AACnrWl+NJay0+mRDhcAiDVdKsOnzJqZRFGoZo74SaYTXDPwzPnhUTw6dCSnaT2inUdRHD7GNgIxM/QUvrW6WfZ4ZFm3VRSiA4sFEEaOlBX7oij2EP4ssqlj413wHqq13uy/X9lvYAcbb5P3cGmd7b9/nvneZzWdNB0EAApN2RZvoNjCvfKb4IBQ+LTe7H5+RXabmjwFCISw6Xb3i8D2oxEgwMdkBgHF7xeEC/SF34yIAN90/LHdHb94QCB2REBsauj17cqB660eogAB8bOE4vgUsBiBt2J6ux6P19v0OQECb8V8y4G34D+AKwgoQEBQgMBLYSrL222pjHEFBN4KOl0up/wWUIAA/k5tNBg014gCBPB3+s5g0EwYYB2Bl8KyND9CAQJvgnmq6kYeXxHzDyATueNnvZcYAAAAAElFTkSuQmCC',
      iconAnchor: [15, 40],
      iconSize: [30, 40],
    }),
  });
  window.registerMarkerForOMS(star);
  star.on('spiderfiedclick', function () {
    window.renderPortalDetails(guid);
  });

  window.plugin.bookmarks.starLayers[guid] = star;
  star.addTo(window.plugin.bookmarks.starLayerGroup);
};

window.plugin.bookmarks.editStar = function (data) {
  if (data.target === 'portal') {
    if (data.action === 'add') {
      var guid = data.guid;
      var latlng = window.portals[guid].getLatLng();
      var lbl = window.portals[guid].options.data.title;
      window.plugin.bookmarks.addStar(guid, latlng, lbl);
    } else if (data.action === 'remove') {
      var starInLayer = window.plugin.bookmarks.starLayers[data.guid];
      window.plugin.bookmarks.starLayerGroup.removeLayer(starInLayer);
      delete window.plugin.bookmarks.starLayers[data.guid];
    }
  } else if ((data.target === 'all' && (data.action === 'import' || data.action === 'reset')) || (data.target === 'folder' && data.action === 'remove')) {
    window.plugin.bookmarks.resetAllStars();
  }
};

/** ************************************************************************************************************************************************************/

window.plugin.bookmarks.setupPortalsList = function () {
  function onBookmarkChanged(data) {
    console.log(data, data.target, data.guid);

    if (data.target === 'portal' && data.guid) {
      if (window.plugin.bookmarks.findByGuid(data.guid)) $('[data-list-bookmark="' + data.guid + '"]').addClass('favorite');
      else $('[data-list-bookmark="' + data.guid + '"]').removeClass('favorite');
    } else {
      $('[data-list-bookmark]').each(function (i, element) {
        var guid = element.getAttribute('data-list-bookmark');
        if (window.plugin.bookmarks.findByGuid(guid)) $(element).addClass('favorite');
        else $(element).removeClass('favorite');
      });
    }
  }

  window.addHook('pluginBkmrksEdit', onBookmarkChanged);
  window.addHook('pluginBkmrksSyncEnd', onBookmarkChanged);

  window.plugin.portalslist.fields.unshift({
    // insert at first column
    title: '',
    value: function (portal) {
      return portal.options.guid;
    }, // we store the guid, but implement a custom comparator so the list does sort properly without closing and reopening the dialog
    sort: function (guidA, guidB) {
      var infoA = window.plugin.bookmarks.findByGuid(guidA);
      var infoB = window.plugin.bookmarks.findByGuid(guidB);
      if (infoA && !infoB) return 1;
      if (infoB && !infoA) return -1;
      return 0;
    },
    format: function (cell, portal, guid) {
      $(cell).addClass('portal-list-bookmark').attr('data-list-bookmark', guid);

      // for some reason, jQuery removes event listeners when the list is sorted. Therefore we use DOM's addEventListener
      $('<span>')
        .appendTo(cell)[0]
        .addEventListener(
          'click',
          function () {
            if (window.plugin.bookmarks.findByGuid(guid)) {
              window.plugin.bookmarks.switchStarPortal(guid);
            } else {
              window.plugin.bookmarks.addPortalBookmarkByMarker(portal, true);
            }
          },
          false
        );

      if (window.plugin.bookmarks.findByGuid(guid)) cell.className += ' favorite';
    },
  });
};

window.plugin.bookmarks.setupContent = function () {
  window.plugin.bookmarks.htmlBoxTrigger =
    '<a id="bkmrksTrigger" class="open" onclick="window.plugin.bookmarks.switchStatusBkmrksBox(\'switch\');return false;" accesskey="v" title="[v]">[-] Bookmarks</a>';
  window.plugin.bookmarks.htmlBkmrksBox =
    '<div id="bookmarksBox">' +
    ' <div id="topBar">' +
    '  <a id="bookmarksMin" class="btn" onclick="window.plugin.bookmarks.switchStatusBkmrksBox(0);return false;" title="Minimize">-</a>' +
    '  <div class="handle">...</div>' +
    '  <a id="bookmarksDel" class="btn" onclick="window.plugin.bookmarks.deleteMode();return false;" title="Show/Hide \'X\' button">Show/Hide "X" button</a>' +
    ' </div>' +
    ' <div id="bookmarksTypeBar">' +
    '  <h5 class="bkmrk_maps current" onclick="window.plugin.bookmarks.switchPageBkmrksBox(this, 0);return false">Maps</h5>' +
    '  <h5 class="bkmrk_portals" onclick="window.plugin.bookmarks.switchPageBkmrksBox(this, 1);return false">Portals</h5>' +
    '  <div style="clear:both !important;"></div>' +
    ' </div>' +
    ' <div id="bkmrk_maps" class="bookmarkList current">' +
    '  <div class="addForm">' +
    '   <input placeholder="Insert label" />' +
    '   <a class="newMap" onclick="window.plugin.bookmarks.addElement(this, \'map\');return false;">+ Map</a>' +
    '   <a class="newFolder" onclick="window.plugin.bookmarks.addElement(this, \'folder\');return false;">+ Folder</a>' +
    '  </div>' +
    ' </div>' +
    ' <div id="bkmrk_portals" class="bookmarkList">' +
    '  <div class="addForm">' +
    '   <input placeholder="Insert label" />' +
    '   <a class="newFolder" onclick="window.plugin.bookmarks.addElement(this, \'folder\');return false;">+ Folder</a>' +
    '  </div>' +
    ' </div>' +
    ' <div style="border-bottom-width:1px;"></div>' +
    '</div>';

  window.plugin.bookmarks.htmlDisabledMessage = '<div title="Your browser do not support localStorage">Plugin Bookmarks disabled*.</div>';
  window.plugin.bookmarks.htmlStar =
    '<a class="bkmrksStar" accesskey="b" onclick="window.plugin.bookmarks.switchStarPortal();return false;" title="Save this portal in your bookmarks [b]"><span></span></a>';
  window.plugin.bookmarks.htmlMoveBtn =
    '<a id="bookmarksMove" class="btn" onclick="window.plugin.bookmarks.moveMode();return false;">Show/Hide "Move" button</a>';

  var actions = '';
  actions += '<a onclick="window.plugin.bookmarks.optReset();return false;">Reset bookmarks</a>';
  actions += '<a onclick="window.plugin.bookmarks.optCopy();return false;">Copy bookmarks</a>';
  actions += '<a onclick="window.plugin.bookmarks.optPaste();return false;">Paste bookmarks</a>';

  actions += '<a onclick="window.plugin.bookmarks.optImport();return false;">Import bookmarks</a>';
  actions += '<a onclick="window.plugin.bookmarks.optExport();return false;">Export bookmarks</a>';

  actions += '<a onclick="window.plugin.bookmarks.optRenameF();return false;">Rename Folder</a>';
  if (!window.isApp) {
    actions += '<a onclick="window.plugin.bookmarks.optBox(\'save\');return false;">Save box position</a>';
    actions += '<a onclick="window.plugin.bookmarks.optBox(\'reset\');return false;">Reset box position</a>';
  }
  window.plugin.bookmarks.htmlSetbox = '<div id="bkmrksSetbox">' + actions + '</div>';
};

/** ************************************************************************************************************************************************************/
window.plugin.bookmarks.initMPE = function () {
  window.plugin.mpe.setMultiProjects({
    namespace: 'bookmarks',
    title: 'Bookmarks for Maps and Portals',
    fa: 'fa-bookmark',
    defaultKey: 'plugin-bookmarks',
    func_setKey: function (newKey) {
      window.plugin.bookmarks.KEY_STORAGE = newKey;
      window.plugin.bookmarks.KEY.key = newKey;
    },
    func_pre: function () {
      // disable sync
      window.plugin.bookmarks.IsDefaultStorageKey = false;
    },
    func_post: function () {
      // Delete all Markers (stared portals)
      for (var guid in window.plugin.bookmarks.starLayers) {
        var starInLayer = window.plugin.bookmarks.starLayers[guid];
        window.plugin.bookmarks.starLayerGroup.removeLayer(starInLayer);
        delete window.plugin.bookmarks.starLayers[guid];
      }
      // Create Storage if not exist
      window.plugin.bookmarks.createStorage();
      // Load Storage
      window.plugin.bookmarks.loadStorage();
      // window.plugin.bookmarks.saveStorage();

      // Delete and Regenerate Bookmark Lists
      window.plugin.bookmarks.refreshBkmrks();

      // Add Markers (stared portals)
      window.plugin.bookmarks.addAllStars();

      // Refresh Highlighter
      window.plugin.bookmarks.highlightRefresh({ target: 'all', action: 'MPEswitch' });

      // enable sync if default storage
      window.plugin.bookmarks.IsDefaultStorageKey = this.defaultKey === this.currKey;
    },
  });
};

/** ************************************************************************************************************************************************************/

var setup = function () {
  window.plugin.bookmarks.isSmart = window.isSmartphone();

  // HOOKS:
  // - pluginBkmrksEdit:    fired when a bookmarks/folder is removed, added or sorted,
  //                        also when a folder is opened/closed.
  // - pluginBkmrksOpenOpt: fired when the "Bookmarks Options" panel is opened
  //                        (you can add new options);
  // - pluginBkmrksSyncEnd: fired when the sync is finished;

  // If the storage not exists or is a old version
  window.plugin.bookmarks.createStorage();
  window.plugin.bookmarks.upgradeToNewStorage();

  // Load data from localStorage
  window.plugin.bookmarks.loadStorage();
  window.plugin.bookmarks.loadStorageBox();
  window.plugin.bookmarks.setupContent();
  window.plugin.bookmarks.setupCSS();

  if (!window.plugin.bookmarks.isSmart) {
    $('body').append(window.plugin.bookmarks.htmlBoxTrigger + window.plugin.bookmarks.htmlBkmrksBox);
    $('#bookmarksBox').draggable({ handle: '.handle', containment: 'window' });
    $(
      '#bookmarksBox #bookmarksMin , #bookmarksBox ul li, #bookmarksBox ul li a, #bookmarksBox ul li a span, #bookmarksBox h5, #bookmarksBox .addForm a'
    ).disableSelection();
    $('#bookmarksBox').css({ top: window.plugin.bookmarks.statusBox.pos.x, left: window.plugin.bookmarks.statusBox.pos.y });
  } else {
    $('body').append(window.plugin.bookmarks.htmlBkmrksBox);
    $('#bookmarksBox').css('display', 'none').addClass('mobile');

    if (window.useAppPanes()) window.app.addPane('plugin-bookmarks', 'Bookmarks', 'ic_action_star');
    window.addHook('paneChanged', window.plugin.bookmarks.onPaneChanged);
  }
  IITC.toolbox.addButton({
    label: 'Bookmarks Opt',
    action: window.plugin.bookmarks.manualOpt,
  });
  IITC.toolbox.addButton({
    label: 'Auto draw',
    title: 'Draw lines/triangles between bookmarked portals [q]',
    action: window.plugin.bookmarks.dialogDrawer,
    accesskey: 'q',
  });

  if (window.plugin.bookmarks.isSmart) {
    // $('#bookmarksBox.mobile #topBar').prepend(window.plugin.bookmarks.htmlCallSetBox+window.plugin.bookmarks.htmlCalldrawBox); // wonk in progress
    $('#bookmarksBox.mobile #topBar').append(window.plugin.bookmarks.htmlMoveBtn);
  }

  window.plugin.bookmarks.loadList('maps');
  window.plugin.bookmarks.loadList('portals');
  window.plugin.bookmarks.jquerySortableScript();

  if (window.plugin.bookmarks.statusBox['show'] === 0) {
    window.plugin.bookmarks.switchStatusBkmrksBox(0);
  }
  if (window.plugin.bookmarks.statusBox['page'] === 1) {
    $('#bookmarksBox h5.bkmrk_portals').trigger('click');
  }

  window.addHook('portalSelected', window.plugin.bookmarks.onPortalSelected);
  window.addHook('portalDetailsUpdated', window.plugin.bookmarks.onPortalSelected);
  window.addHook('search', window.plugin.bookmarks.onSearch);

  // Sync
  window.addHook('pluginBkmrksEdit', window.plugin.bookmarks.syncBkmrks);
  window.plugin.bookmarks.registerFieldForSyncing();

  // Highlighter - bookmarked portals
  window.addHook('pluginBkmrksEdit', window.plugin.bookmarks.highlightRefresh);
  window.addHook('pluginBkmrksSyncEnd', window.plugin.bookmarks.highlightRefresh);
  window.addPortalHighlighter('Bookmarked Portals', window.plugin.bookmarks.highlight);

  // Layer - Bookmarked portals
  window.plugin.bookmarks.starLayerGroup = L.layerGroup();
  window.layerChooser.addOverlay(window.plugin.bookmarks.starLayerGroup, 'Bookmarked Portals', { default: false });
  window.plugin.bookmarks.addAllStars();
  window.addHook('pluginBkmrksEdit', window.plugin.bookmarks.editStar);
  window.addHook('pluginBkmrksSyncEnd', window.plugin.bookmarks.resetAllStars);

  if (window.plugin.portalslist) {
    window.plugin.bookmarks.setupPortalsList();
  }
  // Initilaize MPE-Support only if MPE-Module is available
  if (window.plugin.mpe !== undefined) {
    window.plugin.bookmarks.initMPE();
  }
};
// moved setupCSS to the end to improve readability of built script
window.plugin.bookmarks.setupCSS = function () {
  $('<style>').prop('type', 'text/css').html('\
/* hide when printing */\
@media print {\
	#bkmrksTrigger { display: none !important; }\
}\
\
\
#bookmarksBox *{\
	display:block;\
	padding:0;\
	margin:0;\
	width:auto;\
	height:auto;\
	font-family:Verdana,Geneva,sans-serif;\
	font-size:13px;\
	line-height:22px;\
	text-indent:0;\
	text-decoration:none;\
	-webkit-box-sizing:border-box;\
	-moz-box-sizing:border-box;\
	box-sizing:border-box;\
}\
\
#bookmarksBox{\
	display:block;\
	position:absolute !important;\
	z-index:4001;\
	top:100px;\
	left:100px;\
	width:231px;\
	height:auto;\
	overflow:hidden;\
}\
#bookmarksBox .addForm,\
#bookmarksBox #bookmarksTypeBar,\
#bookmarksBox h5{\
	height:28px;\
	overflow:hidden;\
	color:#fff;\
	font-size:14px;\
}\
#bookmarksBox #topBar{\
	height:15px !important;\
}\
#bookmarksBox #topBar *{\
	height: 14px !important;\
}\
#bookmarksBox #topBar *{\
	float:left !important;\
}\
#bookmarksBox .handle{\
	width:80%;\
	text-align:center;\
	color:#fff;\
	line-height:6px;\
	cursor:move;\
}\
#bookmarksBox #topBar .btn{\
	display:block;\
	width:10%;\
	cursor:pointer;\
	color:#20a8b1;\
\
	font-weight:bold;\
	text-align:center;\
	line-height:13px;\
	font-size:18px;\
}\
\
#bookmarksBox #topBar #bookmarksDel{\
	overflow:hidden;\
	text-indent:-999px;\
	background:#B42E2E;\
}\
\
#bookmarksBox #topBar #bookmarksMin:hover{\
	color:#ffce00;\
}\
#bookmarksBox #bookmarksTypeBar{\
	clear:both;\
}\
#bookmarksBox h5{\
	padding:4px 0 23px;\
	width:50%;\
	height:93px !important;\
	text-align:center;\
	color:#788;\
}\
#bookmarksBox h5.current{\
	cursor:default;\
	background:0;\
	color:#fff !important;\
}\
#bookmarksBox h5:hover{\
	color:#ffce00;\
	background:rgba(0,0,0,0);\
}\
#bookmarksBox #topBar,\
#bookmarksBox .addForm,\
#bookmarksBox #bookmarksTypeBar,\
#bookmarksBox .bookmarkList li.bookmarksEmpty,\
#bookmarksBox .bookmarkList li.bkmrk a,\
#bookmarksBox .bookmarkList li.bkmrk:hover{\
	background-color:rgba(8,48,78,.85);\
}\
#bookmarksBox h5,\
#bookmarksBox .bookmarkList li.bkmrk:hover .bookmarksLink,\
#bookmarksBox .addForm *{\
	background:rgba(0,0,0,.3);\
}\
#bookmarksBox .addForm *{\
	display:block;\
	float:left;\
	height:28px !important;\
}\
#bookmarksBox .addForm a{\
	cursor:pointer;\
	color:#20a8b1;\
	font-size:12px;\
	width:35%;\
	text-align:center;\
	line-height:20px;\
	padding:4px 0 23px;\
}\
#bookmarksBox .addForm a:hover{\
	background:#ffce00;\
	color:#000;\
	text-decoration:none;\
}\
#bookmarksBox .addForm input{\
	font-size:11px !important;\
	color:#ffce00;\
	height:28px;\
	padding:4px 8px 1px;\
	line-height:12px;\
	font-size:12px;\
}\
#bookmarksBox #bkmrk_portals .addForm input{\
	width:65%;\
}\
#bookmarksBox #bkmrk_maps .addForm input{\
	width:42%;\
}\
#bookmarksBox #bkmrk_maps .addForm a{\
	width:29%;\
}\
#bookmarksBox .addForm input:hover,\
#bookmarksBox .addForm input:focus{\
	outline:0;\
	background:rgba(0,0,0,.6);\
}\
#bookmarksBox .bookmarkList > ul{\
	clear:both;\
	list-style-type:none;\
	color:#fff;\
	overflow:hidden;\
	overflow-y:auto;\
	max-height:580px;\
}\
#bookmarksBox .sortable-placeholder{\
	background:rgba(8,48,78,.55);\
	box-shadow:inset 1px 0 0 #20a8b1;\
}\
#bookmarksBox .ui-sortable-helper{\
	border-top-width:1px;\
}\
#bookmarksBox .bookmarkList{\
	display:none;\
}\
#bookmarksBox .bookmarkList.current{\
	display:block;\
}\
#bookmarksBox h5,\
#bookmarksBox .addForm *,\
#bookmarksBox ul li.bkmrk,\
#bookmarksBox ul li.bkmrk a{\
	height:22px;\
}\
#bookmarksBox h5,\
#bookmarksBox ul li.bkmrk a{\
	overflow:hidden;\
	cursor:pointer;\
	float:left;\
}\
#bookmarksBox ul .bookmarksEmpty{\
	text-indent:27px;\
	color:#eee;\
}\
#bookmarksBox ul .bookmarksRemoveFrom{\
	width:10%;\
	text-align:center;\
	color:#fff;\
}\
#bookmarksBox ul .bookmarksLink{\
	width:90%;\
	padding:0 10px 0 8px;\
	color:#ffce00;\
}\
#bookmarksBox ul .bookmarksLink.selected{\
	color:#03fe03;\
}\
#bookmarksBox ul .othersBookmarks .bookmarksLink{\
	width:90%;\
}\
#bookmarksBox ul .bookmarksLink:hover{\
	color:#03fe03;\
}\
#bookmarksBox ul .bookmarksRemoveFrom:hover{\
	color:#fff;\
	background:#e22 !important;\
}\
\
/*---- UI border -----*/\
#bookmarksBox,\
#bookmarksBox *{\
	border-color:#20a8b1;\
	border-style:solid;\
	border-width:0;\
}\
#bookmarksBox #topBar,\
#bookmarksBox ul .bookmarkFolder{\
	border-top-width:1px;\
}\
\
#bookmarksBox #topBar,\
#bookmarksBox #bookmarksTypeBar,\
#bookmarksBox .addForm,\
#bookmarksBox ul .bookmarkFolder .folderLabel,\
#bookmarksBox ul li.bkmrk a {\
	border-bottom-width:1px;\
}\
#bookmarksBox ul .bookmarkFolder{\
	border-right-width:1px;\
	border-left-width:1px;\
}\
#bookmarksBox #topBar *,\
#bookmarksBox #bookmarksTypeBar *,\
#bookmarksBox .addForm *,\
#bookmarksBox ul li.bkmrk{\
	border-left-width:1px;\
}\
#bookmarksBox #topBar,\
#bookmarksBox #bookmarksTypeBar,\
#bookmarksBox .addForm,\
#bookmarksBox ul .bookmarksRemoveFrom{\
	border-right-width:1px;\
}\
#bookmarksBox ul .bookmarkFolder.othersBookmarks li.bkmrk,\
#bookmarksBox ul .bookmarkFolder .folderLabel .bookmarksRemoveFrom{\
	border-left-width:0;\
}\
#bkmrksTrigger{\
	display:block;\
	position:absolute;\
	overflow:hidden;\
	top:0;\
	left:277px;\
	width:47px;\
	margin-top:-36px;\
	height:64px;\
	height:0;\
	cursor:pointer;\
	z-index:2999;\
	background-position:center bottom;\
	background-repeat:no-repeat;\
	transition:margin-top 100ms ease-in-out;\
	text-indent:-100%;\
	text-decoration:none;\
	text-align:center;\
}\
#bkmrksTrigger:hover{\
	margin-top:0;\
}\
.portal-list-bookmark span {\
	display:inline-block;\
	margin: -3px;\
	width:16px;\
	height:15px;\
	overflow:hidden;\
	background-repeat:no-repeat;\
	cursor:pointer;\
}\
#bkmrksTrigger, .bkmrksStar span, .portal-list-bookmark span {\
	background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC8AAABPCAMAAABMDWzEAAAANlBMVEX/////zgD/zgD///////8Aru7/zgAAru4TtPAAAADA7PtAwvLk9/6b3/n///8Aru510/b/zgDZKp6YAAAACnRSTlOAxo5FtDw9mPoA9GJiegAAAklJREFUeF6dle26ozAIhFO1NkK+vP+b3WbBJRwM7dn5lad9BweoaThI63Z42hfmLn4rLv84d8WvpWxe+fNcFL+VUtzy57kLv67lrbDOqu/nW8tfQ1i3MmjbfrKPc9BjCYfiy2qjjNoDZRfcaBnxnl8Mm8KN4bFzv6q6lVT/P369+DBZFmsZ+LAmWbHllz7XB/OBwDDhF1rVIvwFhHt+vw4dqbViKdC0wHySSsE3e/FxpHPpAo+vUehUSCk7PBuYTpCUw/JsAIoipzlfUTHimPGNMujQ7LA86sSqm2x4BFXbOjTPSWJFxtgpbRTFd+VITdPGQG3b8hArCbm7n9vVefqZxT8I0G2Y+Yi4XFNy+Jqpn695WlP6ksdWSJB9PmJrkMqolADyjIdyrzSrD1Pc8lND8vrNFvfnkw3u8NYAn+ev+M/7iorPH3n8Jd9+mT+b8fg8EBZb+o4n+n0gx4yPMp5MZ3LkW77XJAaZZkdmPtv7JGG9EfLLrnkS3DjiRWseej6OrnXd0ub/hQbftIPHCnfzjDz6sXjy3seKoBqXG97yqiCgmFv198uNYy7XptHlr8aHcbk8NW5veMtrg+A1Ojy3oCeLDs9zgfEHEi2vu03INu4Y/fk3OVOo6N2f8u5IqDs+NvMaYOJQaHj5rut1vGIda/zk5dmdfh7H8XypUJpP0luNne56xnEdildRRPyIfMMDSnGWhEJQvEQZittQwoONYkP946OOMnsERuZNFKMXOYiXkXsO4U0UL1QwffqPCH4Us4xgovih/gBs1LqNE0afwAAAAABJRU5ErkJggg==);\
}\
.bkmrksStar span{\
	display:inline-block;\
	float:left;\
	margin:3px 1px 0 4px;\
	width:16px;\
	height:15px;\
	overflow:hidden;\
	background-repeat:no-repeat;\
}\
.bkmrksStar span, .bkmrksStar.favorite:focus span{\
	background-position:left top;\
}\
.bkmrksStar:focus span, .bkmrksStar.favorite span, .portal-list-bookmark.favorite span{\
	background-position:right top;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder{\
	overflow:hidden;\
	margin-top:-1px;\
	height:auto;\
	background:rgba(8,58,78,.7);\
}\
#bookmarksBox .bookmarkList ul li.sortable-placeholder{\
	box-shadow:inset -1px 0 0 #20a8b1,inset 1px 0 0 #20a8b1,0 -1px 0 #20a8b1;\
	background:rgba(8,58,78,.9);\
}\
#bookmarksBox .bookmarkList .bkmrk.ui-sortable-helper{\
	border-right-width:1px;\
	border-left-width:1px !important;\
}\
#bookmarksBox .bookmarkList ul li ul li.sortable-placeholder{\
	height:23px;\
	box-shadow:inset 0 -1px 0 #20a8b1,inset 1px 0 0 #20a8b1;\
}\
\
#bookmarksBox .bookmarkList ul li.bookmarkFolder.ui-sortable-helper,\
#bookmarksBox .bookmarkList ul li.othersBookmarks ul li.sortable-placeholder{\
	box-shadow:inset 0 -1px 0 #20a8b1;\
}\
\
#bookmarksBox #topBar #bookmarksDel,\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel:hover .bookmarksRemoveFrom,\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel:hover .bookmarksAnchor{\
	border-bottom-width:1px;\
}\
\
/*---------*/\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span,\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span,\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span > span,\
#bookmarksBox .bookmarkList .triangle{\
	width:0;\
	height:0;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel{\
	overflow:visible;\
	height:25px;\
	cursor:pointer;\
	background:#069;\
	text-indent:0;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > *{\
	height:25px;\
	float:left;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor{\
	line-height:25px;\
	color:#fff;\
	width:90%;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span{\
	float:left;\
	border-width:5px 0 5px 7px;\
	border-color:transparent transparent transparent white;\
	margin:7px 7px 0 6px;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel .bookmarksAnchor span{\
	margin:9px 5px 0 5px;\
	border-width:7px 5px 0 5px;\
	border-color:white transparent transparent transparent;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span,\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span > span{\
	display:none;\
	border-width:0 12px 10px 0;\
	border-color:transparent #20a8b1 transparent transparent;\
	margin:-20px 0 0;\
	position:relative;\
	top:21px;\
	left:219px;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel > span > span{\
	top:18px;\
	left:0;\
	border-width:0 10px 9px 0;\
	border-color:transparent #069 transparent transparent;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel > span,\
#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel > span > span{\
	display:block;\
	display:none;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder.open .folderLabel:hover > span > span{\
	border-color:transparent #036 transparent transparent;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel:hover .bookmarksAnchor{\
	background:#036;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder ul{\
	display:none;\
	margin-left:10%;\
}\
#bookmarksBox .bookmarkList .bookmarkFolder.open ul{\
	display:block;\
	min-height:22px;\
}\
#bookmarksBox .bookmarkFolder.othersBookmarks ul{\
	margin-left:0;\
}\
\
/*---- Width for deleteMode -----*/\
#bookmarksBox .bookmarksRemoveFrom{\
	display:none !important;\
}\
#bookmarksBox.deleteMode .bookmarksRemoveFrom{\
	display:block !important;\
}\
\
#bookmarksBox .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor,\
#bookmarksBox ul .bookmarksLink,\
#bookmarksBox ul .othersBookmarks .bookmarksLink{\
	width:100% !important;\
}\
\
#bookmarksBox.deleteMode .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor,\
#bookmarksBox.deleteMode ul .bookmarksLink,\
#bookmarksBox.deleteMode ul .othersBookmarks .bookmarksLink{\
	width:90% !important;\
}\
\
/**********************************************\
	MOBILE\
**********************************************/\
#bookmarksBox.mobile{\
	position:absolute !important;\
	width: 100% !important;\
	height: 100% !important;\
	top: 0 !important;\
	left: 0 !important;\
	margin: 0 !important;\
	padding: 0 !important;\
	border: 0 !important;\
	background: transparent !important;\
	overflow:auto !important;\
}\
#bookmarksBox.mobile .bookmarkList ul,\
#bookmarksBox.mobile .bookmarkList ul li,\
#bookmarksBox.mobile .bookmarkList.current,\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder.open ul{\
	width:100% !important;\
	display:block !important;\
}\
#bookmarksBox.mobile *{\
	box-shadow:none !important;\
	border-width:0 !important;\
}\
#bookmarksBox.mobile #topBar #bookmarksMin,\
#bookmarksBox.mobile #topBar .handle{\
	display:none !important;\
}\
\
#bookmarksBox.mobile #bookmarksTypeBar h5{\
	cursor:pointer;\
	text-align:center;\
	float:left;\
	width:50%;\
	height:auto !important;\
	padding:7px 0;\
}\
#bookmarksBox.mobile #bookmarksTypeBar h5.current{\
	cursor:default;\
	color:#fff;\
}\
#bookmarksBox.mobile #bookmarksTypeBar,\
#bookmarksBox.mobile .bookmarkList .addForm{\
	border-bottom:1px solid #20a8b1 !important;\
}\
#bookmarksBox.mobile .bookmarkList ul li ul li.bkmrk,\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder .folderLabel{\
	height:36px !important;\
	clear:both;\
}\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder .folderLabel a,\
#bookmarksBox.mobile .bookmarkList ul li ul li.bkmrk a{\
	background:none;\
	padding:7px 0;\
	height:auto;\
	box-shadow:inset 0 1px 0 #20a8b1 !important;\
}\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder a.bookmarksRemoveFrom,\
#bookmarksBox.mobile .bookmarkList li.bkmrk a.bookmarksRemoveFrom{\
	box-shadow:inset 0 1px 0 #20a8b1,inset -1px 0 0 #20a8b1 !important;\
	width:10%;\
	background:none !important;\
}\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder a.bookmarksAnchor,\
#bookmarksBox.mobile .bookmarkList li.bkmrk a.bookmarksLink{\
	text-indent:10px;\
	height:36px;\
	line-height:24px;\
	overflow:hidden;\
}\
#bookmarksBox.mobile .bookmarkList ul li.bookmarkFolder ul{\
	margin-left:0 !important;\
}\
#bookmarksBox.mobile .bookmarkList > ul{\
	border-bottom:1px solid #20a8b1 !important;\
}\
\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder.othersBookmarks  ul{\
	border-top:5px solid #20a8b1 !important;\
}\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder,\
#bookmarksBox.mobile .bookmarkList li.bkmrk{\
	box-shadow:inset 0 1px 0 #20a8b1, 1px 0 0 #20a8b1, -1px 1px 0 #20a8b1 !important;\
}\
#bookmarksBox.mobile .bookmarkList > ul{\
	max-height:none;\
/*	width:85% !important;*/\
}\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder .folderLabel{\
	box-shadow:0 1px 0 #20a8b1 !important;\
}\
#bookmarksBox.mobile .bookmarkList ul li.bookmarkFolder ul{\
	width:90% !important;\
	margin-left:10% !important;\
}\
#bookmarksBox.mobile .bookmarkList ul li.bookmarkFolder.othersBookmarks ul{\
	width:100% !important;\
	margin-left:0% !important;\
}\
#bookmarksBox.mobile{\
	margin-bottom:5px !important;\
}\
#bookmarksBox.mobile #bookmarksTypeBar{\
	height:auto;\
}\
#bookmarksBox.mobile .addForm,\
#bookmarksBox.mobile .addForm *{\
	height:35px !important;\
	padding:0;\
}\
#bookmarksBox.mobile .addForm a{\
	line-height:37px;\
}\
\
#bookmarksBox.mobile .addForm a{\
/*	width:25% !important;*/\
}\
#bookmarksBox.mobile .addForm input{\
/*	width:50% !important;*/\
	text-indent:10px;\
}\
#bookmarksBox.mobile #bkmrk_portals .addForm input{\
/*	width:75% !important;*/\
}\
#bookmarksBox.mobile #bookmarksTypeBar h5,\
#bookmarksBox.mobile .bookmarkList .addForm a{\
	box-shadow:-1px 0 0 #20a8b1 !important;\
}\
#bookmarksBox.mobile .bookmarkList li.bookmarkFolder ul{\
	display:none !important;\
	min-height:37px !important;\
}\
#updatestatus .bkmrksStar{\
	float:left;\
	margin:-19px 0 0 -5px;\
	padding:0 3px 1px 4px;\
	background:#262c32;\
}\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span,\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span,\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span > span,\
#bookmarksBox.mobile .bookmarkList .triangle{\
	width:0 !important;\
	height:0 !important;\
}\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel .bookmarksAnchor span{\
	float:left !important;\
	border-width:5px 0 5px 7px !important;\
	border-color:transparent transparent transparent white !important;\
	margin:7px 3px 0 13px !important;\
}\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder.open .folderLabel .bookmarksAnchor span{\
	margin:9px 1px 0 12px !important;\
	border-width:7px 5px 0 5px !important;\
	border-color:white transparent transparent transparent !important;\
}\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span,\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span > span{\
	display:none !important;\
	border-width:0 12px 10px 0 !important;\
	border-color:transparent #20a8b1 transparent transparent !important;\
	margin:-20px 0 0 100% !important;\
	position:relative !important;\
	top:21px !important;\
	left:-10px !important;\
}\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder .folderLabel > span > span{\
	top:18px !important;\
	left:0 !important;\
	border-width:0 10px 9px 0 !important;\
	border-color:transparent #069 transparent transparent !important;\
}\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder.open .folderLabel > span,\
#bookmarksBox.mobile .bookmarkList .bookmarkFolder.open .folderLabel > span > span{\
	display:block !important;\
}\
\
/**********************************************\
	DIALOG BOX\
**********************************************/\
/*---- Auto Drawer -----*/\
#bkmrksAutoDrawer,\
#bkmrksAutoDrawer p,\
#bkmrksAutoDrawer a{\
	display:block;\
	padding:0;\
	margin:0;\
}\
#bkmrksAutoDrawer .bookmarkFolder{\
	margin-bottom:4px;\
	border:1px solid #20a8b1;\
}\
#bkmrksAutoDrawer .folderLabel{\
	background:#069;\
	padding:4px 0;\
	color:#fff;\
}\
#bkmrksAutoDrawer .bookmarkFolder div{\
	border-top:1px solid #20a8b1;\
	padding:6px 0;\
	background:rgba(0,0,0,0.3);\
}\
#bkmrksAutoDrawer .bookmarkFolder#idOthers .folderLabel{\
	display:none;\
}\
#bkmrksAutoDrawer .bookmarkFolder#idOthers div{\
	display:block;\
	border-top:none;\
}\
#bkmrksAutoDrawer a{\
	text-indent:10px;\
	padding:2px 0;\
}\
#bkmrksAutoDrawer .longdistance {\
	color: #FFCC00;\
	font-weight: bold;\
	border-bottom: 1px dashed currentColor;\
}\
#bkmrksAutoDrawer .bookmarkFolder div {\
	display:none;\
}\
#bkmrksAutoDrawer a.bkmrk.selected{\
	color:#03dc03;\
}\
\
/*---- Options panel -----*/\
#bkmrksSetbox a{\
	display:block;\
	color:#ffce00;\
	border:1px solid #ffce00;\
	padding:3px 0;\
	margin:10px auto;\
	width:80%;\
	text-align:center;\
	background:rgba(8,48,78,.9);\
}\
#bkmrksSetbox a.disabled,\
#bkmrksSetbox a.disabled:hover{\
	color:#666;\
	border-color:#666;\
	text-decoration:none;\
}\
/*---- Opt panel - copy -----*/\
.ui-dialog-bkmrksSet-copy textarea{\
	width:96%;\
	height:120px;\
	resize:vertical;\
}\
\
\
/*--- Other Opt css ---*/\
#bookmarksBox.mobile a.bookmarksMoveIn{\
	display:none !important;\
}\
\
#bookmarksBox.mobile .bookmarkList ul li ul li.bkmrk a.bookmarksMoveIn{\
	background:none !important;\
	text-align:center;\
	color:#fff;\
	box-shadow: inset 0 1px 0 #20A8B1,inset -1px 0 0 #20A8B1 !important;\
	width:10%;\
}\
\
#bookmarksBox.mobile.moveMode a.bookmarksMoveIn{\
	display:block !important;\
}\
\
#bookmarksBox.moveMode ul .bookmarksLink,\
#bookmarksBox.moveMode ul .othersBookmarks .bookmarksLink{\
	width:90% !important;\
}\
.bookmarksDialog h3{\
	text-transform:capitalize;margin-top:10px;\
}\
.bookmarksDialog .bookmarkFolder{\
	margin-bottom:4px;\
	border:1px solid #20a8b1;\
	background:#069;\
	padding:4px 10px;\
	color:#fff;\
	cursor:pointer;\
}\
.bookmarksDialog .bookmarkFolder:hover{\
	text-decoration:underline;\
}\
\
#bookmarksBox.mobile #topBar .btn{\
	width:100%;height:45px !important;\
	font-size:13px;\
	color:#fff;\
	font-weight:normal;\
	padding-top:17px;\
	text-indent:0 !important;\
}\
#bookmarksBox.mobile .btn{\
	width:50% !important;\
	background:#222;\
}\
#bookmarksBox.mobile .btn.left{\
	border-right:1px solid #20a8b1 !important;\
}\
#bookmarksBox.mobile .btn#bookmarksMove{\
	background:#B42E2E;\
}\
#bkmrksSetbox{\
	text-align:center;\
}\
').appendTo('head');
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

