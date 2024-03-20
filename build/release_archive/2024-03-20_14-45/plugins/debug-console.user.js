// ==UserScript==
// @author         jaiperdu
// @name           IITC plugin: Debug console tab
// @category       Debug
// @version        0.1.1
// @description    Add a debug console tab
// @id             debug-console
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/release/plugins/debug-console.meta.js
// @downloadURL    https://iitc.app/build/release/plugins/debug-console.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/debug-console.png
// @icon64         https://iitc.app/extras/plugin-icons/debug-console-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'release';
plugin_info.dateTimeVersion = '2024-03-20-144515';
plugin_info.pluginId = 'debug-console';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.1.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

var debugTab = {};

// DEBUGGING TOOLS ///////////////////////////////////////////////////
// meant to be used from browser debugger tools and the like.


debugTab.renderDetails = function() {
  debugTab.console.log('portals: ' + Object.keys(window.portals).length);
  debugTab.console.log('links:   ' + Object.keys(window.links).length);
  debugTab.console.log('fields:  ' + Object.keys(window.fields).length);
};

debugTab.printStackTrace = function() {
  var e = new Error('dummy');
  debugTab.console.error(e.stack);
  return e.stack;
};

debugTab.console = {};
debugTab.console.show = function() {
  $('#chat, #chatinput').show();
  $('#chatinput mark').css('cssText', 'color: #bbb !important').text('debug:');
  $('#chat > div').hide();
  $('#debugconsole').show();
  $('#chatcontrols .active').removeClass('active');
  $("#chatcontrols a:contains('debug')").addClass('active');
};

debugTab.console.renderLine = function(errorType, args) {
  args = Array.prototype.slice.call(args);
  var color = '#eee';
  switch (errorType) {
  case 'error':   color = '#FF424D'; break;
  case 'warning': color = '#FFDE42'; break;
  }
  var text = [];
  args.forEach(function (v) {
    if (typeof v !== 'string' && typeof v !== 'number') {
      var cache = [];
      v = JSON.stringify(v, function(key, value) {
        if (typeof value === 'object' && value !== null) {
          if (cache.indexOf(value) !== -1) {
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
    text.push(v);
  });
  text = text.join(' ');
  var d = new Date();
  var ta = d.toLocaleTimeString(); // print line instead maybe?
  var tb = d.toLocaleString();
  var t = '<time title="'+tb+'" data-timestamp="'+d.getTime()+'">'+ta+'</time>';
  var s = 'style="color:'+color+'"';
  var l = '<tr><td>'+t+'</td><td><mark '+s+'>'+errorType+'</mark></td><td>'+text+'</td></tr>';
  $('#debugconsole table').prepend(l);
};

debugTab.console.log = function() {
  debugTab.console.renderLine('notice', arguments);
};

debugTab.console.warn = function() {
  debugTab.console.renderLine('warning', arguments);
};

debugTab.console.error = function() {
  debugTab.console.renderLine('error', arguments);
};

debugTab.console.debug = function() {
  debugTab.console.renderLine('debug', arguments);
};

function overwriteNative() {
  var nativeConsole = window.console;
  window.console = L.extend({}, window.console);

  function overwrite(which) {
    window.console[which] = function() {
      if (nativeConsole) {
        nativeConsole[which].apply(nativeConsole, arguments);
      }
      debugTab.console[which].apply(debugTab.console, arguments);
    };
  }

  overwrite('log');
  overwrite('warn');
  overwrite('error');
  overwrite('debug');
}

function setupPosting() {
  if (!window.isSmartphone()) {
    $('#chatinput input').keydown(function(event) {
      var kc = event.keyCode ? event.keyCode : event.which;
      if (kc === 13) { // enter
        if ($('#chatcontrols .active').text() === 'debug') {
          event.preventDefault();
          userInput();
        }
      }
    });
  }

  $('#chatinput').submit(function(event) {
    event.preventDefault();
    userInput();
  });
}

function userInput() {
  if ($('#chatcontrols .active').text() !== 'debug') {return;}

  var msg = $.trim($('#chatinput input').val());
  if (!msg) { return; }

  var result;
  try {
    result = eval(msg);
  } catch (e) {
    if (e.stack) { debugTab.console.error(e.stack); }
    throw e; // to trigger native error message
  }
  if (result !== undefined) {
    debugTab.console.log(result.toString());
  }
}


function create() {
  if ($('#debugconsole').length) return;
  $('#chatcontrols').append('<a>debug</a>');
  $('#chatcontrols a:last').click(debugTab.console.show);
  $('#chat').append('<div style="display: none" id="debugconsole"><table></table></div>');

  setupPosting();

  if (window.useAndroidPanes()) {
    android.addPane('debug', 'Debug', 'ic_action_view_as_list');
    window.addHook('paneChanged', function (id) {
      if (id === 'debug') {
        debugTab.console.show();
      }
    });
  }
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

