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

  // The stacked-plates mark from the site's own Gebäudeplan button, so the
  // way back is recognisably the thing it leads to.
  var PLAN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"><path d="M12 3l9 5-9 5-9-5 9-5z"/>' +
    '<path d="M3 13l9 5 9-5"/></svg>';

  var label = "";
  TOURS.forEach(function (tour) {
    if (tour.dir === current) label = tour.label;
  });

  var nav = document.createElement("nav");
  nav.className = "tnav";
  nav.setAttribute("aria-label", "Rundgang");

  // Only the plan and where you are. The other tour is deliberately NOT
  // offered here: the Gebäudeplan is the way between them, the same way you
  // got into this one, so a panorama never advertises a room in a part of the
  // building you have not navigated to.
  nav.innerHTML =
    '<button class="tnav__home" type="button" data-plan-open>' +
    PLAN_ICON +
    "<span>Gebäudeplan</span></button>" +
    '<span class="tnav__sep"></span>' +
    '<span class="tnav__item is-current" aria-current="page">' +
    label +
    "</span>";

  document.body.appendChild(nav);

  // A plain way out to the homepage, top left, icon only - the Gebäudeplan
  // below is for moving around the building, this is for leaving it.
  var home = document.createElement("a");
  home.className = "thome";
  home.href = "../../index.html";
  home.title = "Zur Startseite";
  home.setAttribute("aria-label", "Zur Startseite");
  home.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>' +
    "</svg>";
  document.body.appendChild(home);

  // ---------------------------------------------------------------------------
  //  Gebäudeplan als Overlay
  //
  //  Pressing it opens the very panel the homepage opens, over the panorama,
  //  rather than navigating away from it. The plan is loaded from
  //  assets/plan.html - generated out of index.html by tools/make-plan-page.mjs
  //  - in a frame, so there is still only one copy of that markup anywhere.
  // ---------------------------------------------------------------------------

  var overlay = document.createElement("div");
  overlay.className = "tplan";
  overlay.hidden = true;
  overlay.innerHTML = '<iframe class="tplan__frame" title="Gebäudeplan"></iframe>';
  document.body.appendChild(overlay);

  // NOT `frame`: the countdown further down declares a `var frame` timer
  // handle, and var-hoisting lets that one clobber this reference.
  var planFrame = overlay.querySelector(".tplan__frame");
  var loaded = false;

  function openPlan() {
    // Loaded on first use, so a visitor who never opens the plan never pays
    // for it.
    if (!loaded) {
      // `here` tells the plan which tour this is, so it can leave that one
      // out - from inside a panorama the plan should only offer somewhere
      // else to go. Built up rather than written into the string, because the
      // literal below is what stamp.mjs rewrites with the plan's version.
      var src = "../plan.html?v=b31cd071";
      planFrame.src = src + (src.indexOf("?") === -1 ? "?" : "&") +
        "here=" + encodeURIComponent(current || "");
      loaded = true;
    }
    overlay.hidden = false;
    // The class drives the transition, so it has to land on a frame after the
    // element stops being hidden.
    window.requestAnimationFrame(function () {
      overlay.classList.add("is-open");
    });
  }

  function closePlan() {
    overlay.classList.remove("is-open");
    // Matches the transition in tour-skin.css. A timer rather than
    // `transitionend`, which never fires while the tab is in the background.
    window.setTimeout(function () {
      if (!overlay.classList.contains("is-open")) overlay.hidden = true;
    }, 240);
  }

  nav.querySelector("[data-plan-open]").addEventListener("click", openPlan);

  // The plan asks to be dismissed from inside the frame - its close button,
  // Escape, or a click on the backdrop around the panel.
  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin) return;
    if (event.data === "gplan:close") closePlan();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !overlay.hidden) closePlan();
  });

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
