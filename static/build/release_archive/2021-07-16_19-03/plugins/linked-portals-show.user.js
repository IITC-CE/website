// ==UserScript==
// @author         fstopienski
// @name           IITC plugin: Linked portals
// @category       Portal Info
// @version        0.3.3
// @description    Try to show the linked portals (image, name and link direction) in portal detail view and jump to linked portal on click.  Some details may not be available if the linked portal is not in the current view.
// @id             linked-portals-show
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/release/plugins/linked-portals-show.meta.js
// @downloadURL    https://iitc.app/build/release/plugins/linked-portals-show.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'release';
plugin_info.dateTimeVersion = '2021-07-16-190326';
plugin_info.pluginId = 'linked-portals-show';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
window.plugin.showLinkedPortal = function () {
};

plugin.showLinkedPortal.previewOptions = {
  color: "#C33",
  opacity: 1,
  weight: 5,
  fill: false,
  dashArray: "1,6",
  radius: 18,
};

plugin.showLinkedPortal.makePortalLinkInfo = function (div,guid,data,length,is_outgoing) { // guid: potentially useful
  var lengthFull = digits(Math.round(length)) + 'm';
  var title = data && data.title || null;
  if (title) {
    div.append($('<img/>').attr({
      'src': fixPortalImageUrl(data.image),
      'class': 'minImg',
      'alt': title,
    }));
  } else {
    title = 'Go to portal';
    var lengthShort = length < 100000 ? lengthFull : digits(Math.round(length/1000)) + 'km';
    div
      .addClass('outOfRange')
      .append($('<span/>').html('Portal not loaded.<br>' + lengthShort));
  }
  div.attr('title', $('<div/>')
    .append($('<strong/>').text(title))
    .append($('<br/>'))
    .append($('<span/>').text(is_outgoing ? '↴ outgoing link' : '↳ incoming link'))
    .append($('<br/>'))
    .append($('<span/>').html(lengthFull))
    .html());
  return div;
};

window.plugin.showLinkedPortal.portalDetail = function (data) {
  plugin.showLinkedPortal.removePreview();

  var portalLinks = getPortalLinks(data.guid);
  var length = portalLinks.in.length + portalLinks.out.length

  var c = 1;

  $('<div>',{id:'showLinkedPortalContainer'}).appendTo('#portaldetails');

  function renderLinkedPortal(linkGuid) {
    if(c > 16) return;

    var key = this; // passed by Array.prototype.forEach
    var direction = (key=='d' ? 'outgoing' : 'incoming');
    var link = window.links[linkGuid].options.data;
    var guid = link[key + 'Guid'];
    var lat = link[key + 'LatE6']/1E6;
    var lng = link[key + 'LngE6']/1E6;

    var length = L.latLng(link.oLatE6/1E6, link.oLngE6/1E6).distanceTo([link.dLatE6/1E6, link.dLngE6/1E6]);
    var data = (portals[guid] && portals[guid].options.data) || portalDetail.get(guid) || null;

    plugin.showLinkedPortal.makePortalLinkInfo($('<div>'),guid,data,length,direction==='outgoing')
      .addClass('showLinkedPortalLink showLinkedPortalLink' + c + ' ' + direction)
      .attr({
        'data-guid': guid,
        'data-lat': lat,
        'data-lng': lng,
        'data-length': length,
      })
      .appendTo('#showLinkedPortalContainer');

    c++;
  }

  portalLinks.out.forEach(renderLinkedPortal, 'd');
  portalLinks.in.forEach(renderLinkedPortal, 'o');

  if(length > 16) {
    $('<div>')
      .addClass('showLinkedPortalLink showLinkedPortalOverflow')
      .text(length-16 + ' more')
      .appendTo('#showLinkedPortalContainer');
  }

  $('#showLinkedPortalContainer')
    .on('click', '.showLinkedPortalLink:not(".outOfRange")', plugin.showLinkedPortal.onLinkedPortalClick)
    .on('click', '.showLinkedPortalLink.outOfRange', plugin.showLinkedPortal.onOutOfRangePortalClick)
    .on('taphold', '.showLinkedPortalLink', { duration: 900 }, plugin.showLinkedPortal.onLinkedPortalTapHold)
    .on('mouseover', '.showLinkedPortalLink.outOfRange', plugin.showLinkedPortal.onOutOfRangePortalMouseOver)
    .on('mouseover', '.showLinkedPortalLink', plugin.showLinkedPortal.onLinkedPortalMouseOver)
    .on('mouseout', '.showLinkedPortalLink', plugin.showLinkedPortal.onLinkedPortalMouseOut);
}

plugin.showLinkedPortal.onLinkedPortalClick = function() {
  plugin.showLinkedPortal.removePreview();

  var element = $(this);
  var guid = element.attr('data-guid');
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  if(!guid) return; // overflow

  var position = L.latLng(lat, lng);
  if(!map.getBounds().contains(position)) map.setView(position);
  if(portals[guid])
    renderPortalDetails(guid);
  else
    zoomToAndShowPortal(guid, position);
};

