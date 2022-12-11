// ==UserScript==
// @author         boombuler
// @name           IITC plugin: Tidy Links
// @category       Draw
// @version        0.6.0.20221211.172748
// @description    Calculate how to link the portals to create a reasonably tidy set of links/fields. Enable from the layer chooser. (former `Max Links`)
// @id             tidy-links
// @namespace      https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL      https://iitc.app/build/beta/plugins/tidy-links.meta.js
// @downloadURL    https://iitc.app/build/beta/plugins/tidy-links.user.js
// @match          https://intel.ingress.com/*
// @match          https://intel-x.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'beta';
plugin_info.dateTimeVersion = '2022-12-11-172748';
plugin_info.pluginId = 'tidy-links';
//END PLUGIN AUTHORS NOTE


// use own namespace for plugin
var tidyLinks = {};
window.plugin.tidyLinks = tidyLinks;

tidyLinks.MAX_PORTALS_TO_LINK = 200; // N.B.: this limit is not about performance

// zoom level used for projecting points between latLng and pixel coordinates. may affect precision of triangulation
tidyLinks.PROJECT_ZOOM = 16;

tidyLinks.STROKE_STYLE = { // https://leafletjs.com/reference-1.4.0.html#polyline-stroke
  color: 'red',
  opacity: 1,
  weight: 1.5,
  dashArray: '6,4',
  interactive: false
};

var map;

tidyLinks.getLocations = function (limit) {
  var filters = plugin.drawTools && plugin.drawTools.getLocationFilters && plugin.drawTools.getLocationFilters();
  // fallback to map bounds if no drawn polygon (or no drawtools)
  if (!filters || !filters.length) {
    var bounds = map.getBounds();
    filters = [function (p) {
      return bounds.contains(p.getLatLng());
    }];
  }

  var locationsArray = [];
  var counter = 0;
  filters.forEach(function (filter) {
    var points = [];
    for (var guid in window.portals) {
      if (limit) {
        counter++;
        if (counter > limit) { return; }
      }
      var location = window.portals[guid];
      if (filter(location)) {
        points.push(location);
      }
    }
    if (!points.length) return;
    locationsArray.push(points);
  });
  return locationsArray;
};

tidyLinks.draw = function (locations, layer) {
  var triangles = tidyLinks.Delaunay.triangulate(locations.map(function(location) {
    return [location._point.x, location._point.y];
  }));

  var drawnLinks = {};

  // draw a link, but only if it hasn't already been drawn
  function drawLink (a,b) {
    // order the points, so a pair of coordinates in any order is handled in one direction only
    if (a>b) { b = [a, a = b][0]; } // swap

    if (!(a in drawnLinks)) { // no lines from a to anywhere yet
      drawnLinks[a] = {};
    }

    if (!(b in drawnLinks[a])) { // no line from a to b yet
      drawnLinks[a][b] = true;
      var aLL = locations[a].getLatLng();
      var bLL = locations[b].getLatLng();
      L.polyline([aLL, bLL], tidyLinks.STROKE_STYLE).addTo(layer);
    }
  }
  for (var i = 0; i<triangles.length;) {
    var a = triangles[i++],
        b = triangles[i++],
        c = triangles[i++];
    drawLink(a,b);
    drawLink(b,c);
    drawLink(c,a);
  }
};

tidyLinks.setOverflow = function (isOveflowed) {
  tidyLinks.layer[isOveflowed ? 'openTooltip' : 'closeTooltip']();
};

tidyLinks.update = function () {
  var locationsArray = tidyLinks.getLocations();
  if (locationsArray.length) {
    tidyLinks.layer.clearLayers();
    locationsArray.forEach(function (locations) {
      tidyLinks.draw(locations, tidyLinks.layer);
    });
  }
  tidyLinks.setOverflow(!locationsArray.length);
};

