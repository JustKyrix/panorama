/* =============================================================================
 *  tour-extras.js  -  SOURCE FILE
 *
 *  Do not edit the copies in assets/tour/ and assets/tour-1og/. Edit this one
 *  and run `npm run sync:tour`.
 *
 *  Two things the Marzipano Tool has no notion of:
 *
 *  1. A marker lying ON the Erste-Hilfe poster that opens the poster full
 *     size, with a backdrop, growing out of the spot it sits on, and holdable
 *     like a sheet of paper.
 *  2. Keyboard control, and a panel that says what the keys are.
 *
 *  Both need the viewer and the scene list, which index.js keeps inside an
 *  IIFE - tools/sync-tour.mjs appends a small `window.__tour` handle for that.
 * ========================================================================== */

(function () {
  "use strict";

  var T = window.__tour;
  if (!T) return;

  var pano = document.querySelector("#pano");

  // ---------------------------------------------------------------------------
  //  Plakat
  //
  //  The angles come from measuring the poster in the panorama rather than
  //  guessing: the marker has to sit ON it, not near it. `radius` turns the
  //  element's pixel size into an angular one (size / radius), so the outline
  //  keeps covering the poster as you zoom instead of floating at a fixed
  //  size on top of it.
  // ---------------------------------------------------------------------------

  // Angles measured in the panorama rather than guessed: a marker has to sit
  // ON the thing, not near it. `radius` turns the element's pixel size into an
  // angular one (size / radius), so the outline keeps covering the same patch
  // as you zoom instead of floating at a fixed size on top of it.
  var SPOTS = [
    {
      scene: "Erste Hilfe",               // matched loosely on the scene name
      kind: "poster",
      yaw: 0.1915,
      pitch: -0.1296,
      radius: 1000,
      width: 240,                         // trimmed to sit just outside it
      height: 352,
      src: "../images/erste-hilfe-plakat.jpg",
      label: "Erste Hilfe – Aushang"
    },
    {
      scene: "Erste Hilfe",
      kind: "info",
      yaw: 0.3511,
      // The trimmer is a solid object, not a flat sheet: look further down on
      // it and more of its top face comes into view, so its outline on screen
      // genuinely grows. A fixed box cannot match every angle, so it is sized
      // to the LARGEST it gets - a little slack around it reads far better
      // than an outline cutting through its base.
      pitch: 0.288,
      radius: 1000,
      width: 300,
      height: 320,
      src: "../images/gipstrimmer-hss99.jpg",
      label: "Gipstrimmer Wassermann HSS 99",
      title: "Gipstrimmer",
      sub: "Wassermann HSS 99",
      text: [
        "Mit dem Trimmer werden Gipsmodelle in Form gebracht: Überschüssiger " +
          "Gips wird abgetragen, die Ränder begradigt und der Sockel plan " +
          "geschliffen.",
        "Geschliffen wird nass. Das zulaufende Wasser kühlt die Scheibe und " +
          "bindet den Gipsstaub, der sonst in der Luft hängt und die Scheibe " +
          "zusetzt.",
        "Das Modell wird dabei auf den Tisch gelegt und gegen die laufende " +
          "Scheibe geführt. Über den Anschlag lassen sich Flächen in " +
          "einem gleichmäßigen Winkel trimmen."
      ],
      note: "Schutzbrille tragen und den Wasserzulauf öffnen, bevor das " +
        "Gerät eingeschaltet wird."
    },
    {
      scene: "Drucker",
      kind: "info",
      yaw: -0.0666,
      // Also a solid box, so sized to the largest its outline gets.
      pitch: 0.2352,
      radius: 1000,
      width: 210,
      height: 340,
      src: "../images/drucker-photon-m3-max.jpg",
      label: "3D-Drucker Anycubic Photon M3 Max",
      title: "3D-Drucker",
      sub: "Anycubic Photon M3 Max",
      text: [
        "Ein Harzdrucker. Gedruckt wird nicht aus Kunststofffaden, sondern " +
          "aus flüssigem Kunstharz, das Schicht für Schicht von " +
          "einem Bildschirm mit UV-Licht ausgehärtet wird.",
        "Die Bauplattform hängt über dem Harzbecken und wird nach " +
          "jeder Schicht ein Stück angehoben – das Werkstück " +
          "wächst also kopfüber nach oben. Weil die Schichten sehr " +
          "fein sind, eignet sich das Verfahren für Modelle, Schienen " +
          "und Schablonen.",
        "Die gelbe Haube hält UV-Licht von außen ab, damit das Harz " +
          "im Becken nicht vorzeitig aushärtet. Nach dem Druck wird das " +
          "Teil in Isopropanol gewaschen und anschließend unter UV-Licht " +
          "nachgehärtet."
      ],
      note: "Flüssiges Harz reizt Haut und Augen: Handschuhe tragen und " +
        "die Haube geschlossen halten."
    }
  ];

  var overlay = null;

  function buildOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "tspot";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="tspot__stage"></div>' +
      '<button class="tspot__close" type="button" ' +
      'aria-label="Schließen">×</button>' +
      '<p class="tspot__hint"></p>';
    document.body.appendChild(overlay);

    overlay.addEventListener("pointerdown", function (e) {
      if (e.target === overlay) closeSpot();
    });
    overlay
      .querySelector(".tspot__close")
      .addEventListener("click", closeSpot);

    return overlay;
  }

  /**
   * Hold it like a sheet of paper: dragging turns it in space, the wheel
   * brings it closer. Pointer events, so a finger works the same as a mouse.
   */
  function holdable(sheet) {
    var rx = 0, ry = 0, scale = 1, dragging = false, lastX = 0, lastY = 0;

    function apply() {
      sheet.style.transform =
        "perspective(1400px) rotateX(" + rx + "deg) rotateY(" + ry +
        "deg) scale(" + scale + ")";
    }

    sheet.addEventListener("pointerdown", function (e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      try { sheet.setPointerCapture(e.pointerId); } catch (err) {}
      sheet.classList.add("is-held");
    });

    sheet.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      ry += (e.clientX - lastX) * 0.4;
      rx -= (e.clientY - lastY) * 0.4;
      rx = Math.max(-80, Math.min(80, rx));
      lastX = e.clientX;
      lastY = e.clientY;
      apply();
    });

    ["pointerup", "pointercancel"].forEach(function (type) {
      sheet.addEventListener(type, function () {
        dragging = false;
        sheet.classList.remove("is-held");
      });
    });

    sheet.addEventListener("wheel", function (e) {
      e.preventDefault();
      scale = Math.max(0.4, Math.min(4, scale * (e.deltaY < 0 ? 1.12 : 0.89)));
      apply();
    }, { passive: false });

    apply();
  }

  function openSpot(spot, fromEl) {
    var box = buildOverlay();
    var stage = box.querySelector(".tspot__stage");

    box.classList.toggle("tspot--card", spot.kind === "info");

    if (spot.kind === "info") {
      // Reading matter on the left, the machine on the right.
      stage.innerHTML =
        '<article class="tcard">' +
        '<button class="tcard__close" type="button" ' +
        'aria-label="Schließen">×</button>' +
        '<div class="tcard__text">' +
        "<h2>" + spot.title + "</h2>" +
        '<p class="tcard__sub">' + spot.sub + "</p>" +
        spot.text.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
        '<p class="tcard__note">' + spot.note + "</p>" +
        "</div>" +
        '<div class="tcard__media">' +
        '<img src="' + spot.src + '" alt="' + spot.label + '">' +
        "</div>" +
        "</article>";
      box.querySelector(".tspot__hint").textContent = "Esc schließt";
      stage
        .querySelector(".tcard__close")
        .addEventListener("click", closeSpot);
    } else {
      stage.innerHTML =
        '<img class="tspot__sheet" src="' + spot.src + '" alt="' +
        spot.label + '">';
      holdable(stage.querySelector(".tspot__sheet"));
      box.querySelector(".tspot__hint").textContent =
        "Ziehen zum Drehen · Mausrad zum Zoomen · Esc schließt";
    }

    // Grow out of the marker: the first frame is placed and scaled onto the
    // spot on the wall, the next one lets it travel to the middle.
    var from = fromEl.getBoundingClientRect();
    var cx = from.left + from.width / 2 - window.innerWidth / 2;
    var cy = from.top + from.height / 2 - window.innerHeight / 2;

    stage.style.transition = "none";
    stage.style.transform =
      "translate(" + cx + "px," + cy + "px) scale(" +
      Math.max(0.05, from.height / window.innerHeight) + ")";
    stage.style.opacity = "0";

    box.hidden = false;

    window.requestAnimationFrame(function () {
      stage.style.transition = "";
      stage.style.transform = "";
      stage.style.opacity = "";
      box.classList.add("is-open");
    });

    T.stopAutorotate();
  }

  function closeSpot() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    // Matches the fade in the stylesheet. A timer, not `transitionend`, which
    // never arrives while the tab is in the background.
    window.setTimeout(function () {
      if (!overlay.classList.contains("is-open")) overlay.hidden = true;
    }, 260);
    T.startAutorotate();
  }

  // --- place the markers ------------------------------------------------------
  T.scenes.forEach(function (scene) {
    SPOTS.forEach(function (spot) {
      if (scene.data.name.indexOf(spot.scene) === -1) return;

      var el = document.createElement("div");
      el.className = "tmark";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", spot.label);
      el.style.width = spot.width + "px";
      el.style.height = spot.height + "px";

      // Hovering holds the panorama still, so the thing does not drift away
      // from under the pointer while being aimed at.
      el.addEventListener("pointerenter", function () {
        T.stopAutorotate();
      });
      el.addEventListener("pointerleave", function () {
        if (!overlay || overlay.hidden) T.startAutorotate();
      });

      el.addEventListener("click", function () {
        openSpot(spot, el);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openSpot(spot, el);
        }
      });

      scene.scene.hotspotContainer().createHotspot(
        el,
        { yaw: spot.yaw, pitch: spot.pitch },
        { perspective: { radius: spot.radius, extraTransforms: "" } }
      );
    });
  });

  // ---------------------------------------------------------------------------
  //  Tastatur
  // ---------------------------------------------------------------------------

  var STOP = /^(INPUT|TEXTAREA|SELECT)$/;

  // Letters chosen from the words that actually tell the places apart, not
  // from the first character - half the scenes here begin with "Zahntechnik".
  //
  // An ORDERED list, not an object: "Flur: Tuer vorm Labor" contains both
  // "Flur" and "Labor", so whichever is tested first wins. Checking "Labor"
  // first handed the corridor an L and pushed the laboratory itself onto a
  // fallback letter.
  var PREFERRED = [
    ["Flur", "F"],
    ["Labor", "L"],
    ["Raummitte", "M"],
    ["Technik:", "T"],
    ["Erste Hilfe", "E"],
    ["Broschüren", "B"],
    ["Hygieneplan", "H"],
    ["Lehrerpult", "P"]
  ];

  var keyed = [];
  var taken = {};

  T.scenes.forEach(function (scene) {
    var name = scene.data.name;
    var letter = null;

    PREFERRED.forEach(function (pair) {
      if (letter) return;
      if (name.indexOf(pair[0]) !== -1 && !taken[pair[1]]) letter = pair[1];
    });

    // Anything unlisted - the other tour - falls back to the initials of its
    // own words, then to any unused letter in the name.
    if (!letter) {
      var candidates = name.toUpperCase().match(/\b[A-ZÄÖÜ]/g) || [];
      candidates = candidates.concat((name.toUpperCase().match(/[A-Z]/g) || []));
      for (var i = 0; i < candidates.length; i++) {
        if (!taken[candidates[i]]) {
          letter = candidates[i];
          break;
        }
      }
    }

    if (!letter) return;
    taken[letter] = true;
    keyed.push({ key: letter, name: name, scene: scene });
  });

  var STEP = 0.12;   // radians per arrow press
  var ZOOM = 0.12;   // radians of field of view per +/- press

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (STOP.test((e.target.tagName || "").toUpperCase())) return;

    var v = T.viewer.view();
    var handled = true;

    switch (e.key) {
      case "ArrowLeft":  v.setYaw(v.yaw() - STEP); break;
      case "ArrowRight": v.setYaw(v.yaw() + STEP); break;
      case "ArrowUp":    v.setPitch(v.pitch() - STEP); break;
      case "ArrowDown":  v.setPitch(v.pitch() + STEP); break;
      case "+":
      case "=":          v.setFov(v.fov() - ZOOM); break;
      case "-":
      case "_":          v.setFov(v.fov() + ZOOM); break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      return;
    }

    var hit = keyed.filter(function (k) {
      return k.key === (e.key || "").toUpperCase();
    })[0];

    if (hit) {
      e.preventDefault();
      T.switchScene(hit.scene);
    }
  });

  // ---------------------------------------------------------------------------
  //  Infotafel
  // ---------------------------------------------------------------------------

  var info = document.createElement("button");
  info.className = "tinfo";
  info.type = "button";
  info.setAttribute("aria-expanded", "false");
  info.setAttribute("aria-label", "Tastatursteuerung");
  info.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.1" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/>' +
    '<path d="M12 7.6v.1"/></svg>';
  document.body.appendChild(info);

  var sheet = document.createElement("div");
  sheet.className = "tkeys";
  sheet.hidden = true;
  sheet.innerHTML =
    "<h2>Steuerung</h2>" +
    '<dl class="tkeys__list">' +
    "<dt><kbd>←</kbd><kbd>→</kbd></dt><dd>nach links und rechts drehen</dd>" +
    "<dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>nach oben und unten schauen</dd>" +
    "<dt><kbd>+</kbd><kbd>−</kbd></dt><dd>heran- und herauszoomen</dd>" +
    "</dl>" +
    "<h3>Orte</h3>" +
    '<dl class="tkeys__list">' +
    keyed
      .map(function (k) {
        return "<dt><kbd>" + k.key + "</kbd></dt><dd>" + k.name + "</dd>";
      })
      .join("") +
    "</dl>";
  document.body.appendChild(sheet);

  info.addEventListener("click", function () {
    var open = sheet.hidden;
    sheet.hidden = !open;
    info.setAttribute("aria-expanded", String(open));
    info.classList.toggle("is-open", open);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (overlay && !overlay.hidden) {
      closeSpot();
    } else if (!sheet.hidden) {
      sheet.hidden = true;
      info.setAttribute("aria-expanded", "false");
      info.classList.remove("is-open");
    }
  });

  // Clicking the panorama puts the panel away again.
  pano.addEventListener("pointerdown", function () {
    if (sheet.hidden) return;
    sheet.hidden = true;
    info.setAttribute("aria-expanded", "false");
    info.classList.remove("is-open");
  });
})();
