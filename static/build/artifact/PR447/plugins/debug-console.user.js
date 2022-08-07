// ==UserScript==
// @author         jaiperdu
// @name           IITC plugin: Debug console tab
// @category       Debug
// @version        0.1.0.20220807.202125
// @description    Add a debug console tab
// @id             debug-console
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR447/plugins/debug-console.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR447/plugins/debug-console.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2022-08-07-202125';
plugin_info.pluginId = 'debug-console';
//END PLUGIN AUTHORS NOTE

var debugTab = {};

// DEBUGGING TOOLS ///////////////////////////////////////////////////
// meant to be used from browser debugger tools and the like.

debugTab.renderDetails = function() {
  log.log('portals: ' + Object.keys(window.portals).length);
  log.log('links:   ' + Object.keys(window.links).length);
  log.log('fields:  ' + Object.keys(window.fields).length);
}

debugTab.printStackTrace = function() {
  var e = new Error('dummy');
  log.error(e.stack);
  return e.stack;
}

debugTab.console = function() {
  $('#chatdebug').text();
}

window.debug.console.create = function() {
  window.chat.addCommTab({
    channel: 'debug',
    name: 'Debug',
    inputPrompt: 'debug:',
    inputClass: 'debug',
    sendMessage: function (_, msg) {
      var result;
      try {
        result = eval(msg);
      } catch (e) {
        if (e.stack) { log.error(e.stack); }
        throw e; // to trigger native error message
      }
      if (result !== undefined) {
        log.error(result.toString());
      }
      return result;
    },
  });
}

debugTab.console.renderLine = function(text, errorType) {
  // debug.console.create();
  switch(errorType) {
    case 'error':   var color = '#FF424D'; break;
    case 'warning': var color = '#FFDE42'; break;
    default:        var color = '#eee';
  }
  if(typeof text !== 'string' && typeof text !== 'number') {
    var cache = [];
    text = JSON.stringify(text, function(key, value) {
      if(typeof value === 'object' && value !== null) {
        if(cache.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    cache = null;
  }
  var d = new Date();
  var ta = d.toLocaleTimeString(); // print line instead maybe?
  var tb = d.toLocaleString();
  var t = '<time title="'+tb+'" data-timestamp="'+d.getTime()+'">'+ta+'</time>';
  var s = 'style="color:'+color+'"';
  var l = '<tr><td>'+t+'</td><td><mark '+s+'>'+errorType+'</mark></td><td>'+text+'</td></tr>';
  $('#chatdebug table').append(l);
}

debugTab.console.log = function(text) {
  debug.console.renderLine(text, 'notice');
}

debugTab.console.warn = function(text) {
  debug.console.renderLine(text, 'warning');
}

debugTab.console.error = function(text) {
  debug.console.renderLine(text, 'error');
}

debugTab.console.overwriteNative = function() {
  debugTab.console.create();

  var nativeConsole = window.console;
  window.console = $.extend({}, window.console);

  function overwrite(which) {
    window.console[which] = function() {
      nativeConsole[which].apply(nativeConsole, arguments);
      debugTab.console[which].apply(debugTab.console, arguments);
    }
  }

  overwrite("log");
  overwrite("warn");
  overwrite("error");
}

debugTab.console.overwriteNativeIfRequired = function() {
  if(!window.console || L.Browser.mobile)
    debugTab.console.overwriteNative();
}


function setup() {
  window.plugin.debug = debugTab;
  create();
  overwriteNative();

  // emulate old API
  window.debug = function () {};
  window.debug.renderDetails = debugTab.renderDetails;
  window.debug.printStackTrace = debugTab.printStackTrace;
  window.debug.console = function () {};
  window.debug.console.show = debugTab.console.show;
  window.debug.console.renderLine = function (text, errorType) {
    return debugTab.console.renderLine(errorType, [text]);
  };
  window.debug.console.log = debugTab.console.log;
  window.debug.console.warn = debugTab.console.warn;
  window.debug.console.error = debugTab.console.error;
}

setup.priority = 'boot';


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