function setup () {
  tidyLinks.Delaunay = loadDelaunay();

  map = window.map;
  tidyLinks.layer = L.layerGroup([])
    .on('add', function () {
      tidyLinks.update();
      window.addHook('mapDataRefreshEnd', tidyLinks.update);
      if (plugin.drawTools && plugin.drawTools.filterEvents) {
        plugin.drawTools.filterEvents.on('changed', tidyLinks.update);
      }
    })
    .on('remove', function () {
      window.removeHook('mapDataRefreshEnd', tidyLinks.update);
      if (plugin.drawTools && plugin.drawTools.filterEvents) {
        plugin.drawTools.filterEvents.off('changed', tidyLinks.update);
      }
    })
    .bindTooltip('Tidy Links: too many portals!', {
      className: 'tidy-links-error',
      direction: 'center'
    });
  tidyLinks.layer.getCenter = function () { return map.getCenter(); }; // for tooltip position

  window.layerChooser.addOverlay(tidyLinks.layer, 'Tidy Links', {default: false});

  $('<style>').html('\
    .tidy-links-error {\
      color: #F88;\
      font-size: 20px;\
      font-weight: bold;\
      text-align: center;\
      text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000;\
      background-color: rgba(0,0,0,0.6);\
      width: 300px;\
      border: none;\
    }\
  ').appendTo('head');
}

