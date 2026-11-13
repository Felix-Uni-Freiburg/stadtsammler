(function () {
  "use strict";
  var CITIES = window.CITIES, STATES = window.STATES, GERMANY = window.GERMANY;
  var BY_ID = {};
  CITIES.forEach(function (c) { BY_ID[c.id] = c; });
  var TOTAL_POP = CITIES.reduce(function (s, c) { return s + c.pop; }, 0);
  var $ = function (id) { return document.getElementById(id); };
  var nf = new Intl.NumberFormat("de-DE");
  var APP_VERSION = "dev";
  try { APP_VERSION = new URL(document.currentScript.src).searchParams.get("v") || "dev"; } catch (e) { /* dev */ }

  /* ---------- Daten ---------- */
  var KEY = "stadtsammler-v1";
  var data = { visited: {}, wish: {}, theme: "auto" };
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object") data = sanitize(raw);
  } catch (e) { /* leer starten */ }

  function sanitize(raw) {
    var out = { visited: {}, wish: {}, theme: ["auto", "dark", "light"].indexOf(raw.theme) >= 0 ? raw.theme : "auto" };
    Object.keys(raw.visited || {}).forEach(function (id) {
      if (!BY_ID[id]) return;
      var v = raw.visited[id] || {};
      out.visited[id] = {
        date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || "") ? v.date : "",
        note: String(v.note || "").slice(0, 500)
      };
    });
    Object.keys(raw.wish || {}).forEach(function (id) { if (BY_ID[id]) out.wish[id] = 1; });
    return out;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { toast("Speichern nicht möglich"); }
  }
  var isVisited = function (id) { return !!data.visited[id]; };

  /* ---------- Hilfen ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
  function shortName(n) { return n.split(/ am | im | an der | \(/)[0]; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmtDate(s) { if (!s) return ""; var p = s.split("-"); return p[2] + "." + p[1] + "." + p[0]; }
  function fmtPop(p) { return p >= 1e6 ? (p / 1e6).toFixed(1).replace(".", ",") + " Mio." : nf.format(p); }
  function km(a, b) {
    var R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  var toastTimer;
  function toast(msg, ms) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }
  var isDesktop = function () { return window.matchMedia("(min-width: 900px)").matches; };

  /* ---------- Abzeichen ---------- */
  var RUHR = ["dortmund", "essen", "duisburg", "bochum", "gelsenkirchen", "oberhausen", "hagen", "hamm", "muelheim-an-der-ruhr", "herne", "bottrop", "recklinghausen", "moers"];
  var RHEIN = ["karlsruhe", "ludwigshafen-am-rhein", "mannheim", "mainz", "wiesbaden", "koblenz", "bonn", "koeln", "leverkusen", "duesseldorf", "neuss", "krefeld", "duisburg"];
  var NORD = ["kiel", "luebeck", "rostock", "hamburg", "bremen", "bremerhaven", "oldenburg"];
  var OST = CITIES.filter(function (c) { return ["SN", "ST", "TH", "MV", "BB"].indexOf(c.state) >= 0; }).map(function (c) { return c.id; });
  var setBadge = function (ids) { return function () { return [ids.filter(isVisited).length, ids.length]; }; };
  var countBadge = function (n) { return function () { return [Math.min(n, Object.keys(data.visited).length), n]; }; };
  var BADGES = [
    { id: "first", em: "👣", name: "Erste Schritte", desc: "Deine erste Großstadt", fn: countBadge(1) },
    { id: "c10", em: "🎒", name: "Unterwegs", desc: "10 Großstädte besucht", fn: countBadge(10) },
    { id: "c25", em: "🚆", name: "Vielfahrer", desc: "25 Großstädte besucht", fn: countBadge(25) },
    { id: "half", em: "⚖️", name: "Halbzeit", desc: "Die Hälfte aller Großstädte", fn: countBadge(Math.ceil(CITIES.length / 2)) },
    { id: "all", em: "👑", name: "Alle " + CITIES.length, desc: "Jede deutsche Großstadt", fn: countBadge(CITIES.length) },
    { id: "mio", em: "🏙️", name: "Millionenclub", desc: "Berlin, Hamburg, München, Köln", fn: setBadge(["berlin", "hamburg", "muenchen", "koeln"]) },
    { id: "states", em: "🗺️", name: "16 von 16", desc: "Eine Stadt in jedem Bundesland", fn: function () {
        var s = {}; Object.keys(data.visited).forEach(function (id) { s[BY_ID[id].state] = 1; }); return [Object.keys(s).length, 16];
      } },
    { id: "land", em: "🏅", name: "Landesmeister", desc: "Ein Flächenland komplett", fn: function () {
        var best = 0;
        Object.keys(STATES).forEach(function (st) {
          var cs = CITIES.filter(function (c) { return c.state === st; });
          if (cs.length < 2 || st === "HB") return;
          best = Math.max(best, cs.filter(function (c) { return isVisited(c.id); }).length / cs.length);
        });
        return [Math.floor(best * 100), 100, "%"];
      } },
    { id: "ruhr", em: "⚒️", name: "Pott-Profi", desc: "Alle 13 Ruhrgebiets-Städte", fn: setBadge(RUHR) },
    { id: "rhein", em: "🚢", name: "Rheintour", desc: "Alle Großstädte am Rhein", fn: setBadge(RHEIN) },
    { id: "nord", em: "⚓", name: "Nordlicht", desc: "Alle Großstädte im hohen Norden", fn: setBadge(NORD) },
    { id: "ost", em: "🧭", name: "Ost-Runde", desc: "Alle Großstädte der fünf Ost-Länder", fn: setBadge(OST) },
    { id: "ecken", em: "📐", name: "Vier Ecken", desc: "Kiel, Cottbus, Freiburg, Aachen", fn: setBadge(["kiel", "cottbus", "freiburg-im-breisgau", "aachen"]) },
    { id: "staat", em: "🏛️", name: "Stadtstaaten", desc: "Berlin, Hamburg und Bremen", fn: setBadge(["berlin", "hamburg", "bremen"]) }
  ];
  function doneBadges() {
    return BADGES.filter(function (b) { var p = b.fn(); return p[0] >= p[1]; }).map(function (b) { return b.id; });
  }

  /* ---------- Karte ---------- */
  var map = L.map("map", {
    zoomControl: false, attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5,
    maxBoundsViscosity: 0.7, renderer: L.svg({ padding: 0.6 })
  });
  map.fitBounds([[47.2, 5.8], [55.1, 15.1]], { animate: false });
  var stateLayers = {};
  var stateLayer = L.geoJSON(GERMANY, {
    style: function () { return { className: "state" }; },
    onEachFeature: function (f, layer) {
      stateLayers[f.properties.id] = layer;
      layer.bindTooltip(function () {
        var s = stateStat(f.properties.id);
        return esc(f.properties.name) + " · " + s[0] + "/" + s[1];
      }, { sticky: true, className: "tt-state", direction: "top", offset: [0, -6] });
    }
  }).addTo(map);
  var bounds = stateLayer.getBounds();
  var baseZoom = 6;
  // Ränder, die Bedienelemente über der Karte belegen (Handy: Tab-Leiste unten, Knöpfe rechts)
  function fitPad() {
    if (isDesktop()) return { tl: [14, 14], br: [14, 14] };
    var nav = document.querySelector(".bottomnav").offsetHeight || 0;
    return { tl: [10, 10], br: [52, nav + 10] };
  }
  var userMoved = false;
  function fitGermany(animate) {
    if (map._loaded) map.invalidateSize();
    var pad = fitPad();
    map.setMinZoom(0);
    map.fitBounds(bounds, { paddingTopLeft: pad.tl, paddingBottomRight: pad.br, animate: !!animate });
    baseZoom = map.getZoom();
    map.setMinZoom(baseZoom - 0.5);
    map.setMaxZoom(baseZoom + 5);
    userMoved = false;
    updateZoomClass();
  }
  map.setMaxBounds(bounds.pad(0.5));

  var markers = {}, hits = {};
  var baseR = function (c) { return 3.5 + Math.sqrt(c.pop / 1e6) * 5; };
  var bySize = CITIES.slice().sort(function (a, b) { return b.pop - a.pop; });
  bySize.forEach(function (c) {
    var r = baseR(c), tier = c.pop >= 600000 ? 1 : c.pop >= 250000 ? 2 : 3;
    var vis = L.circleMarker([c.lat, c.lng], { radius: r, className: "city", interactive: false }).addTo(map);
    vis.bindTooltip(shortName(c.name), { permanent: true, direction: "right", offset: [r * 1.5 + 1, 0], className: "city-label tier-" + tier });
    markers[c.id] = vis;
  });
  // Klickflächen obenauf, kleine Städte zuletzt, damit sie im Ballungsraum erreichbar bleiben
  bySize.forEach(function (c) {
    hits[c.id] = L.circleMarker([c.lat, c.lng], { radius: baseR(c) + 6, className: "city-hit" }).addTo(map)
      .on("click", function (e) { L.DomEvent.stopPropagation(e); openSheet(c.id); });
  });
  map.on("click", closeSheet);
  function updateZoomClass() {
    var d = map.getZoom() - baseZoom, el = map.getContainer();
    el.classList.toggle("z0", d < 0.9);
    el.classList.toggle("z1", d >= 0.9 && d < 2);
    var k = 1 + Math.max(0, Math.min(d, 3)) * 0.3;
    CITIES.forEach(function (c) { markers[c.id].setRadius(baseR(c) * k); hits[c.id].setRadius(baseR(c) * k + 6); });
  }
  map.on("zoomend", updateZoomClass);
  var resizeTimer, lastSize = "";
  // iOS meldet die endgültige Fenstergröße der installierten App teils erst nach dem Start (ohne resize-Event)
  function onMapResize() {
    var el = map.getContainer(), sz = el.clientWidth + "x" + el.clientHeight;
    if (!el.clientWidth || sz === lastSize) return;
    lastSize = sz; map.invalidateSize();
    if (!userMoved) fitGermany(false);
  }
  map.on("dragstart", function () { userMoved = true; });
  map.on("dblclick", function () { userMoved = true; });
  map.getContainer().addEventListener("touchstart", function (e) { if (e.touches.length > 1) userMoved = true; }, { passive: true });
  map.getContainer().addEventListener("wheel", function () { userMoved = true; }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(onMapResize, 100); }).observe(map.getContainer());
  window.addEventListener("pageshow", function () { setTimeout(onMapResize, 50); });
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onMapResize, 150);
  });

  function stateStat(st) {
    var cs = CITIES.filter(function (c) { return c.state === st; });
    return [cs.filter(function (c) { return isVisited(c.id); }).length, cs.length];
  }
  function paintMap() {
    CITIES.forEach(function (c) {
      var el = markers[c.id].getElement(); if (!el) return;
      el.classList.toggle("visited", isVisited(c.id));
      el.classList.toggle("wish", !isVisited(c.id) && !!data.wish[c.id]);
      el.classList.toggle("selected", c.id === sheetId);
    });
    Object.keys(stateLayers).forEach(function (st) {
      var s = stateStat(st), share = s[1] ? s[0] / s[1] : 0;
      var level = share === 0 ? 0 : share >= 1 ? 4 : share >= 0.5 ? 3 : share >= 0.25 ? 2 : 1;
      var el = stateLayers[st].getElement(); if (el) el.setAttribute("data-level", level);
    });
  }

  /* ---------- Liste ---------- */
  var filter = "all", userPos = null;
  function renderList() {
    var q = $("search").value.trim().toLowerCase(), sort = $("sort").value;
    if (sort === "dist" && !userPos) sort = "pop";
    var rows = CITIES.filter(function (c) {
      if (q && c.name.toLowerCase().indexOf(q) < 0 && STATES[c.state].toLowerCase().indexOf(q) < 0) return false;
      if (filter === "visited") return isVisited(c.id);
      if (filter === "open") return !isVisited(c.id);
      if (filter === "wish") return !!data.wish[c.id] && !isVisited(c.id);
      return true;
    });
    rows.sort(function (a, b) {
      if (sort === "name") return a.name.localeCompare(b.name, "de");
      if (sort === "state") return STATES[a.state].localeCompare(STATES[b.state], "de") || b.pop - a.pop;
      if (sort === "dist") return km(userPos, a) - km(userPos, b);
      return b.pop - a.pop;
    });
    var html = "", lastState = null;
    rows.forEach(function (c) {
      if (sort === "state" && c.state !== lastState) {
        lastState = c.state; var s = stateStat(c.state);
        html += '<div class="group"><span>' + esc(STATES[c.state]) + "</span><span>" + s[0] + " / " + s[1] + "</span></div>";
      }
      var v = data.visited[c.id];
      var side = userPos ? Math.round(km(userPos, c)) + " km" : (v && v.date ? fmtDate(v.date) : "");
      html += '<div class="city-row' + (v ? " visited" : "") + (data.wish[c.id] ? " wish" : "") + '" data-id="' + c.id + '">' +
        '<button class="check" data-check="' + c.id + '" aria-label="' + esc(c.name) + ' als besucht markieren">✓</button>' +
        '<div class="city-main"><b>' + esc(c.name) + "</b><span>" + (sort === "state" ? "" : esc(STATES[c.state]) + " · ") + fmtPop(c.pop) + " Einw.</span></div>" +
        '<div class="city-side">' + side + "</div></div>";
    });
    if (!rows.length) {
      html = '<div class="empty">' + (filter === "wish" ? "Noch nichts auf der Wunschliste. Öffne eine Stadt und tippe auf „♡ Wunschliste“." :
        filter === "visited" ? "Noch keine Stadt abgehakt – los geht’s!" : "Keine Stadt gefunden.") + "</div>";
    }
    $("list").innerHTML = html;
  }
  $("list").addEventListener("click", function (e) {
    var chk = e.target.closest("[data-check]");
    if (chk) { toggleVisited(chk.getAttribute("data-check")); return; }
    var row = e.target.closest(".city-row");
    if (row) { openSheet(row.getAttribute("data-id")); if (isDesktop()) focusCity(row.getAttribute("data-id")); }
  });
  $("search").addEventListener("input", renderList);
  $("sort").addEventListener("change", function () {
    if ($("sort").value === "dist" && !userPos) { locate(function () { renderList(); }); return; }
    renderList();
  });
  $("filters").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    filter = b.getAttribute("data-f");
    Array.prototype.forEach.call($("filters").children, function (x) { x.classList.toggle("on", x === b); });
    renderList();
  });

  /* ---------- Statistik ---------- */
  function renderStats() {
    var ids = Object.keys(data.visited), n = ids.length, pct = Math.round(n / CITIES.length * 100);
    if (n > 0 && pct === 0) pct = 1;
    $("pillCount").textContent = n + " / " + CITIES.length;
    $("pillPct").textContent = pct + " %";
    $("pillBar").style.width = (n / CITIES.length * 100) + "%";
    $("ringPct").textContent = pct + " %";
    $("ringCount").textContent = n + " von " + CITIES.length + " Großstädten";
    $("ringFg").style.strokeDashoffset = 326.7 * (1 - n / CITIES.length);

    var pop = ids.reduce(function (s, id) { return s + BY_ID[id].pop; }, 0);
    var st = {}; ids.forEach(function (id) { st[BY_ID[id].state] = 1; });
    var years = {}; ids.forEach(function (id) { var d = data.visited[id].date; if (d) years[d.slice(0, 4)] = (years[d.slice(0, 4)] || 0) + 1; });
    var thisYear = years[String(new Date().getFullYear())] || 0;
    $("tiles").innerHTML =
      tile(Object.keys(st).length + " / 16", "Bundesländer") +
      tile(Math.round(pop / TOTAL_POP * 100) + " %", "der Großstadt-Einwohner") +
      tile(thisYear, "neue Städte dieses Jahr") +
      tile(Object.keys(data.wish).filter(function (id) { return !isVisited(id); }).length, "auf der Wunschliste");

    var done = 0;
    $("badges").innerHTML = BADGES.map(function (b) {
      var p = b.fn(), ok = p[0] >= p[1]; if (ok) done++;
      return '<div class="badge' + (ok ? " done" : "") + '"><div class="em">' + b.em + "</div><em>" + (ok ? "✓" : p[0] + (p[2] || "") + " / " + p[1] + (p[2] || "")) + "</em><b>" +
        esc(b.name) + "</b><span>" + esc(b.desc) + '</span><div class="bar"><i style="width:' + Math.min(100, p[0] / p[1] * 100) + '%"></i></div></div>';
    }).join("");
    $("badgeCount").textContent = "· " + done + " von " + BADGES.length;

    $("stateBars").innerHTML = Object.keys(STATES).map(function (k) { return [k, stateStat(k)]; })
      .sort(function (a, b) { return b[1][0] / b[1][1] - a[1][0] / a[1][1] || b[1][1] - a[1][1]; })
      .map(function (x) {
        return '<div class="sbar"><b>' + esc(STATES[x[0]]) + "</b><span>" + x[1][0] + " / " + x[1][1] +
          '</span><div class="bar"><i style="width:' + (x[1][0] / x[1][1] * 100) + '%"></i></div></div>';
      }).join("");

    var recent = ids.filter(function (id) { return data.visited[id].date; })
      .sort(function (a, b) { return data.visited[b].date.localeCompare(data.visited[a].date); }).slice(0, 6);
    $("recent").innerHTML = recent.length ? recent.map(function (id) {
      return '<div class="recent-row" data-id="' + id + '"><b>' + esc(BY_ID[id].name) + "</b><span>" + fmtDate(data.visited[id].date) + "</span></div>";
    }).join("") : '<div class="empty">Noch keine Besuche mit Datum.</div>';
  }
  function tile(v, l) { return '<div class="tile"><b>' + v + "</b><span>" + l + "</span></div>"; }
  $("recent").addEventListener("click", function (e) { var r = e.target.closest("[data-id]"); if (r) { go("map"); openSheet(r.getAttribute("data-id")); focusCity(r.getAttribute("data-id")); } });

  function refresh() { paintMap(); renderList(); renderStats(); if (sheetId) fillSheet(); }

  /* ---------- Besuch umschalten ---------- */
  function toggleVisited(id) {
    var before = doneBadges();
    if (isVisited(id)) {
      if (data.visited[id].note && !confirm("„" + BY_ID[id].name + "“ wirklich abwählen? Deine Notiz geht dabei verloren.")) return;
      delete data.visited[id];
    } else {
      data.visited[id] = { date: today(), note: "" };
      delete data.wish[id];
      var after = doneBadges().filter(function (b) { return before.indexOf(b) < 0; });
      if (after.length) {
        var b = BADGES.filter(function (x) { return x.id === after[0]; })[0];
        toast(b.em + " Abzeichen freigeschaltet: " + b.name, 4000); confetti(140);
      } else {
        toast("✓ " + shortName(BY_ID[id].name) + " – Stadt Nr. " + Object.keys(data.visited).length); confetti(40);
      }
    }
    save(); refresh();
  }

  /* ---------- Stadt-Karte (Sheet) ---------- */
  var sheetId = null;
  function openSheet(id) {
    sheetId = id; fillSheet(); $("sheet").hidden = false; paintMap();
    clearTimeout(keepTimer); keepTimer = setTimeout(keepCityVisible, 60);
  }
  var keepTimer;
  // Auf dem Handy verdeckt die Stadt-Karte den unteren Kartenteil: Stadt bei Bedarf nach oben schieben
  function keepCityVisible() {
    if (!sheetId || isDesktop() || document.body.getAttribute("data-tab") !== "map") return;
    var c = BY_ID[sheetId], pt = map.latLngToContainerPoint([c.lat, c.lng]);
    var free = $("sheet").getBoundingClientRect().top - map.getContainer().getBoundingClientRect().top - 40;
    if (pt.y > free) map.panBy([0, pt.y - free + 30], { duration: 0.35 });
  }
  function closeSheet() { if (!sheetId) return; sheetId = null; $("sheet").hidden = true; paintMap(); }
  function fillSheet() {
    var c = BY_ID[sheetId], v = data.visited[sheetId];
    $("sName").textContent = c.name;
    $("sMeta").textContent = STATES[c.state] + " · " + fmtPop(c.pop) + " Einwohner" + (userPos ? " · " + Math.round(km(userPos, c)) + " km entfernt" : "");
    $("sToggle").textContent = v ? "✓ Besucht – tippen zum Abwählen" : "Ich war hier";
    $("sToggle").classList.toggle("is-visited", !!v);
    $("sVisitedFields").hidden = !v;
    if (v) { $("sDate").max = today(); $("sDate").value = v.date || ""; if (document.activeElement !== $("sNote")) $("sNote").value = v.note || ""; }
    $("sWish").hidden = !!v;
    $("sWish").textContent = data.wish[sheetId] ? "♥ Gemerkt" : "♡ Wunschliste";
    $("sWish").classList.toggle("on-wish", !!data.wish[sheetId]);
    $("sWiki").href = "https://de.wikipedia.org/wiki/" + encodeURIComponent(c.name.replace(/ /g, "_"));
  }
  $("sToggle").addEventListener("click", function () {
    toggleVisited(sheetId); clearTimeout(keepTimer); keepTimer = setTimeout(keepCityVisible, 60);
  });
  $("sheetClose").addEventListener("click", closeSheet);
  $("sDate").addEventListener("change", function () {
    if (!data.visited[sheetId]) return;
    var d = $("sDate").value;
    data.visited[sheetId].date = /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today() ? d : "";
    if (d && !data.visited[sheetId].date) { $("sDate").value = ""; toast("Das Datum liegt in der Zukunft"); }
    save(); renderList(); renderStats();
  });
  $("sNote").addEventListener("input", function () {
    if (!data.visited[sheetId]) return;
    data.visited[sheetId].note = $("sNote").value.slice(0, 500); save();
  });
  $("sWish").addEventListener("click", function () {
    if (data.wish[sheetId]) delete data.wish[sheetId]; else { data.wish[sheetId] = 1; toast("♥ " + shortName(BY_ID[sheetId].name) + " steht auf der Wunschliste"); }
    save(); refresh();
  });
  function focusCity(id) {
    var c = BY_ID[id], z = Math.max(map.getZoom(), baseZoom + 1.25), target = L.latLng(c.lat, c.lng);
    clearTimeout(keepTimer);
    // Auf dem Handy liegt die Stadt-Karte über dem unteren Kartenteil: Ziel in den freien Bereich darüber legen
    if (!isDesktop() && sheetId) {
      var off = Math.min(map.getContainer().getBoundingClientRect().bottom - $("sheet").getBoundingClientRect().top, map.getSize().y * 0.7) / 2;
      target = map.unproject(map.project(target, z).add([0, off]), z);
    }
    userMoved = true;
    map.flyTo(target, z, { duration: 0.7 });
  }

  /* ---------- Navigation ---------- */
  function go(tab) {
    document.body.setAttribute("data-tab", tab);
    Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) {
      var t = b.getAttribute("data-go");
      b.classList.toggle("on", t === tab || (tab === "map" && t === "list" && b.parentNode.className === "panel-tabs"));
    });
    if (tab !== "map" && !isDesktop()) closeSheet();
    if (tab === "map") setTimeout(function () { map.invalidateSize(); }, 30);
  }
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-go]"); if (b) go(b.getAttribute("data-go")); });
  $("progressPill").addEventListener("click", function () { go("stats"); });

  /* ---------- Standort & Zufall ---------- */
  var meMarker = null;
  function locate(done) {
    if (!navigator.geolocation) { toast("Standort wird von diesem Gerät nicht unterstützt"); return; }
    $("btnNearby").classList.add("busy");
    navigator.geolocation.getCurrentPosition(function (p) {
      $("btnNearby").classList.remove("busy");
      userPos = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (meMarker) meMarker.setLatLng(userPos); else meMarker = L.circleMarker(userPos, { radius: 7, className: "me", interactive: false }).addTo(map);
      done();
    }, function () {
      $("btnNearby").classList.remove("busy"); $("sort").value = "pop";
      toast("Standort nicht verfügbar – bitte Zugriff erlauben");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
  }
  $("btnNearby").addEventListener("click", function () {
    locate(function () {
      $("sort").value = "dist"; renderList();
      var sorted = CITIES.slice().sort(function (a, b) { return km(userPos, a) - km(userPos, b); });
      var here = sorted[0], dHere = km(userPos, here);
      var target = here;
      if (dHere <= 15 && !isVisited(here.id)) toast("📍 Du bist in " + shortName(here.name) + " – gleich abhaken?", 4500);
      else {
        target = sorted.filter(function (c) { return !isVisited(c.id); })[0];
        if (!target) { toast("Du hast schon alle Städte besucht 👑"); return; }
        toast("Nächste offene Stadt: " + shortName(target.name) + " (" + Math.round(km(userPos, target)) + " km)", 4500);
      }
      go("map"); openSheet(target.id); focusCity(target.id);
    });
  });
  $("btnRandom").addEventListener("click", function () {
    var wish = CITIES.filter(function (c) { return !isVisited(c.id) && data.wish[c.id]; });
    var open = CITIES.filter(function (c) { return !isVisited(c.id); });
    var pool = wish.length && Math.random() < 0.5 ? wish : open;
    if (!pool.length) { toast("Du hast schon alle Städte besucht 👑"); return; }
    var c = pool[Math.floor(Math.random() * pool.length)];
    openSheet(c.id); focusCity(c.id); toast("🎲 Wie wär’s mit " + shortName(c.name) + "?");
  });
  $("btnFit").addEventListener("click", function () { closeSheet(); fitGermany(true); });

  /* ---------- Teilen ---------- */
  function drawShareCard() {
    var W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var g = cv.getContext("2d");
    var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#0a0f1e"); bg.addColorStop(1, "#16204a");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    var merc = function (lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); };
    var x0 = 5.8, x1 = 15.1, y0 = merc(47.2), y1 = merc(55.1);
    var bx = 250, by = 300, bh = 830, sc = bh / (y1 - y0), kx = sc * Math.PI / 180;
    var bw = (x1 - x0) * kx; bx = (W - bw) / 2;
    var P = function (lng, lat) { return [bx + (lng - x0) * kx, by + (y1 - merc(lat)) * sc]; };
    g.lineJoin = "round";
    GERMANY.features.forEach(function (f) {
      g.beginPath();
      f.geometry.coordinates.forEach(function (poly) { poly.forEach(function (ring) {
        ring.forEach(function (pt, i) { var p = P(pt[0], pt[1]); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
        g.closePath();
      }); });
      var s = stateStat(f.properties.id), share = s[0] / s[1];
      g.fillStyle = share ? "rgba(255,201,60," + (0.12 + share * 0.38) + ")" : "#18223f";
      g.fill("evenodd"); g.strokeStyle = "#4a5c99"; g.lineWidth = 2; g.stroke();
    });
    CITIES.forEach(function (c) {
      var p = P(c.lng, c.lat), r = 5 + Math.sqrt(c.pop / 1e6) * 8, v = isVisited(c.id);
      g.beginPath(); g.arc(p[0], p[1], r, 0, 7);
      g.shadowColor = v ? "#ffc93c" : "transparent"; g.shadowBlur = v ? 18 : 0;
      g.fillStyle = v ? "#ffc93c" : "#5b6a9c"; g.globalAlpha = v ? 1 : 0.55; g.fill();
      g.globalAlpha = 1; g.shadowBlur = 0;
    });
    var n = Object.keys(data.visited).length, st = {};
    Object.keys(data.visited).forEach(function (id) { st[BY_ID[id].state] = 1; });
    g.textAlign = "center"; g.fillStyle = "#ffc93c"; g.font = "800 150px -apple-system, 'Segoe UI', Roboto, sans-serif";
    g.fillText(n + " / " + CITIES.length, W / 2, 190);
    g.fillStyle = "#eef2ff"; g.font = "700 46px -apple-system, 'Segoe UI', Roboto, sans-serif";
    g.fillText("deutsche Großstädte besucht", W / 2, 258);
    g.fillStyle = "#8b97bd"; g.font = "600 36px -apple-system, 'Segoe UI', Roboto, sans-serif";
    g.fillText(Object.keys(st).length + " von 16 Bundesländern · " + doneBadges().length + " Abzeichen", W / 2, 1215);
    g.fillStyle = "#eef2ff"; g.font = "800 38px -apple-system, 'Segoe UI', Roboto, sans-serif";
    g.fillText("Stadtsammler", W / 2, 1285);
    return cv;
  }
  $("btnShare").addEventListener("click", function () {
    drawShareCard().toBlob(function (blob) {
      var file = new File([blob], "stadtsammler.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "Stadtsammler" }).catch(function () {});
      } else { download(blob, "stadtsammler.png"); toast("Bild gespeichert"); }
    }, "image/png");
  });
  function download(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  /* ---------- Backup ---------- */
  $("btnExport").addEventListener("click", function () {
    download(new Blob([JSON.stringify({ app: "stadtsammler", version: 1, visited: data.visited, wish: data.wish }, null, 2)], { type: "application/json" }),
      "stadtsammler-backup-" + today() + ".json");
  });
  $("btnImport").addEventListener("click", function () { $("fileImport").click(); });
  $("fileImport").addEventListener("change", function () {
    var f = $("fileImport").files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      $("fileImport").value = "";
      var inc;
      try {
        var parsed = JSON.parse(rd.result);
        if (!parsed || typeof parsed.visited !== "object") throw new Error("Format");
        inc = sanitize(parsed);
      } catch (e) { toast("Das ist keine gültige Backup-Datei"); return; }
      var n = Object.keys(inc.visited).length;
      if (!confirm("Backup mit " + n + " besuchten Städten laden? Dein aktueller Stand wird ersetzt.")) return;
      inc.theme = data.theme; data = inc; save(); closeSheet(); refresh(); toast("Backup geladen");
    };
    rd.readAsText(f);
  });
  $("btnReset").addEventListener("click", function () {
    if (!confirm("Wirklich alle besuchten Städte, Notizen und die Wunschliste löschen?")) return;
    data.visited = {}; data.wish = {}; save(); closeSheet(); refresh(); toast("Zurückgesetzt");
  });

  /* ---------- Design ---------- */
  var mq = window.matchMedia("(prefers-color-scheme: light)");
  function applyTheme() {
    var t = data.theme === "auto" ? (mq.matches ? "light" : "dark") : data.theme;
    document.documentElement.setAttribute("data-theme", t);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", t === "light" ? "#ffffff" : "#121a30");
  }
  $("theme").value = data.theme;
  $("theme").addEventListener("change", function () { data.theme = $("theme").value; save(); applyTheme(); });
  if (mq.addEventListener) mq.addEventListener("change", applyTheme);

  /* ---------- Konfetti ---------- */
  var parts = [], confRaf = null;
  function confetti(n) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cv = $("confetti"), g = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    var colors = ["#ffc93c", "#ff6b9d", "#4ade80", "#3b9dff", "#ffffff"];
    for (var i = 0; i < n; i++) parts.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.55, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 5,
      s: 5 + Math.random() * 6, c: colors[i % colors.length], r: Math.random() * 6, life: 90 + Math.random() * 40
    });
    if (confRaf) return;
    (function tick() {
      g.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 20; });
      parts.forEach(function (p) {
        p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += 0.2; p.life--;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.life / 30);
        g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
      });
      confRaf = parts.length ? requestAnimationFrame(tick) : null;
      if (!confRaf) g.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  /* ---------- PWA ---------- */
  var installEvt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); installEvt = e; $("btnInstall").hidden = false; });
  $("btnInstall").addEventListener("click", function () { if (installEvt) { installEvt.prompt(); installEvt = null; $("btnInstall").hidden = true; } });
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) $("iosHint").hidden = false;
  var canSW = "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost");
  if (canSW) navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).catch(function () {});

  /* ---------- Updates ---------- */
  var lastCheck = 0, dismissed = null;
  function newer(a, b) { // true, wenn Version a neuer ist als b
    var x = String(a).split("."), y = String(b).split(".");
    for (var i = 0; i < 3; i++) { var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d > 0; }
    return false;
  }
  function checkUpdate(manual) {
    if (APP_VERSION === "dev") { if (manual) toast("Entwicklungsversion – keine Updates"); return; }
    if (!manual && Date.now() - lastCheck < 15000) return;
    lastCheck = Date.now();
    fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (v) {
      if (v && v.version && newer(v.version, APP_VERSION)) {
        if (!manual && dismissed === v.version) return;
        $("updateTitle").textContent = "Version " + v.version + " ist da";
        $("updateNotes").textContent = v.notes || "Tippe auf Aktualisieren, um sie zu laden.";
        $("updateBar").hidden = false;
        $("verInfo").textContent = "Version " + APP_VERSION + " · Update auf " + v.version + " verfügbar";
        dismissed = null; $("updateBar").setAttribute("data-version", v.version);
      } else if (manual) toast("Du hast die neueste Version (" + APP_VERSION + ")");
    }).catch(function () { if (manual) toast("Keine Verbindung – Update-Suche gerade nicht möglich"); });
  }
  function applyUpdate() {
    $("btnUpdate").disabled = true; $("btnUpdate").textContent = "Lädt …";
    try { sessionStorage.setItem("stadtsammler-updated", APP_VERSION); } catch (e) { /* egal */ }
    // Nicht auf den Service Worker warten: auf iOS kommt dessen Antwort teils nie zurück.
    // Neu laden reicht, weil der Service Worker online immer die neuesten Dateien holt.
    var done = false, go = function () { if (done) return; done = true; location.reload(); };
    if (canSW) navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().then(go, go); }).catch(go);
    setTimeout(go, 800);
  }
  $("verInfo").textContent = "Version " + APP_VERSION;
  $("btnCheckUpdate").addEventListener("click", function () { checkUpdate(true); });
  $("btnUpdate").addEventListener("click", applyUpdate);
  $("updateLater").addEventListener("click", function () { dismissed = $("updateBar").getAttribute("data-version"); $("updateBar").hidden = true; });
  // iOS löst beim Zurückkehren in die installierte App nicht immer dasselbe Ereignis aus – daher mehrere
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checkUpdate(false); });
  window.addEventListener("pageshow", function () { checkUpdate(false); });
  window.addEventListener("focus", function () { checkUpdate(false); });
  window.addEventListener("online", function () { checkUpdate(false); });
  setInterval(function () { if (!document.hidden) checkUpdate(false); }, 30 * 60000);
  // Zeigen, wenn die App seit dem letzten Öffnen neuer geworden ist – auch wenn iOS sie still neu geladen hat
  (function () {
    var seen = null, tried = null;
    try {
      seen = localStorage.getItem("stadtsammler-seen-version");
      tried = sessionStorage.getItem("stadtsammler-updated"); sessionStorage.removeItem("stadtsammler-updated");
    } catch (e) { /* egal */ }
    if (APP_VERSION === "dev") return;
    if ((seen && newer(APP_VERSION, seen)) || (tried && newer(APP_VERSION, tried))) {
      setTimeout(function () { toast("✓ Aktualisiert auf Version " + APP_VERSION, 4000); }, 500);
    } else if (tried) {
      setTimeout(function () { toast("Update noch nicht abrufbar – bitte in ein paar Minuten erneut versuchen", 4500); }, 500);
    }
    try { localStorage.setItem("stadtsammler-seen-version", APP_VERSION); } catch (e) { /* egal */ }
  })();

  /* ---------- Layout fixieren: kein Seiten-Zoom auf dem Handy ---------- */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener("touchmove", function (e) { if (e.touches.length > 1 && !e.target.closest("#map")) e.preventDefault(); }, { passive: false });
  document.addEventListener("dblclick", function (e) { if (!e.target.closest("#map")) e.preventDefault(); });

  /* ---------- Start ---------- */
  applyTheme();
  fitGermany(false);
  go("map");
  refresh();
  setTimeout(function () { checkUpdate(false); }, 1500);
})();
