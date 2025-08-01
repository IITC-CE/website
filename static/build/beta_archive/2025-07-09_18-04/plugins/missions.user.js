// ==UserScript==
// @author         jonatkins
// @name           IITC plugin: Missions
// @category       Info
// @version        0.3.4.20250709.180413
// @description    View missions. Marking progress on waypoints/missions basis. Showing mission paths on the map.
// @id             missions
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/missions.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/missions.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @icon           https://iitc.app/extras/plugin-icons/missions.svg
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2025-07-09-180413';
plugin_info.pluginId = 'missions';
//END PLUGIN AUTHORS NOTE

/* exported setup, changelog --eslint */
/* global IITC, L -- eslint */

var changelog = [
  {
    version: '0.3.4',
    changes: ['Refactoring: fix eslint'],
  },
  {
    version: '0.3.3',
    changes: ['Version upgrade due to a change in the wrapper: plugin icons are now vectorized'],
  },
  {
    version: '0.3.2',
    changes: ['IITC.toolbox API is used to create plugin buttons'],
  },
  {
    version: '0.3.1',
    changes: ['Version upgrade due to a change in the wrapper: added plugin icon'],
  },
];

var MissionOrder = {
  Sequential: 1,
  NonSequential: 2,
  Hidden: 3,
};

var WaypointTarget = {
  Portal: 1,
  FieldTrip: 2,
};

var decodeWaypoint = function (data) {
  var result = {
    hidden: data[0],
    guid: data[1],
    title: data[2],
    typeNum: data[3],
    type: [null, 'Portal', 'Field Trip'][data[3]],
    objectiveNum: data[4],
    objective: [
      null,
      'Hack this Portal',
      'Capture or Upgrade Portal',
      'Create Link from Portal',
      'Create Field from Portal',
      'Install a Mod on this Portal',
      'Take a Photo',
      'View this Field Trip Waypoint',
      'Enter the Passphrase',
    ][data[4]],
  };

  if (data[5]) {
    switch (result.typeNum) {
      case WaypointTarget.Portal:
        result.portal = window.decodeArray.portal(data[5], 'summary');
        // Portal waypoints have the same guid as the respective portal.
        result.portal.guid = result.guid;
        break;
      case WaypointTarget.FieldTrip:
        // data[5] = [ "f", <latE6>, <lngE6> ]
        result.portal = {
          latE6: data[5][1],
          lngE6: data[5][2],
          title: result.title,
        };
        break;
    }
  }
  return result;
};

var decodeMission = function (data) {
  if (typeof data !== 'object' || data.length === 0) return;

  return {
    guid: data[0],
    title: data[1],
    description: data[2],
    authorNickname: data[3],
    authorTeam: data[4],
    // Notice: this format is weird(100%: 1.000.000)
    ratingE6: data[5],
    medianCompletionTimeMs: data[6],
    numUniqueCompletedPlayers: data[7],
    typeNum: data[8],
    type: [null, 'Sequential', 'Non Sequential', 'Hidden'][data[8]],
    waypoints: data[9].map(decodeWaypoint),
    image: data[10],
  };
};

var decodeMissionSummary = function (data) {
  return {
    guid: data[0],
    title: data[1],
    image: data[2],
    ratingE6: data[3],
    medianCompletionTimeMs: data[4],
  };
};

var timeToRemaining = function (t) {
  var data = Math.trunc(t / 86400) + 'd ' + new Date((t % 86400) * 1000).toUTCString().replace(/.*(\d{2}):(\d{2}):(\d{2}).*/, '$1h $2m $3s');
  data = data.replace('0d', '');
  data = data.replace('00h', '');
  data = data.replace('00m', '');
  return data.trim();
};

