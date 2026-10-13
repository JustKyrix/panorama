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

  var POSTERS = [
    {
      scene: "Erste Hilfe",                 // matched loosely on the name
      yaw: 0.19,
      pitch: -0.13,
      radius: 1000,
      width: 252,                           // 0.252 rad across
      height: 367,                          // 0.367 rad tall
      src: "../images/erste-hilfe-plakat.jpg",
      label: "Erste Hilfe – Aushang"
    }
  ];

  var lightbox = null;

  function buildLightbox() {
    if (lightbox) return lightbox;

    lightbox = document.createElement("div");
    lightbox.className = "tposter";
    lightbox.hidden = true;
    lightbox.innerHTML =
      '<div class="tposter__stage">' +
      '<img class="tposter__sheet" alt="">' +
      "</div>" +
      '<button class="tposter__close" type="button" ' +
      'aria-label="Schließen">×</button>' +
      '<p class="tposter__hint">Ziehen zum Drehen · Mausrad zum Zoomen · ' +
      "Esc schließt</p>";
    document.body.appendChild(lightbox);

    lightbox.addEventListener("pointerdown", function (e) {
      if (e.target === lightbox) closePoster();
    });
    lightbox
      .querySelector(".tposter__close")
      .addEventListener("click", closePoster);

    holdable(lightbox.querySelector(".tposter__sheet"));
    return lightbox;
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
      sheet.setPointerCapture(e.pointerId);
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

    // Each opening starts flat and unzoomed.
    sheet.reset = function () {
      rx = ry = 0;
      scale = 1;
      apply();
    };
  }

  function openPoster(poster, fromEl) {
    var box = buildLightbox();
    var sheet = box.querySelector(".tposter__sheet");

    sheet.src = poster.src;
    sheet.alt = poster.label;
    sheet.reset();

    // Grow out of the marker: the first frame is placed and scaled onto the
    // spot on the wall, the next one lets it travel to the middle.
    var from = fromEl.getBoundingClientRect();
    var stage = box.querySelector(".tposter__stage");
    var cx = from.left + from.width / 2 - window.innerWidth / 2;
    var cy = from.top + from.height / 2 - window.innerHeight / 2;

    stage.style.transition = "none";
    stage.style.transform =
      "translate(" + cx + "px," + cy + "px) scale(" + Math.max(0.05,
        from.height / window.innerHeight) + ")";
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

  function closePoster() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.classList.remove("is-open");
    // Matches the fade in the stylesheet. A timer, not `transitionend`, which
    // never arrives while the tab is in the background.
    window.setTimeout(function () {
      if (!lightbox.classList.contains("is-open")) lightbox.hidden = true;
    }, 260);
    T.startAutorotate();
  }

  // --- place the markers ------------------------------------------------------
  T.scenes.forEach(function (scene) {
    POSTERS.forEach(function (poster) {
      if (scene.data.name.indexOf(poster.scene) === -1) return;

      var el = document.createElement("div");
      el.className = "tmark";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", poster.label);
      el.style.width = poster.width + "px";
      el.style.height = poster.height + "px";
      el.innerHTML = '<span class="tmark__glow"></span>';

      // Hovering it holds the panorama still, so the poster does not drift
      // away from under the pointer while being aimed at.
      el.addEventListener("pointerenter", function () {
        T.stopAutorotate();
      });
      el.addEventListener("pointerleave", function () {
        if (!lightbox || lightbox.hidden) T.startAutorotate();
      });

      el.addEventListener("click", function () {
        openPoster(poster, el);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPoster(poster, el);
        }
      });

      scene.scene.hotspotContainer().createHotspot(
        el,
        { yaw: poster.yaw, pitch: poster.pitch },
        { perspective: { radius: poster.radius, extraTransforms: "" } }
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
    if (lightbox && !lightbox.hidden) {
      closePoster();
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