function loadDelaunay () {
  try {
    // https://github.com/ironwallaby/delaunay
    // *** included: external/delaunay.js ***
var Delaunay;

(function() {
  "use strict";

  var EPSILON = 1.0 / 1048576.0;

  function supertriangle(vertices) {
    var xmin = Number.POSITIVE_INFINITY,
        ymin = Number.POSITIVE_INFINITY,
        xmax = Number.NEGATIVE_INFINITY,
        ymax = Number.NEGATIVE_INFINITY,
        i, dx, dy, dmax, xmid, ymid;

    for(i = vertices.length; i--; ) {
      if(vertices[i][0] < xmin) xmin = vertices[i][0];
      if(vertices[i][0] > xmax) xmax = vertices[i][0];
      if(vertices[i][1] < ymin) ymin = vertices[i][1];
      if(vertices[i][1] > ymax) ymax = vertices[i][1];
    }

    dx = xmax - xmin;
    dy = ymax - ymin;
    dmax = Math.max(dx, dy);
    xmid = xmin + dx * 0.5;
    ymid = ymin + dy * 0.5;

    return [
      [xmid - 20 * dmax, ymid -      dmax],
      [xmid            , ymid + 20 * dmax],
      [xmid + 20 * dmax, ymid -      dmax]
    ];
  }

  function circumcircle(vertices, i, j, k) {
    var x1 = vertices[i][0],
        y1 = vertices[i][1],
        x2 = vertices[j][0],
        y2 = vertices[j][1],
        x3 = vertices[k][0],
        y3 = vertices[k][1],
        fabsy1y2 = Math.abs(y1 - y2),
        fabsy2y3 = Math.abs(y2 - y3),
        xc, yc, m1, m2, mx1, mx2, my1, my2, dx, dy;

    /* Check for coincident points */
    if(fabsy1y2 < EPSILON && fabsy2y3 < EPSILON)
      throw new Error("Eek! Coincident points!");

    if(fabsy1y2 < EPSILON) {
      m2  = -((x3 - x2) / (y3 - y2));
      mx2 = (x2 + x3) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (x2 + x1) / 2.0;
      yc  = m2 * (xc - mx2) + my2;
    }

    else if(fabsy2y3 < EPSILON) {
      m1  = -((x2 - x1) / (y2 - y1));
      mx1 = (x1 + x2) / 2.0;
      my1 = (y1 + y2) / 2.0;
      xc  = (x3 + x2) / 2.0;
      yc  = m1 * (xc - mx1) + my1;
    }

    else {
      m1  = -((x2 - x1) / (y2 - y1));
      m2  = -((x3 - x2) / (y3 - y2));
      mx1 = (x1 + x2) / 2.0;
      mx2 = (x2 + x3) / 2.0;
      my1 = (y1 + y2) / 2.0;
      my2 = (y2 + y3) / 2.0;
      xc  = (m1 * mx1 - m2 * mx2 + my2 - my1) / (m1 - m2);
      yc  = (fabsy1y2 > fabsy2y3) ?
        m1 * (xc - mx1) + my1 :
        m2 * (xc - mx2) + my2;
    }

    dx = x2 - xc;
    dy = y2 - yc;
    return {i: i, j: j, k: k, x: xc, y: yc, r: dx * dx + dy * dy};
  }

  function dedup(edges) {
    var i, j, a, b, m, n;

    for(j = edges.length; j; ) {
      b = edges[--j];
      a = edges[--j];

      for(i = j; i; ) {
        n = edges[--i];
        m = edges[--i];

        if((a === m && b === n) || (a === n && b === m)) {
          edges.splice(j, 2);
          edges.splice(i, 2);
          break;
        }
      }
    }
  }

  Delaunay = {
    triangulate: function(vertices, key) {
      var n = vertices.length,
          i, j, indices, st, open, closed, edges, dx, dy, a, b, c;

      /* Bail if there aren't enough vertices to form any triangles. */
      if(n < 3)
        return [];

      /* Slice out the actual vertices from the passed objects. (Duplicate the
       * array even if we don't, though, since we need to make a supertriangle
       * later on!) */
      vertices = vertices.slice(0);

      if(key)
        for(i = n; i--; )
          vertices[i] = vertices[i][key];

      /* Make an array of indices into the vertex array, sorted by the
       * vertices' x-position. Force stable sorting by comparing indices if
       * the x-positions are equal. */
      indices = new Array(n);

      for(i = n; i--; )
        indices[i] = i;

      indices.sort(function(i, j) {
        var diff = vertices[j][0] - vertices[i][0];
        return diff !== 0 ? diff : i - j;
      });

      /* Next, find the vertices of the supertriangle (which contains all other
       * triangles), and append them onto the end of a (copy of) the vertex
       * array. */
      st = supertriangle(vertices);
      vertices.push(st[0], st[1], st[2]);
      
      /* Initialize the open list (containing the supertriangle and nothing
       * else) and the closed list (which is empty since we havn't processed
       * any triangles yet). */
      open   = [circumcircle(vertices, n + 0, n + 1, n + 2)];
      closed = [];
      edges  = [];

      /* Incrementally add each vertex to the mesh. */
      for(i = indices.length; i--; edges.length = 0) {
        c = indices[i];

        /* For each open triangle, check to see if the current point is
         * inside it's circumcircle. If it is, remove the triangle and add
         * it's edges to an edge list. */
        for(j = open.length; j--; ) {
          /* If this point is to the right of this triangle's circumcircle,
           * then this triangle should never get checked again. Remove it
           * from the open list, add it to the closed list, and skip. */
          dx = vertices[c][0] - open[j].x;
          if(dx > 0.0 && dx * dx > open[j].r) {
            closed.push(open[j]);
            open.splice(j, 1);
            continue;
          }

          /* If we're outside the circumcircle, skip this triangle. */
          dy = vertices[c][1] - open[j].y;
          if(dx * dx + dy * dy - open[j].r > EPSILON)
            continue;

          /* Remove the triangle and add it's edges to the edge list. */
          edges.push(
            open[j].i, open[j].j,
            open[j].j, open[j].k,
            open[j].k, open[j].i
          );
          open.splice(j, 1);
        }

        /* Remove any doubled edges. */
        dedup(edges);

        /* Add a new triangle for each edge. */
        for(j = edges.length; j; ) {
          b = edges[--j];
          a = edges[--j];
          open.push(circumcircle(vertices, a, b, c));
        }
      }

      /* Copy any remaining open triangles to the closed list, and then
       * remove any triangles that share a vertex with the supertriangle,
       * building a list of triplets that represent triangles. */
      for(i = open.length; i--; )
        closed.push(open[i]);
      open.length = 0;

      for(i = closed.length; i--; )
        if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
          open.push(closed[i].i, closed[i].j, closed[i].k);

      /* Yay, we're done! */
      return open;
    },
    contains: function(tri, p) {
      /* Bounding box test first, for quick rejections. */
      if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
         (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
         (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
         (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1]))
        return null;

      var a = tri[1][0] - tri[0][0],
          b = tri[2][0] - tri[0][0],
          c = tri[1][1] - tri[0][1],
          d = tri[2][1] - tri[0][1],
          i = a * d - b * c;

      /* Degenerate tri. */
      if(i === 0.0)
        return null;

      var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
          v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

      /* If we're outside the tri, fail. */
      if(u < 0.0 || v < 0.0 || (u + v) > 1.0)
        return null;

      return [u, v];
    }
  };

  if(typeof module !== "undefined")
    module.exports = Delaunay;
})();


;

    return Delaunay;
  } catch (e) {
    console.error('delaunay.js loading failed');
    throw e;
  }
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

