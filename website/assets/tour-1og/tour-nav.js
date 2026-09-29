/* =============================================================================
 *  tour-nav.js  -  SOURCE FILE
 *
 *  Do not edit the copies in assets/tour/ and assets/tour-1og/. Edit this one
 *  and run `npm run sync:tour`.
 *
 *  Adds two things the Marzipano Tool output has no notion of:
 *
 *  1. A bar linking back to the Gebäudeplan and across to the other tour, with
 *     the one you are in marked as current.
 *  2. A countdown for the autorotate. Touching the panorama pauses it and then
 *     it starts again by itself, which is startling when nothing announces it.
 *
 *  It runs alongside index.js rather than inside it: that file is generated
 *  output, so anything added there would be lost the next time a tour is
 *  re-exported from the Marzipano Tool.
 * ========================================================================== */

(function () {
  "use strict";

  // Must match viewer.setIdleMovement() in index.js, and --idle in the CSS.
  var IDLE_MS = 3000;

  var TOURS = [
    { dir: "tour", label: "Küche" },
    { dir: "tour-1og", label: "Zahntechnik" }
  ];

  // Which tour is this? Taken from the path rather than baked in, so the very
  // same file works in both and cannot be copied into the wrong one.
  var match = /\/(tour-1og|tour)\//.exec(window.location.pathname);
  var current = match ? match[1] : null;

  // ---------------------------------------------------------------------------
  //  Navigation
  // ---------------------------------------------------------------------------

  var HOME_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>' +
    "</svg>";

  var nav = document.createElement("nav");
  nav.className = "tnav";
  nav.setAttribute("aria-label", "Rundgänge");

  var html =
    '<a class="tnav__home" href="../../index.html">' +
    HOME_ICON +
    "<span>Gebäudeplan</span></a>" +
    '<span class="tnav__sep"></span>';

  TOURS.forEach(function (tour) {
    if (tour.dir === current) {
      html +=
        '<span class="tnav__item is-current" aria-current="page">' +
        tour.label +
        "</span>";
    } else {
      html +=
        '<a class="tnav__item" href="../' +
        tour.dir +
        '/index.html">' +
        tour.label +
        "</a>";
    }
  });

  nav.innerHTML = html;
  document.body.appendChild(nav);

  // ---------------------------------------------------------------------------
  //  Autodreh-Countdown
  //
  //  Driven by pointer events on the panorama, not by Marzipano's own idle
  //  timer: index.js keeps `viewer` inside an IIFE, so there is nothing to
  //  hook. Watching the same input the viewer watches gets to the same answer
  //  and keeps working if the tour is regenerated.
  // ---------------------------------------------------------------------------

  var toggle = document.querySelector("#autorotateToggle");
  var pano = document.querySelector("#pano");
  if (!toggle || !pano) return;

  toggle.insertAdjacentHTML(
    "beforeend",
    '<svg class="ar-ring" viewBox="0 0 70 70">' +
      '<circle class="ar-ring__track" cx="35" cy="35" r="30"/>' +
      '<circle class="ar-ring__bar" cx="35" cy="35" r="30"/>' +
      "</svg>"
  );

  var badge = document.createElement("div");
  badge.className = "ar-countdown";
  badge.setAttribute("role", "status");
  document.body.appendChild(badge);

  var endsAt = 0;
  var frame = 0;

  function spinning() {
    return toggle.classList.contains("enabled");
  }

  function hide() {
    if (frame) {
      window.clearTimeout(frame);
      frame = 0;
    }
    toggle.classList.remove("is-counting");
    badge.classList.remove("is-on");
  }

  function tick() {
    var left = endsAt - Date.now();

    if (left <= 0 || !spinning()) {
      hide();
      return;
    }

    badge.textContent = "Dreht weiter in " + Math.ceil(left / 1000) + " s";
    frame = window.setTimeout(tick, 120);
  }

  function restart() {
    if (!spinning()) {
      hide();
      return;
    }

    // Re-trigger the ring animation: removing the class alone is not enough,
    // the element has to be reflowed before it is put back or the browser
    // coalesces the two changes and nothing replays.
    toggle.classList.remove("is-counting");
    void toggle.offsetWidth;
    toggle.classList.add("is-counting");

    endsAt = Date.now() + IDLE_MS;
    badge.classList.add("is-on");

    if (frame) window.clearTimeout(frame);
    tick();
  }

  // While a drag is in progress the clock should not be running at all - it
  // only starts once the hands come off.
  ["pointerdown", "touchstart", "mousedown"].forEach(function (type) {
    pano.addEventListener(type, hide, { passive: true });
  });

  ["pointerup", "touchend", "mouseup"].forEach(function (type) {
    pano.addEventListener(type, restart, { passive: true });
  });

  // The wheel has no "released" event, so each turn simply pushes the deadline.
  pano.addEventListener("wheel", restart, { passive: true });

  // Pausing by hand should not leave a countdown promising it will resume.
  toggle.addEventListener("click", function () {
    // The class is flipped by index.js's own handler; read it afterwards.
    window.setTimeout(hide, 0);
  });
})();
