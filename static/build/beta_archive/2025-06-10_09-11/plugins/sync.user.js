// ==UserScript==
// @author         xelio
// @name           IITC plugin: Sync
// @category       Misc
// @version        0.5.3.20250610.091142
// @description    Sync data between clients via Google Drive API. Only syncs data from specific plugins (currently: Keys, Bookmarks, Uniques). Sign in via the 'Sync' link. Data is synchronized every 3 minutes.
// @id             sync
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/sync.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/sync.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/sync.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-06-10-091142';
plugin_info.pluginId = 'sync';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global IITC -- eslint */

var changelog = [
  {
    version: '0.5.3',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.5.2',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.5.1',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
];

// //////////////////////////////////////////////////////////////////////
// Notice for developers:
//
// You should treat the data stored on Google Drive API as volatile.
// Because if there are change in Google API client ID, Google will
// treat it as another application and could not access the data created
// by old client ID. Store any important data locally and only use this
// plugin as syncing function.
//
// Google Drive API reference
// https://developers.google.com/drive/api/v3/about-sdk
// //////////////////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.sync = function () {};

window.plugin.sync.parentFolderID = null;
window.plugin.sync.parentFolderIDrequested = false;
window.plugin.sync.KEY_UUID = { key: 'plugin-sync-data-uuid', field: 'uuid' };

// Each client has an unique UUID, to identify remote data is updated by other clients or not
window.plugin.sync.uuid = null;

window.plugin.sync.dialogHTML = null;
window.plugin.sync.authorizer = null;

// Store registered CollaborativeMap
window.plugin.sync.registeredPluginsFields = null;
window.plugin.sync.logger = null;

window.plugin.sync.checkInterval = 3 * 60 * 1000; // update data every 3 minutes

// Other plugin call this function to push update to Google Drive API
// example:
// plugin.sync.updateMap('keys', 'keysdata', ['guid1', 'guid2', 'guid3'])
// Which will push plugin.keys.keysdata['guid1'] etc. to Google Drive API
window.plugin.sync.updateMap = function (pluginName, fieldName, keyArray) {
  var registeredMap = window.plugin.sync.registeredPluginsFields.get(pluginName, fieldName);
  if (!registeredMap) return false;
  registeredMap.updateMap(keyArray);
};

// Other plugin call this to register a field as CollaborativeMap to sync with Google Drive API
// example: plugin.sync.registerMapForSync('keys', 'keysdata', plugin.keys.updateCallback, plugin.keys.initializedCallback)
// which register plugin.keys.keysdata
//
// updateCallback function format: function(pluginName, fieldName, null, fullUpdated)
// updateCallback will be fired when local or remote pushed update to Google Drive API
// fullUpdated is true when remote update occur during local client offline, all data is replaced by remote data
// the third parameter is always null for compatibility
//
// initializedCallback function format: function(pluginName, fieldName)
// initializedCallback will be fired when the storage finished initialize and good to use
window.plugin.sync.registerMapForSync = function (pluginName, fieldName, callback, initializedCallback) {
  var options, registeredMap;
  options = {
    pluginName: pluginName,
    fieldName: fieldName,
    callback: callback,
    initializedCallback: initializedCallback,
    authorizer: window.plugin.sync.authorizer,
    uuid: window.plugin.sync.uuid,
  };
  registeredMap = new window.plugin.sync.RegisteredMap(options);
  window.plugin.sync.registeredPluginsFields.add(registeredMap);
};

// RegisteredMap
// Create a file named pluginName[fieldName] in folder specified by authorizer
// The file use as document with JSON to store the data and uuid of last update client
// callback will called when any local/remote update happen
// initializedCallback will called when storage initialized and good to use.
window.plugin.sync.RegisteredMap = function (options) {
  this.pluginName = options['pluginName'];
  this.fieldName = options['fieldName'];
  this.callback = options['callback'];
  this.initializedCallback = options['initializedCallback'];
  this.authorizer = options['authorizer'];
  this.uuid = options['uuid'];

  this.intervalID = null;
  this.map = null;
  this.lastUpdateUUID = null;
  this.dataStorage = null;

  this.forceFileSearch = false;
  this.initializing = false;
  this.initialized = false;
  this.failed = false;

  this.initialize = this.initialize.bind(this);
  this.loadDocument = this.loadDocument.bind(this);
};

window.plugin.sync.RegisteredMap.prototype.updateMap = function (keyArray) {
  var _this = this;
  try {
    this.lastUpdateUUID = this.uuid;

    $.each(keyArray, function (ind, key) {
      var value = window.plugin[_this.pluginName][_this.fieldName][key];
      if (typeof value !== 'undefined') {
        _this.map[key] = value;
      } else {
        delete _this.map[key];
      }
    });
  } finally {
    _this.dataStorage.saveFile(_this.prepareFileData());
  }
};

window.plugin.sync.RegisteredMap.prototype.isUpdatedByOthers = function () {
  var remoteUUID = this.lastUpdateUUID.toString();
  return remoteUUID !== '' && remoteUUID !== this.uuid;
};

window.plugin.sync.RegisteredMap.prototype.getFileName = function () {
  return this.pluginName + '[' + this.fieldName + ']';
};

window.plugin.sync.RegisteredMap.prototype.initFile = function (callback) {
  var assignIdCallback, failedCallback, _this;
  _this = this;

  assignIdCallback = function () {
    _this.forceFileSearch = false;
    if (callback) callback();
  };

  failedCallback = function () {
    _this.initializing = false;
    _this.failed = true;
    window.plugin.sync.logger.log(
      _this.getFileName(),
      'Could not create file. If this problem persist, delete this file in IITC-SYNC-DATA-V3 in your Google Drive and try again.'
    );
  };

  this.dataStorage = new window.plugin.sync.DataManager({ fileName: this.getFileName(), description: 'IITC plugin data for ' + this.getFileName() });
  this.dataStorage.initialize(this.forceFileSearch, assignIdCallback, failedCallback);
};

window.plugin.sync.RegisteredMap.prototype.initialize = function () {
  this.initFile(this.loadDocument);
};

window.plugin.sync.RegisteredMap.prototype.prepareFileData = function () {
  return { map: this.map, 'last-update-uuid': this.uuid };
};

window.plugin.sync.RegisteredMap.prototype.loadDocument = function () {
  this.initializing = true;
  var initializeFile, onFileLoaded, handleError, _this;
  _this = this;

  // this function called when the document is created first time
  // and the JSON file is populated with data in plugin field
  initializeFile = function () {
    _this.map = {};

    // Init the map values if this map is first created
    $.each(window.plugin[_this.pluginName][_this.fieldName], function (key, val) {
      _this.map[key] = val;
    });

    _this.dataStorage.saveFile(_this.prepareFileData());
    window.plugin.sync.logger.log(_this.getFileName(), 'Model initialized');
    setTimeout(function () {
      _this.loadDocument();
    }, window.plugin.sync.checkInterval);
  };

  // this function called when the document is loaded
  // update local data if the document is updated by other
  // and adding a timer to further check for updates
  onFileLoaded = function (data) {
    _this.map = data['map'];
    _this.lastUpdateUUID = data['last-update-uuid'];

    if (!_this.intervalID) {
      _this.intervalID = setInterval(function () {
        _this.loadDocument();
      }, window.plugin.sync.checkInterval);
    }

    // Replace local value if data is changed by others
    if (_this.isUpdatedByOthers()) {
      window.plugin.sync.logger.log(_this.getFileName(), 'Updated by others, replacing content');
      window.plugin[_this.pluginName][_this.fieldName] = {};
      $.each(_this.map, function (key) {
        window.plugin[_this.pluginName][_this.fieldName][key] = _this.map[key];
      });
      if (_this.callback) _this.callback(_this.pluginName, _this.fieldName, null, true);
    }

    _this.initialized = true;
    _this.initializing = false;
    window.plugin.sync.logger.log(_this.getFileName(), 'Data loaded');
    if (_this.callback) _this.callback();
    if (_this.initializedCallback) _this.initializedCallback(_this.pluginName, _this.fieldName);
  };

  // Stop the sync if any error occur and try to re-authorize
  handleError = function (e) {
    var isNetworkError = e.type;
    var errorMessage = e.error !== undefined ? e.error.message : e.result.error.message;

    if (errorMessage === 'A network error occurred, and the request could not be completed.') {
      isNetworkError = true;
    }

    window.plugin.sync.logger.log(_this.getFileName(), errorMessage);
    if (isNetworkError === true) {
      setTimeout(function () {
        _this.authorizer.authorize();
      }, 50 * 1000);
    } else if (e.status === 401) {
      // Unauthorized
      _this.authorizer.authorize();
    } else if (e.status === 404) {
      // Not found
      _this.forceFileSearch = true;
      _this.initFile();
      setTimeout(function () {
        _this.loadDocument();
      }, window.plugin.sync.checkInterval);
    }
  };

  this.dataStorage.readFile(initializeFile, onFileLoaded, handleError);
};
// end RegisteredMap

// RegisteredPluginsFields
// Store RegisteredMap and handle initialization of RegisteredMap
window.plugin.sync.RegisteredPluginsFields = function (options) {
  this.authorizer = options['authorizer'];
  this.pluginsfields = {};
  this.waitingInitialize = {};

  this.anyFail = false;

  this.initializeRegistered = this.initializeRegistered.bind(this);
  this.cleanWaitingInitialize = this.cleanWaitingInitialize.bind(this);
  this.initializeWorker = this.initializeWorker.bind(this);

  this.authorizer.addAuthCallback(this.initializeRegistered);
};

window.plugin.sync.RegisteredPluginsFields.prototype.add = function (registeredMap) {
  var pluginName, fieldName;
  pluginName = registeredMap.pluginName;
  fieldName = registeredMap.fieldName;
  this.pluginsfields[pluginName] = this.pluginsfields[pluginName] || {};

  if (this.pluginsfields[pluginName][fieldName]) return false;

  this.pluginsfields[pluginName][fieldName] = registeredMap;
  this.waitingInitialize[registeredMap.getFileName()] = registeredMap;

  this.initializeWorker();
};

window.plugin.sync.RegisteredPluginsFields.prototype.get = function (pluginName, fieldName) {
  if (!this.pluginsfields[pluginName]) return;
  return this.pluginsfields[pluginName][fieldName];
};

window.plugin.sync.RegisteredPluginsFields.prototype.initializeRegistered = function () {
  var _this = this;
  if (this.authorizer.isAuthed()) {
    $.each(this.waitingInitialize, function (key, map) {
      if (!map.initializing && !map.initialized) {
        map.initialize(_this.cleanWaitingInitialize);
      }
    });
  }
};

window.plugin.sync.RegisteredPluginsFields.prototype.cleanWaitingInitialize = function () {
  var newWaitingInitialize, _this;
  _this = this;

  newWaitingInitialize = {};
  $.each(this.waitingInitialize, function (key, map) {
    if (map.failed) _this.anyFail = true;
    if (map.initialized || map.failed) return true;
    newWaitingInitialize[map.getFileName()] = map;
  });
  this.waitingInitialize = newWaitingInitialize;
};

window.plugin.sync.RegisteredPluginsFields.prototype.initializeWorker = function () {
  var _this = this;

  this.cleanWaitingInitialize();
  window.plugin.sync.toggleDialogLink();
  this.initializeRegistered();

  clearTimeout(this.timer);
  if (Object.keys(this.waitingInitialize).length > 0) {
    this.timer = setTimeout(function () {
      _this.initializeWorker();
    }, 10000);
  }
};
// end RegisteredPluginsFields

// DataManager
//
// assignIdCallback function format: function(id)
// allow you to assign the file/folder id elsewhere
//
// failedCallback function format: function()
// call when the file/folder couldn't create
window.plugin.sync.DataManager = function (options) {
  this.fileName = options['fileName'];
  this.description = options['description'];

  this.force = false;
  this.fileId = null;
  this.retryCount = 0;
  this.loadFileId();

  this.instances[this.fileName] = this;
};

window.plugin.sync.DataManager.prototype.instances = {};
window.plugin.sync.DataManager.prototype.RETRY_LIMIT = 2;
window.plugin.sync.DataManager.prototype.MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';
window.plugin.sync.DataManager.prototype.parentName = 'IITC-SYNC-DATA-V3';
window.plugin.sync.DataManager.prototype.parentDescription = 'Store IITC sync data';

window.plugin.sync.DataManager.prototype.initialize = function (force, assignIdCallback, failedCallback) {
  this.force = force;
  // throw error if too many retry
  if (this.retryCount >= this.RETRY_LIMIT) {
    window.plugin.sync.logger.log(this.fileName, 'Too many file operation');
    failedCallback();
    return;
  }
  if (this.force) this.retryCount++;

  this.initParent(assignIdCallback, failedCallback);
};

window.plugin.sync.DataManager.prototype.initFile = function (assignIdCallback, failedCallback) {
  // If not force search and have cached fileId, return the fileId
  if (!this.force && this.fileId) {
    assignIdCallback(this.fileId);
    return;
  }

  var searchCallback, createCallback, handleFileId, handleFailed, _this;
  _this = this;

  handleFileId = function (id) {
    _this.fileId = id;
    _this.saveFileId();
    assignIdCallback(id);
  };

  handleFailed = function (resp) {
    _this.fileId = null;
    _this.saveFileId();
    window.plugin.sync.logger.log(_this.fileName, 'File operation failed: ' + (resp.error || 'unknown error'));
    failedCallback(resp);
  };

  createCallback = function (response) {
    if (response.result.id) {
      handleFileId(response.result.id); // file created
    } else {
      handleFailed(response); // could not create file
    }
  };

  searchCallback = function (resp) {
    if (resp.result.files.length !== 0) {
      handleFileId(resp.result.files[0].id); // file found
    } else if (resp.result.files.length === 0) {
      _this.createFile(createCallback); // file not found, create file
    } else {
      handleFailed(resp); // Error
    }
  };
  this.searchFile(searchCallback);
};

window.plugin.sync.DataManager.prototype.initParent = function (assignIdCallback, failedCallback) {
  var parentAssignIdCallback, parentFailedCallback, _this;
  _this = this;

  // If not force search and have cached parentFolderID, skip this step
  if (window.plugin.sync.parentFolderID) {
    return _this.initFile(assignIdCallback, failedCallback);
  }

  parentAssignIdCallback = function (id) {
    window.plugin.sync.parentFolderID = id;
    window.plugin.sync.logger.log('all', 'Parent folder success initialized');
    if (window.plugin.sync.parentFolderIDrequested) {
      window.plugin.sync.parentFolderIDrequested = false;
      return;
    }
    _this.initFile(assignIdCallback, failedCallback);
  };

  parentFailedCallback = function (resp) {
    window.plugin.sync.parentFolderID = null;
    window.plugin.sync.parentFolderIDrequested = false;
    window.plugin.sync.logger.log('all', 'Create folder operation failed: ' + (resp.error || 'unknown error'));
    failedCallback(resp);
  };

  // Several plugins at the same time has requested to create a folder
  if (!window.plugin.sync.parentFolderID && window.plugin.sync.parentFolderIDrequested) {
    return;
  }

  window.plugin.sync.parentFolderIDrequested = true;

  window.gapi.client.load('drive', 'v3').then(
    function () {
      window.gapi.client.drive.files.list({ q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false" }).then(function (files) {
        var directory = files.result.files;

        if (!directory.length) {
          window.gapi.client.drive.files
            .create({
              resource: { name: _this.parentName, description: _this.parentDescription, mimeType: _this.MIMETYPE_FOLDER },
            })
            .then(function (res) {
              parentAssignIdCallback(res.result.id);
            });
        } else {
          parentAssignIdCallback(directory[0].id);
        }
      });
    },
    function (reason) {
      parentFailedCallback(reason);
    }
  );
};

window.plugin.sync.DataManager.prototype.createFile = function (callback) {
  var _this = this;

  window.gapi.client.load('drive', 'v3').then(function () {
    window.gapi.client.drive.files
      .create({
        fields: 'id',
        resource: { name: _this.fileName, description: _this.description, parents: [window.plugin.sync.parentFolderID] },
      })
      .then(callback);
  });
};

window.plugin.sync.DataManager.prototype.readFile = function (needInitializeFileCallback, onFileLoadedCallback, handleError) {
  var _this = this;

  window.gapi.client.load('drive', 'v3').then(
    function () {
      window.gapi.client.drive.files.get({ fileId: _this.fileId, alt: 'media' }).then(
        function (response) {
          var res = response.result;
          if (res) {
            onFileLoadedCallback(res);
          } else {
            needInitializeFileCallback();
          }
        },
        function (reason) {
          handleError(reason);
        }
      );
    },
    function (reason) {
      handleError(reason);
    }
  );
};

window.plugin.sync.DataManager.prototype.saveFile = function (data) {
  var _this = this;

  window.gapi.client.load('drive', 'v3').then(function () {
    window.gapi.client
      .request({
        path: '/upload/drive/v3/files/' + _this.fileId,
        method: 'PATCH',
        params: { uploadType: 'media' },
        body: JSON.stringify(data),
      })
      .execute();
  });
};

window.plugin.sync.DataManager.prototype.searchFile = function (callback) {
  var _this = this;
  window.gapi.client.load('drive', 'v3').then(function () {
    window.gapi.client.drive.files.list(_this.getSearchOption()).execute(callback);
  });
};

window.plugin.sync.DataManager.prototype.getSearchOption = function () {
  var q = `name = "${this.fileName}" and trashed = false and "${window.plugin.sync.parentFolderID}" in parents`;
  return { q: q };
};

window.plugin.sync.DataManager.prototype.localStorageKey = function () {
  return 'sync-file-' + this.fileName;
};

window.plugin.sync.DataManager.prototype.saveFileId = function () {
  if (this.fileId) {
    localStorage[this.localStorageKey()] = this.fileId;
  } else {
    localStorage.removeItem(this.localStorageKey());
  }
};

window.plugin.sync.DataManager.prototype.loadFileId = function () {
  var storedFileId = localStorage[this.localStorageKey()];
  if (storedFileId) this.fileId = storedFileId;
};
// end DataManager

// Authorizer
// authorize user's google account
window.plugin.sync.Authorizer = function (options) {
  this.authCallback = options['authCallback'];
  this.authorizing = false;
  this.authorized = false;
  this.isAuthed = this.isAuthed.bind(this);
  this.isAuthorizing = this.isAuthorizing.bind(this);
  this.authorize = this.authorize.bind(this);
};

window.plugin.sync.Authorizer.prototype.API_KEY = 'AIzaSyBeVNFEHh35baf5y9miCjaw43L61BTeyhg';
window.plugin.sync.Authorizer.prototype.DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
window.plugin.sync.Authorizer.prototype.CLIENT_ID = '1099227387115-osrmhfh1i6dto7v7npk4dcpog1cnljtb.apps.googleusercontent.com';
window.plugin.sync.Authorizer.prototype.SCOPES = 'https://www.googleapis.com/auth/drive.file';

window.plugin.sync.Authorizer.prototype.isAuthed = function () {
  return this.authorized;
};

window.plugin.sync.Authorizer.prototype.isAuthorizing = function () {
  return this.authorizing;
};
window.plugin.sync.Authorizer.prototype.addAuthCallback = function (callback) {
  if (typeof this.authCallback === 'function') this.authCallback = [this.authCallback];
  this.authCallback.push(callback);
};

window.plugin.sync.Authorizer.prototype.authComplete = function () {
  this.authorizing = false;
  if (this.authCallback) {
    if (typeof this.authCallback === 'function') this.authCallback();
    if (this.authCallback instanceof Array && this.authCallback.length > 0) {
      $.each(this.authCallback, function (ind, func) {
        func();
      });
    }
  }
};

window.plugin.sync.Authorizer.prototype.updateSigninStatus = function (self, isSignedIn) {
  self.authorizing = false;
  if (isSignedIn) {
    self.authorized = true;
    window.plugin.sync.logger.log('all', 'Authorized');
    self.authComplete();
  } else {
    self.authorized = false;
    window.plugin.sync.logger.log('all', 'Not authorized');
    window.gapi.auth2.getAuthInstance().signIn();
  }
};

window.plugin.sync.Authorizer.prototype.authorize = function () {
  this.authorizing = true;
  this.authorized = false;
  const self = this;

  window.gapi.client
    .init({
      apiKey: this.API_KEY,
      discoveryDocs: this.DISCOVERY_DOCS,
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
    })
    .then(function () {
      // Listen for sign-in state changes.
      window.gapi.auth2.getAuthInstance().isSignedIn.listen((signedIn) => {
        self.updateSigninStatus(self, signedIn);
      });

      // Handle the initial sign-in state.
      self.updateSigninStatus(self, window.gapi.auth2.getAuthInstance().isSignedIn.get());
    });
};

// end Authorizer

// Logger
window.plugin.sync.Logger = function (options) {
  this.logLimit = options['logLimit'];
  this.logUpdateCallback = options['logUpdateCallback'];
  this.logs = {};
  this.log = this.log.bind(this);
  this.getLogs = this.getLogs.bind(this);
};

window.plugin.sync.Logger.prototype.log = function (filename, message) {
  var entity = { time: new Date(), message: message };

  if (filename === 'all') {
    Object.keys(this.logs).forEach((key) => {
      this.logs[key] = entity;
    });
  } else {
    this.logs[filename] = entity;
  }

  if (this.logUpdateCallback) this.logUpdateCallback(this.getLogs());
};

window.plugin.sync.Logger.prototype.getLogs = function () {
  var allLogs = '';
  Object.keys(this.logs).forEach((key) => {
    var value = this.logs[key];
    allLogs +=
      `<div class="sync-log-block">` +
      `<p class="sync-log-file">${key}:</p>` +
      `<p class="sync-log-message">${value.message} (${value.time.toLocaleTimeString()})</p>` +
      `</div>`;
  });

  return allLogs;
};

// end Logger

// http://stackoverflow.com/a/8809472/2322660
// http://stackoverflow.com/a/7221797/2322660
// With format fixing: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y in [8,9,a,b]
window.plugin.sync.generateUUID = function () {
  if (window.crypto && window.crypto.getRandomValues) {
    var buf = new Uint16Array(8);
    window.crypto.getRandomValues(buf);
    var S4 = function (num) {
      var ret = num.toString(16);
      return '000'.substring(0, 4 - ret.length) + ret;
    };
    var yxxx = function (num) {
      return (num & 0x3fff) | 0x8000;
    };
    return S4(buf[0]) + S4(buf[1]) + '-' + S4(buf[2]) + '-4' + S4(buf[3]).substring(1) + '-' + S4(yxxx(buf[4])) + '-' + S4(buf[5]) + S4(buf[6]) + S4(buf[7]);
  } else {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
  }
};

window.plugin.sync.storeLocal = function (mapping) {
  if (typeof window.plugin.sync[mapping.field] !== 'undefined' && window.plugin.sync[mapping.field] !== null) {
    localStorage[mapping.key] = JSON.stringify(window.plugin.sync[mapping.field]);
  } else {
    localStorage.removeItem(mapping.key);
  }
};

window.plugin.sync.loadLocal = function (mapping) {
  var objectJSON = localStorage[mapping.key];
  if (!objectJSON) return;
  try {
    var obj = JSON.parse(objectJSON);
  } catch {
    console.warn('[sync] Error parsing local data. Ignore');
    console.warn(objectJSON);
    return;
  }
  window.plugin.sync[mapping.field] = mapping.convertFunc ? mapping.convertFunc(obj) : obj;
};

window.plugin.sync.loadUUID = function () {
  window.plugin.sync.loadLocal(window.plugin.sync.KEY_UUID);
  if (!window.plugin.sync.uuid) {
    window.plugin.sync.uuid = window.plugin.sync.generateUUID();
    window.plugin.sync.storeLocal(window.plugin.sync.KEY_UUID);
  }
};

window.plugin.sync.updateLog = function (messages) {
  $('#sync-log').html(messages);
};

window.plugin.sync.toggleAuthButton = function () {
  var authed, authorizing;
  authed = window.plugin.sync.authorizer.isAuthed();
  authorizing = window.plugin.sync.authorizer.isAuthorizing();

  $('#sync-authButton').html(authed ? 'Authorized' : 'Authorize');

  $('#sync-authButton').attr('disabled', authed || authorizing);
  $('#sync-authButton').toggleClass('sync-authButton-dimmed', authed || authorizing);
};

window.plugin.sync.toggleDialogLink = function () {
  var authed, anyFail;
  authed = window.plugin.sync.authorizer.isAuthed();
  anyFail = window.plugin.sync.registeredPluginsFields.anyFail;

  IITC.toolbox.updateButton('sync-show-dialog', {
    class: !authed || anyFail ? 'sync-show-dialog-error' : '',
  });
};

window.plugin.sync.showDialog = function () {
  window.dialog({ html: window.plugin.sync.dialogHTML, title: 'Sync', modal: true, id: 'sync-setting' });
  window.plugin.sync.toggleAuthButton();
  window.plugin.sync.toggleDialogLink();
  window.plugin.sync.updateLog(window.plugin.sync.logger.getLogs());
};

window.plugin.sync.setupDialog = function () {
  window.plugin.sync.dialogHTML =
    '<div id="sync-dialog">' +
    '<button id="sync-authButton" class="sync-authButton-dimmed" ' +
    'onclick="setTimeout(function(){window.plugin.sync.authorizer.authorize(true)}, 1)" ' +
    'disabled="disabled">Authorize</button>' +
    '<div id="sync-log"></div>' +
    '</div>';
  IITC.toolbox.addButton({
    id: 'sync-show-dialog',
    label: 'Sync',
    action: window.plugin.sync.showDialog,
  });
};

window.plugin.sync.setupCSS = function () {
  $('<style>')
    .prop('type', 'text/css')
    .html(
      '.sync-authButton-dimmed {\
            opacity: 0.5;\
          }\
          .sync-show-dialog-error {\
            color: #FF2222;\
          }\
          #sync-log {\
            height: 300px;\
            white-space: pre-wrap;\
            white-space: -moz-pre-wrap;\
            white-space: -o-pre-wrap;\
            word-wrap: break-word;\
            overflow-y: auto;\
          }\
          .sync-log-block {\
            background: #ffffff1a;\
            padding: 5px;\
            margin: 0.5em 0;\
          }\
          .sync-log-file {\
            margin: 0;\
          }\
          .sync-log-message {\
            margin: 0;\
            text-align: right;\
          }'
    )
    .appendTo('head');
};

var setup = function () {
  window.plugin.sync.logger = new window.plugin.sync.Logger({ logLimit: 10, logUpdateCallback: window.plugin.sync.updateLog });
  window.plugin.sync.loadUUID();
  window.plugin.sync.setupCSS();
  window.plugin.sync.setupDialog();

  window.plugin.sync.authorizer = new window.plugin.sync.Authorizer({
    authCallback: [window.plugin.sync.toggleAuthButton, window.plugin.sync.toggleDialogLink],
  });
  window.plugin.sync.registeredPluginsFields = new window.plugin.sync.RegisteredPluginsFields({
    authorizer: window.plugin.sync.authorizer,
  });

  var GOOGLEAPI = 'https://apis.google.com/js/api.js';
  $.getScript(GOOGLEAPI).done(function () {
    window.gapi.load('client:auth2', window.plugin.sync.authorizer.authorize);
  });
};

setup.priority = 'high';

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

