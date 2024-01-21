// ==UserScript==
// @author         fstopienski
// @name           IITC plugin: Linked portals
// @category       Portal Info
// @version        0.4.1.20240121.085227
// @description    Try to show the linked portals (image, name and link direction) in portal detail view and jump to linked portal on click.  Some details may not be available if the linked portal is not in the current view.
// @id             linked-portals-show
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/artifact/PR690/plugins/linked-portals-show.meta.js
// @downloadURL    https://iitc.app/build/artifact/PR690/plugins/linked-portals-show.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/linked-portals-show.png
// @icon64         https://iitc.app/extras/plugin-icons/linked-portals-show-64.png
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'test';
plugin_info.dateTimeVersion = '2024-01-21-085227';
plugin_info.pluginId = 'linked-portals-show';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */

var changelog = [
  {
    version: '0.4.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

// use own namespace for plugin
var showLinkedPortal = {};
window.plugin.showLinkedPortal = showLinkedPortal;

showLinkedPortal.previewOptions = {
  color: '#C33',
  opacity: 1,
  weight: 5,
  fill: false,
  dashArray: '1,6',
  radius: 18,
};

showLinkedPortal.noimage = false;
showLinkedPortal.imageInTooltip = true;
showLinkedPortal.doubleTapToGo = true;

showLinkedPortal.makePortalLinkContent = function ($div, info, data) {
  var lengthFull = digits(Math.round(info.length)) + 'm';
  var lengthShort = info.length < 100000
    ? lengthFull
    : digits(Math.round(info.length/1000)) + 'km';
  $('<div>').addClass('info')
    .html(lengthShort)
    .appendTo($div);

  $('<div>').addClass('title')
    .html(data.title || 'Go to portal')
    .appendTo($div);

  if (data.image) {
    $('<img>').attr({
      src: fixPortalImageUrl(data.image),
      class: 'minImg',
      alt: data.title,
    }).appendTo($div);
  }
};

showLinkedPortal.getPortalLinkTooltip = function ($div, info, data) {
  var lengthFull = digits(Math.round(info.length)) + 'm';
  var tooltip = $('<div>').append(
    $('<div>').attr('style', 'font-weight:bold').text(data.title || 'Go to portal'),
    $('<div>').text(info.direction === 'outgoing' ? '↴ outgoing link' : '↳ incoming link'),
    $('<div>').html(lengthFull));
  if (showLinkedPortal.imageInTooltip && data.image) {
    $('<img>')
      .attr('src', fixPortalImageUrl(data.image))
      .addClass('minImg')
      .appendTo(tooltip);
  }
  return tooltip.html();
};

var lastPortal;
showLinkedPortal.makePortalLinkInfo = function ($div, info, data) {
  if ($div[0].childNodes.length) {
    $div.empty().removeClass('outOfRange');
  } else {
    if (info.guid === lastPortal) {
      $div.addClass('lastportal');
    }
  }
  if (!data.title) {
    $div.addClass('outOfRange');
  }
  showLinkedPortal.makePortalLinkContent.apply(this, arguments);
  $div.attr('title', showLinkedPortal.getPortalLinkTooltip.apply(this, arguments));
};

showLinkedPortal.portalDetail = function (data) {
  showLinkedPortal.removePreview();

  var portalLinks = getPortalLinks(data.guid);
  var length = portalLinks.in.length + portalLinks.out.length;

  var c = 1;

  var $showLinkedPortalContainer = $('<div>',{id:'showLinkedPortal'}).appendTo('.imgpreview');
  if (showLinkedPortal.noimage) {
    $showLinkedPortalContainer.addClass('noimage');
  }

  function renderLinkedPortal(linkGuid) {
    if (c > 16) return;

    var key = this.toString(); // passed by Array.prototype.forEach
    var direction = (key === 'd' ? 'outgoing' : 'incoming');
    var link = window.links[linkGuid].options.data;
    var guid = link[key + 'Guid'];
    var lat = link[key + 'LatE6']/1E6;
    var lng = link[key + 'LngE6']/1E6;

    var length = L.latLng(link.oLatE6/1E6, link.oLngE6/1E6).distanceTo([link.dLatE6/1E6, link.dLngE6/1E6]);
    var info = {
      guid: guid,
      lat: lat,
      lng: lng,
      length: length,
      direction: direction,
    };
    var $div = $('<div>')
      .addClass('link link' + c + ' ' + direction)
      .data(info);
    var data = (portals[guid] && portals[guid].options.data) || portalDetail.get(guid) || {};
    showLinkedPortal.makePortalLinkInfo($div, info, data);
    $div.appendTo($showLinkedPortalContainer);

    c++;
  }

  portalLinks.out.forEach(renderLinkedPortal, 'd');
  portalLinks.in.forEach(renderLinkedPortal, 'o');

  if (length > 16) {
    $('<div>')
      .addClass('overflow')
      .text(length-16 + ' more')
      .appendTo($showLinkedPortalContainer);
  }

  $showLinkedPortalContainer
    .on('click', '.link:not(".outOfRange")', showLinkedPortal.renderPortalDetails)
    .on('click', '.link.outOfRange', showLinkedPortal.requestPortalData)
    .on('taphold', '.link', showLinkedPortal.showLinkOnMap)
    .on('mouseover', '.link.outOfRange', showLinkedPortal.requestPortalData)
    .on('mouseover', '.link', showLinkedPortal.showPreview)
    .on('mouseout', '.link', showLinkedPortal.removePreview);

  $('.imgpreview')
    .on('taphold', { delay: 1100 }, function () {
      showLinkedPortal.noimage = !showLinkedPortal.noimage;
      $showLinkedPortalContainer.toggleClass('noimage');
    });
};

showLinkedPortal.renderPortalDetails = function (ev) {
  function isTouch (event) {
    return event.pointerType === 'touch' ||
           event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents;
  }
  var event = ev.originalEvent;
  if (showLinkedPortal.doubleTapToGo && isTouch(event) && event.detail !== 2) {
    return;
  }

  showLinkedPortal.removePreview();

  var info = $(this).data();

  var position = L.latLng(info.lat, info.lng);
  if (!map.getBounds().contains(position)) {
    map.panInside(position);
  }
  if (portals[info.guid]) {
    renderPortalDetails(info.guid);
  } else {
    zoomToAndShowPortal(info.guid, position);
  }
};

showLinkedPortal.requestPortalData = function() {
  var $element = $(this);
  var info = $element.data();
  portalDetail.request(info.guid).done(function(data) {
    showLinkedPortal.makePortalLinkInfo($element, info, data);
    // update tooltip
    var tooltipId = $element.attr('aria-describedby');
    if (tooltipId) {
      $('#' + tooltipId).html($element.attr('title'));
    }
  });
};

showLinkedPortal.showLinkOnMap = function() {
  // close portal info in order to preview link on map
  if (isSmartphone()) { show('map'); }
  if (!showLinkedPortal.preview) {
    showLinkedPortal.showPreview.apply(this, arguments);
  }

  var info = $(this).data();
  var position = L.latLng(info.lat, info.lng);
  if (!map.getBounds().contains(position)) {
    var targetBounds = [position, portals[selectedPortal].getLatLng()];
    map.fitBounds(targetBounds, { padding: [15, 15], maxZoom: map.getZoom() });
  }
};

showLinkedPortal.showPreview = function() {
  showLinkedPortal.removePreview();

  var info = $(this).data();
  var remote = L.latLng(info.lat, info.lng);
  var local = portals[selectedPortal].getLatLng();

  showLinkedPortal.preview = L.layerGroup().addTo(map);

  L.circleMarker(remote, showLinkedPortal.previewOptions)
    .addTo(showLinkedPortal.preview);

  L.geodesicPolyline([local, remote], showLinkedPortal.previewOptions)
    .addTo(showLinkedPortal.preview);
};

showLinkedPortal.removePreview = function() {
  if (showLinkedPortal.preview) {
    showLinkedPortal.preview.remove();
  }
  showLinkedPortal.preview = null;
};

function setup () {
  window.addHook('portalSelected', function (data) {
    var sel = data.selectedPortalGuid;
    var unsel = data.unselectedPortalGuid;
    lastPortal = sel !== unsel ? unsel : lastPortal;
  });

  window.addHook('portalDetailsUpdated', showLinkedPortal.portalDetail);
  $('<style>').prop('type', 'text/css').html('\
#portaldetails #level {\
	text-align: center;\
	margin: auto;\
	float: none;\
}\
\
#showLinkedPortal .link, #showLinkedPortal .overflow {\
	cursor: pointer;\
	position: absolute;\
	height: 40px;\
	width: 50px;\
	border-width: 1px;\
	overflow: hidden;\
	background-color: rgba(8,48,78,0.7);\
	font-size: 10px;\
	border-style: solid;\
}\
\
#showLinkedPortal .link {\
	border-radius: 5px 0 5px 0;\
	box-shadow: 0 0 10px rgba(0,0,0,0.9);\
	user-select: none;\
	display: flex;\
	flex-direction: column;\
	justify-content: space-between;\
}\
\
#showLinkedPortal .overflow {\
	left: 50%;\
	margin-left:-25px;\
	cursor: default;\
	border-color: transparent;\
	line-height: 41px;\
	font-size: 12px;\
	text-align: center;\
}\
\
#showLinkedPortal .title {\
	word-wrap: break-all;\
	word-break: break-word;\
	font-weight: bold;\
	text-align: left;\
	line-height: 8px;\
	letter-spacing: -0.7px;\
	padding-left: 1px;\
	display: -webkit-box;\
	-webkit-line-clamp: 4;\
	-webkit-box-orient: vertical;\
}\
\
#showLinkedPortal .info {\
	text-align: right;\
	line-height: 8px;\
}\
\
#showLinkedPortal .minImg {\
	height: 100%;\
	width: 100%;\
	object-fit: cover;\
	position: absolute;\
	left: 0;\
	top: 0;\
	pointer-events: none;\
}\
\
#showLinkedPortal.noimage .minImg {\
	display: none\
}\
\
.ui-tooltip .minImg {\
	max-width: 200px;\
	max-height: 200px;\
	display: block;\
	margin: auto;\
}\
\
#showLinkedPortal .link1, #showLinkedPortal .link2, #showLinkedPortal .link3, #showLinkedPortal .link4 {\
	left: 5px;\
}\
#showLinkedPortal .link5, #showLinkedPortal .link6, #showLinkedPortal .link7, #showLinkedPortal .link8 {\
	right: 5px;\
}\
#showLinkedPortal .link9, #showLinkedPortal .link10, #showLinkedPortal .link11, #showLinkedPortal .link12 {\
	left: 63px;\
}\
#showLinkedPortal .link13, #showLinkedPortal .link14, #showLinkedPortal .link15, #showLinkedPortal .link16 {\
	right: 63px\
}\
\
#showLinkedPortal .link1, #showLinkedPortal .link5, #showLinkedPortal .link9, #showLinkedPortal .link13 {\
	top: 0px;\
}\
#showLinkedPortal .link2, #showLinkedPortal .link6, #showLinkedPortal .link10, .showLinkedPortal .link14 {\
	top: 49px;\
}\
#showLinkedPortal .link3, #showLinkedPortal .link7, #showLinkedPortal .link11, #showLinkedPortal .link15 {\
	bottom: 49px;\
}\
#showLinkedPortal .link4, #showLinkedPortal .link8, #showLinkedPortal .link12, #showLinkedPortal .link16, \
#showLinkedPortal .overflow {\
	bottom: 0px;\
}\
\
#showLinkedPortal .outgoing {\
	border-style: dashed;\
}\
\
#showLinkedPortal .outgoing {\
	border-style: dashed;\
}\
\
#showLinkedPortal .outgoing::before {\
	z-index: 1;\
	content: "•";\
	position: absolute;\
	top: 0;\
	left: 0;\
	text-shadow: 0 0 2px #000;\
	color: yellow;\
	line-height: 10px;\
	font-size: 15px;\
}\
\
#showLinkedPortal .lastportal {\
	border-left: 2px solid yellow;\
}\
').appendTo('head');
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