plugin.showLinkedPortal.onOutOfRangePortalClick = function() {
  var element = $(this);
  var guid = element.attr('data-guid');
  var length = element.attr('data-length');
  var is_outgoing = element.hasClass('outgoing');
  element.empty().removeClass('outOfRange');
  portalDetail.request(guid).done(function(data) {
    plugin.showLinkedPortal.makePortalLinkInfo(element,guid,data,length,is_outgoing);
  });
};

plugin.showLinkedPortal.onLinkedPortalTapHold = function() {
  // close portal info in order to preview link on map
  if(isSmartphone()) { show('map'); }
}

plugin.showLinkedPortal.onOutOfRangePortalMouseOver = plugin.showLinkedPortal.onOutOfRangePortalClick;

plugin.showLinkedPortal.onLinkedPortalMouseOver = function() {
  plugin.showLinkedPortal.removePreview();

  var element = $(this);
  var lat = element.attr('data-lat');
  var lng = element.attr('data-lng');

  if(!(lat && lng)) return; // overflow

  var remote = L.latLng(lat, lng);
  var local = portals[selectedPortal].getLatLng();

  plugin.showLinkedPortal.preview = L.layerGroup().addTo(map);

  L.circleMarker(remote, plugin.showLinkedPortal.previewOptions)
    .addTo(plugin.showLinkedPortal.preview);

  L.geodesicPolyline([local, remote], plugin.showLinkedPortal.previewOptions)
    .addTo(plugin.showLinkedPortal.preview);
};

plugin.showLinkedPortal.onLinkedPortalMouseOut = function() {
  plugin.showLinkedPortal.removePreview();
};

plugin.showLinkedPortal.removePreview = function() {
  if(plugin.showLinkedPortal.preview)
    map.removeLayer(plugin.showLinkedPortal.preview);
  plugin.showLinkedPortal.preview = null;
};

var setup = function () {
  window.addHook('portalDetailsUpdated', window.plugin.showLinkedPortal.portalDetail);
  $('<style>').prop('type', 'text/css').html('\
#level {\
	text-align: center;\
	margin-right: -0.5em;\
	position: relative;\
	right: 50%;\
	width: 1em;\
}\
.showLinkedPortalLink {\
	cursor: pointer;\
	position: absolute;\
	height: 40px;\
	width: 50px;\
	border-width: 1px;\
	overflow: hidden;\
	text-align: center;\
	background: #0e3d4e;\
}\
.showLinkedPortalLink .minImg {\
	height: 40px;\
}\
.showLinkedPortalLink.outOfRange span {\
	display: block;\
	line-height: 13px;\
	font-size: 10px;\
}\
.showLinkedPortalOverflow {\
	left: 50%;\
	margin-left:-25px;\
	cursor: default;\
}\
\
.showLinkedPortalLink1, .showLinkedPortalLink2, .showLinkedPortalLink3, .showLinkedPortalLink4 {\
	left: 5px;\
}\
.showLinkedPortalLink5, .showLinkedPortalLink6, .showLinkedPortalLink7, .showLinkedPortalLink8 {\
	right: 5px;\
}\
.showLinkedPortalLink9, .showLinkedPortalLink10, .showLinkedPortalLink11, .showLinkedPortalLink12 {\
	left: 59px;\
}\
.showLinkedPortalLink13, .showLinkedPortalLink14, .showLinkedPortalLink15, .showLinkedPortalLink16 {\
	right: 59px\
}\
\
.showLinkedPortalLink1, .showLinkedPortalLink5, .showLinkedPortalLink9, .showLinkedPortalLink13 {\
	top: 23px;\
}\
.showLinkedPortalLink2, .showLinkedPortalLink6, .showLinkedPortalLink10, .showLinkedPortalLink14 {\
	top: 72px;\
}\
.showLinkedPortalLink3, .showLinkedPortalLink7, .showLinkedPortalLink11, .showLinkedPortalLink15 {\
	top: 122px;\
}\
.showLinkedPortalLink4, .showLinkedPortalLink8, .showLinkedPortalLink12, .showLinkedPortalLink16,\
.showLinkedPortalOverflow {\
	top: 171px;\
}\
\
.showLinkedPortalLink.incoming::before, .showLinkedPortalLink.outgoing::before {\
	position: absolute;\
	bottom: 0;\
	right: 0;\
	width: 11px;\
	height: 15px;\
	text-shadow: 0 0 2px #000;\
}\
\
.showLinkedPortalLink.incoming {\
	border-style: dotted;\
}\
.showLinkedPortalLink.incoming::before {\
	content: "↳";\
}\
\
.showLinkedPortalLink.outgoing {\
	border-style: dashed;\
}\
.showLinkedPortalLink.outgoing::before {\
	content: "↴";\
}\
').appendTo('head');
}

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