window.plugin.missions = {
  // 3 days.
  missionCacheTime: 3 * 24 * 3600 * 1e3,
  // 3 weeks.
  portalMissionsCacheTime: 21 * 24 * 3600 * 1e3,

  MISSION_COLOR: '#404000',
  MISSION_COLOR_ACTIVE: '#7f7f00',
  MISSION_COLOR_START: '#A6A600',

  SYNC_DELAY: 5000,
  enableSync: false,

  missionTypeImages: [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASAQMAAABsABwUAAAABlBMVEWN+1Sx+/dsz4yeAAAAAXRSTlMAQObYZgAAAClJREFUCNdjYIACxgcMDOwfGBjYKoAcCyCugOIPEDnGAxAMVnsAlQ8EAEkHCRVXxWK2AAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASAQMAAABsABwUAAAABlBMVEUAAACy+/gnk9HpAAAAAXRSTlMAQObYZgAAAB9JREFUCNdjYMAGBIBYAohlGBju/zsAxiA2WEwAqw4Az84Fw61PmPwAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASAQMAAABsABwUAAAABlBMVEUAAACy+/gnk9HpAAAAAXRSTlMAQObYZgAAAClJREFUCNdjYACBB0gYCBgFIJiJA4JZWCCYgwmCQaCA8QBD+d8DYBoIAN15B5HS9gdlAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASAQMAAABsABwUAAAABlBMVEWq+02y+/jJjgLNAAAAAXRSTlMAQObYZgAAADdJREFUCNdjYAAC9gMMDDwPgIwEIAbSjA0MDMwgzADBIMAsAMQSQIYMA8P9fwfAGMRmAIkJMAAAQKIJxqg43P4AAAAASUVORK5CYII=',
  ],

  onPortalDetailsUpdated: function (data) {
    if (!data.portalDetails.mission && !data.portalDetails.mission50plus) {
      return;
    }
    var missionHtml = $('<a>')
      .click(this.openPortalMissions.bind(this))
      .text('Missions');
    $('.linkdetails').append($('<aside>').append(missionHtml));
  },

  openTopMissions: function (bounds) {
    bounds = bounds || window.map.getBounds();
    this.loadMissionsInBounds(bounds, this.showMissionListDialog.bind(this));
  },

  openPortalMissions: function () {
    let selectedPortalGuid = window.selectedPortal;

    this.loadPortalMissions(
      selectedPortalGuid,
      function (missions) {
        if (!missions.length) {
          return;
        }

        if (missions.length === 1) {
          this.loadMission(missions[0].guid, this.showMissionDialog.bind(this));
        } else {
          let selectedPortal = window.portals[selectedPortalGuid];
          this.showMissionListDialog(missions, 'Missions at ' + selectedPortal.options.data.title, true);
        }
      }.bind(this)
    );
  },

  openMission: function (guid) {
    this.loadMission(guid, this.showMissionDialog.bind(this));
  },

  showMissionDialog: function (mission) {
    var me = this;
    var markers = this.drawMission(mission);
    var content = this.renderMission(mission);
    var id = mission.guid.replace(/\./g, '_'); // dots irritate the dialog framework and are not allowed in HTML IDs

    if (window.useAppPanes()) {
      if (this.tabHeaders[id]) {
        this.tabHeaders[id].parentNode.querySelector('.ui-icon-close').click();
      }

      this.tabMarkers[id] = markers;

      var button = content.insertBefore(document.createElement('button'), content.lastChild);
      button.textContent = 'Zoom to mission';
      button.addEventListener(
        'click',
        function () {
          me.zoomToMission(mission);
          window.show('map');
        },
        false
      );

      var li = this.tabBar.appendChild(document.createElement('li'));
      li.dataset['mission_id'] = id;

      var a = li.appendChild(document.createElement('a'));
      a.textContent = mission.title;
      a.href = '#mission_pane_' + id;
      this.tabHeaders[id] = a;
      var span = li.appendChild(document.createElement('span'));
      span.className = 'ui-icon ui-icon-close';
      span.textContent = 'Close mission';
      span.addEventListener(
        'click',
        function () {
          this.removeMissionLayers(markers);
          li.parentNode.removeChild(li);
          content.parentNode.removeChild(content);
          delete this.tabHeaders[id];
          delete this.tabMarkers[id];
          $(this.tabs).tabs('refresh').find('.ui-tabs-nav').sortable('refresh');
        }.bind(this),
        false
      );

      this.tabs.appendChild(content);
      content.id = 'mission_pane_' + id;
      var tabs = $(this.tabs);
      tabs.tabs('refresh');
      tabs.find('.ui-tabs-nav').sortable('refresh');
      tabs.tabs('option', 'active', -1);
      if (window.isSmartphone()) {
        window.show('plugin-missions');
      }
    } else {
      window
        .dialog({
          id: 'plugin-mission-details-' + id,
          title: mission.title,
          height: 'auto',
          html: content,
          width: '450px',
          closeCallback: function () {
            me.removeMissionLayers(markers);
          },
          collapseCallback: this.collapseFix,
          expandCallback: this.collapseFix,
          focus: function () {
            me.highlightMissionLayers(markers);
          },
        })
        .dialog('option', 'buttons', {
          'Zoom to mission': function () {
            me.zoomToMission(mission);
          },
          OK: function () {
            $(this).dialog('close');
          },
        });
    }
  },

  showMissionListDialog: function (missions, caption, isPortalList) {
    this.isShowingPortalList = isPortalList;

    // Check whether dialog is already open
    let openDialog = window.DIALOGS['dialog-missionsList'];
    if (openDialog) {
      // Dialog already there, expand if collapsed
      if (window.plugin.missions.isMissionListCollapsed) {
        let dia = $(openDialog).closest('.ui-dialog');
        let button = dia.find('.ui-dialog-titlebar-button-collapse');
        if (button) {
          $(button).click();
        }
      }
    } else {
      // If dialog is not open, open it
      window.dialog({
        id: 'missionsList',
        html: this.renderMissionList(missions),
        height: 'auto',
        width: '400px',
        collapseCallback: this.onCollapseMissionList,
        expandCallback: this.onExpandMissionList,
        dragStop: this.resizeMissionList,
        title: caption,
        buttons: [
          {
            text: 'Create new mission',
            click: function () {
              open('https://missions.ingress.com/');
            },
          },
          {
            text: 'Ok',
            click: function () {
              $(this).dialog('close');
            },
          },
          {
            text: 'Missions in view',
            css: { float: 'left', 'margin-right': '2px' },
            click: function () {
              window.plugin.missions.openTopMissions();
            },
            create: function () {
              // Store a link to the button so that we can hide or show it.
              window.plugin.missions.fromPortalListToNormalListButton = this;
            },
          },
        ],
      });

      this.isMissionListCollapsed = false;
    }

    // Dialog will be open now
    openDialog = window.DIALOGS['dialog-missionsList'];

    // Set content and title
    $(openDialog).html(this.renderMissionList(missions)).dialog({ title: caption });

    // When showing list for one portal, show button to switch back to general list, otherwise hide it
    $(window.plugin.missions.fromPortalListToNormalListButton)[isPortalList ? 'show' : 'hide']();

    this.resizeMissionList();
  },

  onCollapseMissionList: function () {
    window.plugin.missions.isMissionListCollapsed = true;
    window.plugin.missions.collapseFix();
  },

  onExpandMissionList: function () {
    window.plugin.missions.isMissionListCollapsed = false;
    window.plugin.missions.collapseFix();

    // When showing missions in View and not portal mission list, refresh list now
    if (!window.plugin.missions.isShowingPortalList) {
      window.plugin.missions.openTopMissions();
    }
  },

  resizeMissionList: function () {
    if (!window.plugin.missions.isMissionListCollapsed) {
      let openDialog = window.DIALOGS['dialog-missionsList'];

      if (openDialog) {
        // Make dialog choose height automatically based on content first
        // A few lines down we will restrict height to fit the screen
        $(openDialog).dialog({ height: 'auto' });

        // Restrict height of dialog to fit the screen
        let dialogHeight = $(openDialog).parent().height();
        let dialogTop = $(openDialog).parent().offset().top;
        let mapHeight = window.map.getSize().y;

        if (dialogTop + dialogHeight > mapHeight) {
          let newHeight = mapHeight - dialogTop;
          newHeight = Math.max(newHeight, 100);

          $(openDialog).dialog({
            height: newHeight,
          });
        }
      }
    }
  },

  collapseFix: function () {
    if (this && this.parentNode) {
      this.parentNode.style.height = 'auto';
    }
  },

  zoomToMission: function (mission) {
    window.map.fitBounds(this.getMissionBounds(mission), { maxZoom: window.DEFAULT_ZOOM });
  },

  getMissionBounds: function (mission) {
    var latlngs = mission.waypoints
      .filter(function (waypoint) {
        return !!waypoint.portal;
      })
      .map(function (waypoint) {
        return [waypoint.portal.latE6 / 1e6, waypoint.portal.lngE6 / 1e6];
      });

    return L.latLngBounds(latlngs);
  },

  loadMissionsInBounds: function (bounds, callback, errorcallback) {
    window.postAjax(
      'getTopMissionsInBounds',
      {
        northE6: (bounds.getNorth() * 1000000) | 0,
        southE6: (bounds.getSouth() * 1000000) | 0,
        westE6: (bounds.getWest() * 1000000) | 0,
        eastE6: (bounds.getEast() * 1000000) | 0,
      },
      function (data) {
        var missions = data.result.map(decodeMissionSummary);
        if (!missions) {
          if (errorcallback) {
            errorcallback('Invalid data');
          }
          return;
        }
        callback(missions, 'Missions in View');
      },
      function (error) {
        console.error('Error loading missions in bounds', arguments);
        if (errorcallback) {
          errorcallback(error);
        }
      }
    );
  },

  loadPortalMissions: function (guid, callback, errorcallback) {
    var me = this;
    // Mission summary rarely goes stale.
    if (me.cacheByPortalGuid[guid] && this.cacheByPortalGuid[guid].time > Date.now() - this.portalMissionsCacheTime) {
      callback(me.cacheByPortalGuid[guid].data);
      return;
    }
    window.postAjax(
      'getTopMissionsForPortal',
      {
        guid: guid,
      },
      function (data) {
        var missions = data.result.map(decodeMissionSummary);
        if (!missions) {
          if (errorcallback) {
            errorcallback('Invalid data');
          }
          return;
        }

        window.runHooks('plugin-missions-on-portal-loaded', { missions: missions, portalguid: guid });

        me.cacheByPortalGuid[guid] = {
          time: Date.now(),
          data: missions,
        };
        me.storeCache();
        callback(missions);
      },
      function (error) {
        console.error('Error loading portal missions', arguments);
        if (errorcallback) {
          errorcallback(error);
        }
        // awww
      }
    );
  },

  loadMission: function (guid, callback, errorcallback) {
    var me = this;
    // TODO: we need to refresh data often enough, portal data can quickly go stale
    if (this.cacheByMissionGuid[guid] && this.cacheByMissionGuid[guid].time > Date.now() - this.missionCacheTime) {
      callback(this.getMissionCache(guid, true));
      return;
    }
    window.postAjax(
      'getMissionDetails',
      {
        guid: guid,
      },
      function (data) {
        var mission = decodeMission(data.result);
        if (!mission) {
          if (errorcallback) {
            errorcallback('Invalid data');
          }
          return;
        }

        window.runHooks('plugin-missions-loaded-mission', { mission: mission });

        me.cacheByMissionGuid[guid] = {
          time: Date.now(),
          data: mission,
        };
        me.storeCache();

        callback(mission);
      },
      function (error) {
        console.error('Error loading mission data: ' + guid + ', ' + Array.prototype.slice.call(arguments));

        if (errorcallback) {
          errorcallback(error);
        }
        // awww
      }
    );
  },

  renderMissionList: function (missions) {
    var container = document.createElement('div');

    // Sort by name
    function compare(a, b) {
      if (a.title < b.title) {
        return -1;
      }
      if (a.title > b.title) {
        return 1;
      }
      return 0;
    }

    missions.sort(compare);

    missions.forEach(function (mission) {
      container.appendChild(this.renderMissionSummary(mission));
    }, this);
    return container;
  },

  renderMissionSummary: function (mission) {
    var cachedMission = this.getMissionCache(mission.guid);

    var checked = this.checkedMissions[mission.guid];

    var container = document.createElement('div');
    container.className = 'plugin-mission-summary';
    container.dataset['mission_mid'] = mission.guid;
    if (checked) {
      container.classList.add('checked');
    }

    var img = container.appendChild(document.createElement('img'));
    img.src = mission.image;
    img.addEventListener(
      'click',
      function () {
        window.plugin.missions.toggleMission(mission.guid);
      },
      false
    );

    var title = container.appendChild(document.createElement('a'));
    title.textContent = mission.title;
    title.href = '/mission/' + mission.guid;
    title.addEventListener(
      'click',
      function (ev) {
        this.openMission(mission.guid);
        // prevent browser from following link
        ev.preventDefault();
        return false;
      }.bind(this),
      false
    );

    if (cachedMission) {
      var span = container.appendChild(document.createElement('span'));
      span.className = 'nickname ' + (cachedMission.authorTeam === 'R' ? 'res' : 'enl');
      span.textContent = cachedMission.authorNickname;

      var len = cachedMission.waypoints
        .filter(function (waypoint) {
          return !!waypoint.portal;
        })
        .map(function (waypoint) {
          return L.latLng(waypoint.portal.latE6 / 1e6, waypoint.portal.lngE6 / 1e6);
        })
        .map(function (latlng1, i, latlngs) {
          if (i === 0) return 0;
          var latlng2 = latlngs[i - 1];
          return latlng1.distanceTo(latlng2);
        })
        .reduce(function (a, b) {
          return a + b;
        }, 0);

      if (len > 0) {
        if (len > 1000) {
          len = Math.round(len / 100) / 10 + 'km';
        } else {
          len = Math.round(len * 10) / 10 + 'm';
        }

        var infoLength = container.appendChild(document.createElement('span'));
        infoLength.className = 'plugin-mission-info length help';
        infoLength.title = 'Length of this mission.\n\nNOTE: The actual distance required to cover may vary depending on several factors!';
        infoLength.textContent = len;
        img = infoLength.insertBefore(document.createElement('img'), infoLength.firstChild);
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASAQMAAABsABwUAAAABlBMVEUAAACy+/gnk9HpAAAAAXRSTlMAQObYZgAAABVJREFUCNdjYEADB9Dg//8QjA7RAAB2VBF9TkATUAAAAABJRU5ErkJggg==';
      }

      if (window.plugin.distanceToPortal && window.plugin.distanceToPortal.currentLoc) {
        var infoDistance = container.appendChild(document.createElement('span'));
        infoDistance.className = 'plugin-mission-info distance help';
        infoDistance.title = 'Distance to this mission. Click to update.';
        infoDistance.addEventListener(
          'click',
          function () {
            window.plugin.missions.renderMissionDistance(cachedMission, infoDistance);
          },
          false
        );
        this.renderMissionDistance(cachedMission, infoDistance);
      }
    }

    container.appendChild(document.createElement('br'));

    var infoTime = container.appendChild(document.createElement('span'));
    infoTime.className = 'plugin-mission-info time help';
    infoTime.title = 'Typical duration';
    infoTime.textContent = timeToRemaining((mission.medianCompletionTimeMs / 1000) | 0) + ' ';
    img = infoTime.insertBefore(document.createElement('img'), infoTime.firstChild);
    img.src = 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons/time.png';

    var infoRating = container.appendChild(document.createElement('span'));
    infoRating.className = 'plugin-mission-info rating help';
    infoRating.title = 'Average rating';
    infoRating.textContent = ((mission.ratingE6 / 100) | 0) / 100 + '%' + ' ';
    img = infoRating.insertBefore(document.createElement('img'), infoRating.firstChild);
    img.src = 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons/like.png';

    if (cachedMission) {
      var infoPlayers = container.appendChild(document.createElement('span'));
      infoPlayers.className = 'plugin-mission-info players help';
      infoPlayers.title = 'Unique players who have completed this mission';
      infoPlayers.textContent = cachedMission.numUniqueCompletedPlayers + ' ';
      img = infoPlayers.insertBefore(document.createElement('img'), infoPlayers.firstChild);
      img.src = 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons/players.png';

      var infoWaypoints = container.appendChild(document.createElement('span'));
      infoWaypoints.className = 'plugin-mission-info waypoints help';
      infoWaypoints.title =
        (cachedMission.type ? cachedMission.type + ' mission' : 'Unknown mission type') + ' with ' + cachedMission.waypoints.length + ' waypoints';
      infoWaypoints.textContent = cachedMission.waypoints.length + ' ';
      img = infoWaypoints.insertBefore(document.createElement('img'), infoWaypoints.firstChild);
      img.src = this.missionTypeImages[cachedMission.typeNum] || this.missionTypeImages[0];
    }

    return container;
  },

  renderMissionDistance: function (mission, container) {
    if (!(window.plugin.distanceToPortal && window.plugin.distanceToPortal.currentLoc)) return;

    var distances = mission.waypoints
      .filter(function (waypoint) {
        return !!waypoint.portal;
      })
      .map(function (waypoint) {
        var position = L.latLng(waypoint.portal.latE6 / 1e6, waypoint.portal.lngE6 / 1e6);
        var distance = position.distanceTo(window.plugin.distanceToPortal.currentLoc);
        return {
          waypoint: waypoint,
          distance: distance,
          position: position,
        };
      });

    if (!distances.length) return;

    if (mission.typeNum === MissionOrder.NonSequential) {
      distances.sort(function (a, b) {
        return a.distance - b.distance;
      });
    }

    var position = distances[0].position;
    var distance = distances[0].distance;

    var bearing = window.plugin.distanceToPortal.currentLoc.bearingTo(position);

    $(container)
      .text(window.plugin.distanceToPortal.formatDistance(distance))
      .prepend(
        $('<span>')
          .addClass('portal-distance-bearing')
          .css({
            transform: 'rotate(' + bearing + 'deg)',
            '-moz-transform': 'rotate(' + bearing + 'deg)',
            '-webkit-transform': 'rotate(' + bearing + 'deg)',
          })
      );
  },

  renderMission: function (mission) {
    var container = document.createElement('div');
    container.className = 'plugin-mission-details';

    var summary = container.appendChild(this.renderMissionSummary(mission));

    var desc = summary.appendChild(document.createElement('p'));
    desc.className = 'description';
    desc.textContent = mission.description;

    var list = container.appendChild(document.createElement('ol'));
    mission.waypoints.forEach(function (waypoint, index) {
      list.appendChild(this.renderMissionWaypoint(waypoint, index, mission));
    }, this);

    return container;
  },

  renderMissionWaypoint: function (waypoint, index, mission) {
    var container = document.createElement('li');
    container.className = 'plugin-mission-waypoint';
    let title;

    if (waypoint.portal) {
      container.appendChild(this.renderPortalCircle(waypoint.portal));

      title = container.appendChild(document.createElement('a'));

      var lat = waypoint.portal.latE6 / 1e6;
      var lng = waypoint.portal.lngE6 / 1e6;
      var perma = window.makePermalink([lat, lng]);

      title.href = perma;
      title.addEventListener(
        'click',
        function (ev) {
          if (window.isSmartphone()) {
            window.show('map');
          }
          window.selectPortalByLatLng(lat, lng);
          ev.preventDefault();
          return false;
        },
        false
      );
      title.addEventListener(
        'dblclick',
        function (ev) {
          if (window.isSmartphone()) {
            window.show('map');
          }
          window.zoomToAndShowPortal(waypoint.portal.guid, [lat, lng]);
          ev.preventDefault();
          return false;
        },
        false
      );
    } else if (waypoint.typeNum === WaypointTarget.Portal) {
      // if portal is undefined, this waypoint is a deleted portal.
      title = container.appendChild(document.createElement('span'));
      container.classList.add('unavailable');
    } else {
      title = container.appendChild(document.createElement('span'));
    }

    title.className = 'title';
    if (waypoint.title) {
      title.textContent = waypoint.title;
    } else if (waypoint.portal && waypoint.portal.title) {
      title.textContent = waypoint.portal.title;
    } else {
      title.textContent = 'Unknown';
    }

    var mwpid = mission.guid + '-' + index + '-' + waypoint.guid;

    var label = container.appendChild(document.createElement('label'));

    var checkbox = label.appendChild(document.createElement('input'));
    checkbox.type = 'checkbox';
    checkbox.addEventListener(
      'change',
      function () {
        window.plugin.missions.toggleWaypoint(mission.guid, mwpid);
      },
      false
    );
    checkbox.dataset['mission_mwpid'] = mwpid;

    var objective = label.appendChild(document.createElement('span'));
    objective.textContent = waypoint.objective ? waypoint.objective : '?';

    return container;
  },

  renderPortalCircle: function (portal) {
    var team = window.TEAM_TO_CSS[window.getTeam(portal)];
    var resCount = portal.resCount;
    var level = resCount === 0 ? 0 : portal.level; // we want neutral portals to be level 0

    var container = document.createElement('div');
    container.className = 'plugin-mission-portal-indicator help ' + team;
    container.textContent = level;
    container.title = 'Level:\t' + level + '\nResonators:\t' + resCount + '\nHealth:\t' + portal.health + '%';

    for (var i = 0; i < resCount; i++) {
      var resonator = container.appendChild(document.createElement('div'));
      /* Firefox supports transform* without vendor prefix, but Android does not yet */
      resonator.style.webkitTransform = 'rotate(' + i * 45 + 'deg)';
      resonator.style.transform = 'rotate(' + i * 45 + 'deg)';
    }
    return container;
  },

  toggleWaypoint: function (mid, mwpid, dontsave) {
    if (this.checkedWaypoints[mwpid]) {
      delete this.checkedWaypoints[mwpid];
    } else {
      this.checkedWaypoints[mwpid] = true;
    }

    window.runHooks('plugin-missions-waypoint-changed', { mwpid: mwpid, local: true });
    if (!dontsave) {
      this.checkedWaypointsUpdateQueue[mwpid] = true;
      this.storeLocal('checkedWaypoints');
      this.storeLocal('checkedWaypointsUpdateQueue');
      this.syncQueue();
    }
  },

  onWaypointChanged: function (data) {
    var mwpid = data.mwpid;

    var checked = !!this.checkedWaypoints[mwpid];

    $('[data-mission_mwpid="' + mwpid + '"]').prop('checked', checked);
  },

  onWaypointsRefreshed: function () {
    var checkedWaypoints = this.checkedWaypoints;
    $('[data-mission_mwpid]').each(function (i, element) {
      var mwpid = element.dataset['mission_mwpid'];
      var checked = !!checkedWaypoints[mwpid];
      element.checked = checked;
    });
  },

  toggleMission: function (mid) {
    if (this.checkedMissions[mid]) {
      delete this.checkedMissions[mid];
    } else {
      this.checkedMissions[mid] = true;
    }

    window.runHooks('plugin-missions-mission-changed', { mid: mid, local: true });
    this.checkedMissionsUpdateQueue[mid] = true;
    this.storeLocal('checkedMissions');
    this.storeLocal('checkedMissionsUpdateQueue');
    this.syncQueue();
  },

  onMissionChanged: function (data) {
    var mid = data.mid;

    var checked = !!this.checkedMissions[mid];

    $('[data-mission_mid="' + mid + '"]').toggleClass('checked', checked);
  },

  onMissionsRefreshed: function () {
    var checkedMissions = this.checkedMissions;
    $('[data-mission_mid]').each(function (i, element) {
      var mid = element.dataset['mission_mid'];
      var checked = !!checkedMissions[mid];
      $(element).toggleClass('checked', checked);
    });
  },

  getMissionCache: function (guid, updatePortals) {
    if (this.cacheByMissionGuid[guid]) {
      var cache = this.cacheByMissionGuid[guid];
      // Update portal data from map if older then 2 minutes.
      if (updatePortals && cache.time < Date.now() - 2 * 60 * 1000) {
        cache.data.waypoints.map(function (waypoint) {
          if (!waypoint.portal) {
            return;
          }
          var wp = window.portals[waypoint.portal.guid];
          if (!wp) {
            return;
          }
          $.extend(waypoint.portal, wp.options.data);
        });
      }
      return cache.data;
    }
    return null;
  },

  getPortalCache: function (guid) {
    if (this.cacheByPortalGuid[guid]) {
      return this.cacheByPortalGuid[guid].data;
    }
    return null;
  },

  storeCache: function () {
    this.checkCacheSize();
    localStorage['plugins-missions-portalcache'] = JSON.stringify(this.cacheByPortalGuid);
    localStorage['plugins-missions-missioncache'] = JSON.stringify(this.cacheByMissionGuid);
  },

  storeLocal: function (key) {
    localStorage['plugins-missions-' + key] = JSON.stringify(this[key]);
  },

  loadData: function () {
    this.cacheByPortalGuid = JSON.parse(localStorage['plugins-missions-portalcache'] || '{}');
    this.cacheByMissionGuid = JSON.parse(localStorage['plugins-missions-missioncache'] || '{}');

    if ('plugins-missions-settings' in localStorage) {
      var settings = JSON.parse(localStorage['plugins-missions-settings'] || '{}');
      localStorage['plugins-missions-checkedMissions'] = JSON.stringify(settings.checkedMissions);
      localStorage['plugins-missions-checkedWaypoints'] = JSON.stringify(settings.checkedWaypoints);
      delete localStorage['plugins-missions-settings'];
    }

    this.loadLocal('checkedMissions');
    this.loadLocal('checkedMissionsUpdateQueue');
    this.loadLocal('checkedMissionsUpdatingQueue');
    this.loadLocal('checkedWaypoints');
    this.loadLocal('checkedWaypointsUpdateQueue');
    this.loadLocal('checkedWaypointsUpdatingQueue');

    this.autoRefreshOnMoveEnd = true;
  },

  loadLocal: function (key) {
    this[key] = JSON.parse(localStorage['plugins-missions-' + key] || '{}');
  },

  checkCacheSize: function () {
    if (JSON.stringify(this.cacheByPortalGuid).length > 1e6) {
      // 1 MB not MiB ;)
      this.cleanupPortalCache();
    }
    if (JSON.stringify(this.cacheByMissionGuid).length > 2e6) {
      // 2 MB not MiB ;)
      this.cleanupMissionCache();
    }
  },

  // Cleanup oldest half of the data.
  cleanupPortalCache: function () {
    var me = this;
    var cache = Object.keys(this.cacheByPortalGuid);
    cache.sort(function (a, b) {
      return me.cacheByPortalGuid[a].time - me.cacheByPortalGuid[b].time;
    });
    var toDelete = (cache.length / 2) | 0;
    cache.splice(0, toDelete + 1).forEach(function (el) {
      delete me.cacheByPortalGuid[el];
    });
  },

  // Cleanup oldest half of the data.
  cleanupMissionCache: function () {
    var me = this;
    var cache = Object.keys(this.cacheByMissionGuid);
    cache.sort(function (a, b) {
      return me.cacheByMissionGuid[a].time - me.cacheByMissionGuid[b].time;
    });
    var toDelete = (cache.length / 2) | 0;
    cache.splice(0, toDelete + 1).forEach(function (el) {
      delete me.cacheByMissionGuid[el];
    });
  },

  drawMission: function (mission) {
    var markers = [];
    var latlngs = [];

    mission.waypoints.forEach(function (waypoint) {
      if (!waypoint.portal) {
        return;
      }

      var radius = window.portals[waypoint.portal.guid] ? window.portals[waypoint.portal.guid].options.radius * 1.75 : 5;
      var ll = [waypoint.portal.latE6 / 1e6, waypoint.portal.lngE6 / 1e6];
      latlngs.push(ll);

      var marker = L.circleMarker(ll, {
        radius: radius,
        weight: 3,
        opacity: 1,
        color: this.MISSION_COLOR,
        fill: false,
        dashArray: null,
        interactive: false,
      });
      this.missionLayer.addLayer(marker);
      markers.push(marker);
    }, this);

    var line = L.geodesicPolyline(latlngs, {
      color: this.MISSION_COLOR,
      opacity: 1,
      weight: 2,
      interactive: false,
      dashArray: mission.typeNum === MissionOrder.NonSequential ? '1,5' : undefined,
    });
    this.missionLayer.addLayer(line);
    markers.push(line);
    return markers;
  },

  removeMissionLayers: function (markers) {
    markers.forEach(function (marker) {
      this.missionLayer.removeLayer(marker);
    }, this);
  },

  highlightMissionLayers: function (markers) {
    // layer.bringToFront() will break if the layer is not visible
    var bringToFront = window.map.hasLayer(window.plugin.missions.missionLayer);

    this.missionLayer.eachLayer(function (layer) {
      var active = markers.indexOf(layer) !== -1;
      layer.setStyle({
        color: active ? this.MISSION_COLOR_ACTIVE : this.MISSION_COLOR,
      });
      if (active && bringToFront) layer.bringToFront();
    }, this);
  },

  onPortalChanged: function (type, guid, oldval) {
    var portal;
    if (type === 'add' || type === 'update') {
      // Compatibility
      portal = window.portals[guid] || oldval;
      if (!portal.options.data.mission && !portal.options.data.mission50plus) {
        return;
      }
      if (this.markedStarterPortals[guid]) {
        return;
      }

      this.markedStarterPortals[guid] = L.circleMarker(L.latLng(portal.options.data.latE6 / 1e6, portal.options.data.lngE6 / 1e6), {
        radius: portal.options.radius + Math.ceil(portal.options.radius / 2),
        weight: 3,
        opacity: 1,
        color: this.MISSION_COLOR_START,
        fill: false,
        dashArray: null,
        interactive: false,
      });
      this.missionStartLayer.addLayer(this.markedStarterPortals[guid]);
    } else if (type === 'delete') {
      if (!this.markedStarterPortals[guid]) {
        return;
      }

      this.missionStartLayer.removeLayer(this.markedStarterPortals[guid]);
      delete this.markedStarterPortals[guid];
    }
  },

  // sync the queue, but delay the actual sync to group a few updates in a single request
  syncQueue: function () {
    if (!this.enableSync) return;

    clearTimeout(this.syncTimer);

    this.syncTimer = setTimeout(
      function () {
        this.syncTimer = null;

        $.extend(this.checkedMissionsUpdatingQueue, this.checkedMissionsUpdateQueue);
        this.checkedMissionsUpdateQueue = {};
        this.storeLocal('checkedMissionsUpdatingQueue');
        this.storeLocal('checkedMissionsUpdateQueue');
        window.plugin.sync.updateMap('missions', 'checkedMissions', Object.keys(this.checkedMissionsUpdatingQueue));

        $.extend(this.checkedWaypointsUpdatingQueue, this.checkedWaypointsUpdateQueue);
        this.checkedWaypointsUpdateQueue = {};
        this.storeLocal('checkedWaypointsUpdatingQueue');
        this.storeLocal('checkedWaypointsUpdateQueue');
        window.plugin.sync.updateMap('missions', 'checkedWaypoints', Object.keys(this.checkedWaypointsUpdatingQueue));
      }.bind(this),
      this.SYNC_DELAY
    );
  },

  // called after IITC and all plugin loaded
  onIITCLoaded: function () {
    var match = location.pathname.match(/\/mission\/([0-9a-z.]+)/);
    if (match && match[1]) {
      var mid = match[1];

      this.loadMission(
        mid,
        function (mission) {
          this.openMission(mid);
          this.zoomToMission(mission);
        }.bind(this)
      );
    }
  },

  // called after local or remote change uploaded
  syncCallback: function (pluginName, fieldName, e, fullUpdated) {
    this.storeLocal(fieldName);
    // All data is replaced if another client updates the data while this client was offline,
    // fire a complete refresh
    if (fullUpdated) {
      if (fieldName === 'checkedMissions') {
        window.runHooks('plugin-missions-missions-refreshed');
      } else if (fieldName === 'checkedWaypoints') {
        window.runHooks('plugin-missions-waypoints-refreshed');
      }
      return;
    }

    if (!e) return;
    if (e.isLocal) {
      // Update pushed successfully, remove it from updatingQueue
      delete this[fieldName + 'UpdatingQueue'][e.property];
    } else {
      // Remote update
      delete this[fieldName + 'UpdateQueue'][e.property];
      this.storeLocal(fieldName + 'UpdateQueue');

      if (fieldName === 'checkedMissions') {
        window.runHooks('plugin-missions-mission-changed', { mid: e.property, local: false });
      } else if (fieldName === 'checkedWaypoints') {
        window.runHooks('plugin-missions-waypoint-changed', { mwpid: e.property, local: false });
      }
    }
  },

  // syncing of the field is initialed, upload all queued update
  syncInitialed: function (pluginName, fieldName) {
    this.enableSync = true;
    if (Object.keys(this[fieldName + 'UpdateQueue']).length > 0) {
      this.syncQueue();
    }
  },

  onPaneChanged: function (pane) {
    if (pane === 'plugin-missions') {
      document.body.appendChild(this.mobilePane);
    } else if (this.mobilePane.parentNode) {
      this.mobilePane.parentNode.removeChild(this.mobilePane);
    }
  },

  onMoveEnd: function () {
    // When autorefresh is enabled (currently always)
    // and not showing mission list of one portal
    // and window not collapsed
    if (this.autoRefreshOnMoveEnd && !this.isShowingPortalList && !this.isMissionListCollapsed) {
      // and if dialog is visible
      if (window.DIALOGS['dialog-missionsList']) {
        // then refresh the mission list
        this.openTopMissions();
      }
    }
  },

  onSearch: function (query) {
    var self = this;

    var bounds = window.map.getBounds();

    if (query.confirmed) {
      this.loadMissionsInBounds(bounds, function (missions) {
        self.addMissionsToQuery(query, missions);
      });
    }

    var cachedMissions = Object.keys(this.cacheByMissionGuid).map(function (guid) {
      return self.cacheByMissionGuid[guid].data;
    });

    var cachedMissionsInView = cachedMissions.filter(function (mission) {
      return (
        mission.waypoints &&
        mission.waypoints.some(function (waypoint) {
          if (!waypoint) return false;
          if (!waypoint.portal) return false;
          return bounds.contains([waypoint.portal.latE6 / 1e6, waypoint.portal.lngE6 / 1e6]);
        })
      );
    });

    self.addMissionsToQuery(query, cachedMissionsInView);
  },

  addMissionsToQuery: function (query, missions) {
    var term = query.term.toLowerCase();

    missions.forEach(function (mission) {
      if (mission.title.toLowerCase().indexOf(term) === -1 && (!mission.description || mission.description.toLowerCase().indexOf(term) === -1)) {
        return;
      }

      if (
        query.results.some(function (result) {
          return result.mission && result.mission.guid === mission.guid;
        })
      ) {
        // mission already in list (a cached mission may be found again via missions in bounds)
        return;
      }

      var result = {
        title: window.escapeHtmlSpecialChars(mission.title),
        description: mission.description
          ? 'Recently viewed mission: <small class="plugin-mission-search-result-desc">' + window.escapeHtmlSpecialChars(mission.description) + '</small>'
          : 'Mission in view',
        icon: 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons/tm_cyan.png',
        onSelected: this.onSearchResultSelected.bind(this),
        mission: mission,
        layer: null, // prevent a preview, we'll handle this
      };

      // mission may be a cached mission or contain the full details
      if (mission.waypoints) {
        result.bounds = this.getMissionBounds(mission);
      }
      if (mission.typeNum) {
        result.icon = this.missionTypeImages[mission.typeNum] || this.missionTypeImages[0];
      }

      query.addResult(result);
    }, this);
  },

  onSearchResultSelected: function (result) {
    if (result.bounds) {
      window.map.fitBounds(result.bounds, { maxZoom: window.DEFAULT_ZOOM });
    }

    this.openMission(result.mission.guid);
    return false;
  },

  setup: function () {
    this.cacheByPortalGuid = {};
    this.cacheByMissionGuid = {};

    this.markedStarterPortals = {};
    this.markedMissionPortals = {};

    this.loadData();

    $('<style>').prop('type', 'text/css').html('\
.plugin-mission-pane {\
	background: transparent;\
	border: 0 none !important;\
	height: 100% !important;\
	width: 100% !important;\
	left: 0 !important;\
	top: 0 !important;\
	position: absolute;\
	overflow: auto;\
}\
.plugin-mission-pane > button {\
	padding: 0.3em 2em;\
}\
\
.plugin-mission-summary {\
	padding: 5px;\
	border-top: black solid 1px;\
	min-height: 50px;\
	position: relative;\
	clear: left;\
}\
.plugin-mission-summary.checked::after {\
	content: "✓";\
	display: block;\
	pointer-events: none;\
	position: absolute;\
	text-align: center;\
	color: rgba(255, 187, 0, 0.3);\
	left: 5px;\
	top: 5px;\
	font-size: 50px;\
	line-height: 50px;\
	width: 50px;\
}\
.plugin-mission-summary:first-child {\
	border-top-width: 0px;\
}\
\
.plugin-mission-summary.checked {\
	background-color: rgba(255, 187, 0, 0.3);\
}\
\
.plugin-mission-summary > img {\
	float: left;\
	cursor: pointer;\
	width: 50px;\
	margin-right: 10px;\
	margin-bottom: 5px;\
}\
\
.plugin-mission-summary > a {\
	display: block;\
	font-weight: bold;\
	font-size: 1.3em;\
	margin: 0 0 2px 60px;\
}\
\
.plugin-mission-summary > br {\
	margin-bottom: 2px;\
}\
\
.plugin-mission-summary > .nickname {\
	display: inline-block;\
	box-sizing: border-box;\
	min-width: 8em; /* to align with time */\
	padding-right: 0.2em;\
}\
\
.plugin-mission-info .portal-distance-bearing {\
	font-size: 14px;\
	margin-right: 8px;\
	color: #b2fbff;\
}\
\
.plugin-mission-info {\
	display: inline-block;\
}\
.plugin-mission-info.length   { min-width: 6em; }\
.plugin-mission-info.distance { min-width: 6em; }\
.plugin-mission-info.time     { min-width: 8em; }\
.plugin-mission-info.rating   { min-width: 6em; }\
.plugin-mission-info.players  { min-width: 4em; }\
.plugin-mission-info.type     { min-width: 4em; }\
\
.plugin-mission-info img {\
	height: 14px;\
	margin-right: 8px;\
	vertical-align: top;\
}\
.plugin-mission-info.players img {\
	padding: 0 3px; /* the icon is 12x18 */\
}\
\
.plugin-mission-details .plugin-mission-summary > a,\
.plugin-mission-details .plugin-mission-summary .description {\
	white-space: pre-line;\
	margin-left: 110px;\
}\
\
.plugin-mission-details .plugin-mission-summary.checked::after {\
	left: 0px;\
	top: 0px;\
	font-size: 100px;\
	line-height: 100px;\
	width: 100px;\
}\
\
.plugin-mission-details .plugin-mission-summary {\
	padding: 0;\
	background-color: transparent;\
}\
\
.plugin-mission-details .plugin-mission-summary > img {\
	width: 100px;\
}\
\
.plugin-mission-details ol {\
	clear: left;\
	list-style: none;\
	margin: 10px 0 0;\
	padding: 0;\
}\
\
.plugin-mission-portal-indicator {\
	position: relative;\
	text-align: center;\
	float: left;\
	line-height: 18px;\
	height: 18px;\
	width: 18px;\
	margin-right: 5px;\
}\
\
.plugin-mission-portal-indicator div {\
	border-color: currentcolor transparent transparent;\
	border-style: solid;\
	border-width: 2px 1px;\
	box-sizing: border-box;\
	height: 0;\
	left: 6px;\
	position: absolute;\
	top: 0;\
	/* Firefox supports transform* without vendor prefix, but Android does not yet */\
	transform-origin: 4px 9px 0;\
	-webkit-transform-origin: 4px 9px 0;\
	width: 8px;\
}\
\
.plugin-mission-waypoint.unavailable {\
	text-decoration: line-through;\
}\
.plugin-mission-waypoint .title {\
	font-size: 18px;\
	font-weight: bold;\
}\
.plugin-mission-waypoint label {\
	clear: left;\
	display: block;\
}\
.plugin-mission-waypoint input {\
	box-sizing: border-box;\
	margin: 3px 5px 8px 0;\
	width: 18px;\
}\
\
.plugin-mission-search-result-desc {\
	display: block;\
	max-height: 2em;\
	overflow: hidden;\
	text-overflow: ellipsis;\
	white-space: nowrap;\
}\
\
').appendTo('head');
    IITC.toolbox.addButton({
      label: 'Missions in view',
      action: () => window.plugin.missions.openTopMissions(),
    });

    if (window.useAppPanes()) {
      this.mobilePane = document.createElement('div');
      this.mobilePane.className = 'plugin-mission-pane';

      var button = this.mobilePane.appendChild(document.createElement('button'));
      button.textContent = 'Missions in view';
      button.addEventListener(
        'click',
        function () {
          this.openTopMissions();
        }.bind(this),
        false
      );

      this.tabs = this.mobilePane.appendChild(document.createElement('div'));
      this.tabBar = this.tabs.appendChild(document.createElement('ul'));
      this.tabHeaders = {};
      this.tabMarkers = {};

      $(this.tabs)
        .tabs({
          activate: function (event, ui) {
            if (!ui.newTab) return;

            var header = $(ui.newTab)[0];
            var id = header.dataset['mission_id'];
            this.highlightMissionLayers(this.tabMarkers[id]);
          }.bind(this),
        })
        .find('.ui-tabs-nav')
        .sortable({
          axis: 'x',
          stop: function () {
            $(this.tabs).tabs('refresh');
          },
        });

      window.app.addPane('plugin-missions', 'Missions', 'ic_missions');
      window.addHook('paneChanged', this.onPaneChanged.bind(this));
    }

    // window.addPortalHighlighter('Mission start point', this.highlight.bind(this));
    window.addHook('portalDetailsUpdated', this.onPortalDetailsUpdated.bind(this));

    window.addHook('search', this.onSearch.bind(this));

    window.map.on('moveend', this.onMoveEnd, this);

    var me = this;
    window.addHook('portalAdded', function (data) {
      me.onPortalChanged('add', data.portal.options.guid, data.portal);
    });
    window.addHook('portalRemoved', function (data) {
      me.onPortalChanged('delete', data.portal.options.guid, data.portal);
    });

    this.missionStartLayer = new L.LayerGroup();
    this.missionLayer = new L.LayerGroup();

    window.layerChooser.addOverlay(this.missionStartLayer, 'Mission start portals', { default: false });
    window.layerChooser.addOverlay(this.missionLayer, 'Mission portals');

    // HOOKS:
    // - plugin-missions-loaded-mission
    // - plugin-missions-on-portal-loaded
    // - plugin-missions-mission-changed
    // - plugin-missions-missions-refreshed
    // - plugin-missions-waypoint-changed
    // - plugin-missions-waypoints-refreshed

    window.addHook('plugin-missions-mission-changed', this.onMissionChanged.bind(this));
    window.addHook('plugin-missions-missions-refreshed', this.onMissionsRefreshed.bind(this));
    window.addHook('plugin-missions-waypoint-changed', this.onWaypointChanged.bind(this));
    window.addHook('plugin-missions-waypoints-refreshed', this.onWaypointsRefreshed.bind(this));

    if (window.plugin.sync) {
      window.plugin.sync.registerMapForSync('missions', 'checkedMissions', this.syncCallback.bind(this), this.syncInitialed.bind(this));
      window.plugin.sync.registerMapForSync('missions', 'checkedWaypoints', this.syncCallback.bind(this), this.syncInitialed.bind(this));
    }

    setTimeout(this.onIITCLoaded.bind(this));
  },
};

var setup = window.plugin.missions.setup.bind(window.plugin.missions);
setup.priority = 'low';

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

