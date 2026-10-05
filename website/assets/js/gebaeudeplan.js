/* =============================================================================
 *  Gebäudeplan - floating floor navigator for the map view
 *
 *  Interaction model - everything is driven by clicks, nothing by hover:
 *
 *    click the button -> the panel opens (and closes)
 *    hover a floor    -> highlight only. NOTHING MOVES.
 *    pick a floor     -> from the rail on the left, or by clicking the plate:
 *                        that floor moves to the centre and the other two are
 *                        taken away. Picking the same one again brings the
 *                        full stack back.
 *    pick an area     -> from the list or by clicking its block in the plan:
 *                        either way that zone lights up and the rest recede
 *    click a 360 pin  -> opens that tour in a new tab
 *
 *  Hover deliberately has no effect on layout: with the plates anchored to the
 *  selected floor, letting hover drive the fan meant the whole stack jumped to
 *  a new arrangement every time the pointer crossed a plate.
 *
 *  There is a single piece of state - `selected` - so the fan, the room list
 *  and the highlight can never disagree about which floor is in play.
 * ========================================================================== */

(() => {
  "use strict";

  const root = document.querySelector("[data-gplan]");
  if (!root) return;

  const fab = root.querySelector("[data-gplan-toggle]");
  const panel = root.querySelector("[data-gplan-panel]");
  const closeBtn = root.querySelector("[data-gplan-close]");
  const stage = root.querySelector("[data-gplan-stage]");
  const info = root.querySelector("[data-gplan-info]");
  const floors = [...root.querySelectorAll("[data-gplan-floor]")];
  const picks = [...root.querySelectorAll("[data-gplan-pick]")];
  const groups = [...root.querySelectorAll("[data-gplan-rooms]")];
  const cats = [...root.querySelectorAll("[data-gplan-cat]")];

  if (!fab || !panel || !stage || !floors.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FLOOR_NAMES = ["2. Obergeschoss", "1. Obergeschoss", "Erdgeschoss"];
  const INFO_CLOSED = "Etage wählen oder einen Rundgang starten.";
  const INFO_PICK = "Bereich auswählen, um ihn im Plan zu markieren.";

  let selected = null; // the one and only piece of state

  // Floors are identified by their data-floor-index (0 = 2.OG, 1 = 1.OG,
  // 2 = EG), never by their position in the array. Only some floors may be
  // present - right now just the ground floor - and the indices still have to
  // line up with the room lists and FLOOR_NAMES.
  const indexOfFloor = (el) => Number(el.dataset.floorIndex);
  const floorByIndex = (i) => floors.find((el) => indexOfFloor(el) === i);

  // ---------------------------------------------------------------------------
  //  360-Grad-Rundgang
  //
  //  Opens in its own tab rather than an overlay. The tour is a self-contained
  //  full-viewport app with its own controls, so a tab hands it the entire
  //  screen and keeps the plan untouched behind it.
  // ---------------------------------------------------------------------------

  // The plan runs as its own page (assets/plan.html) inside the overlay of a
  // 360° tour as well as on the homepage. A few things differ there, and all
  // of them hang off this one flag.
  const standalone = document.body.classList.contains("gplan-standalone");
  const embedded = standalone && window.parent !== window;

  // Opened from inside a 360° tour, which names itself in ?here=<folder>.
  // That tour is where the visitor already stands, so the plan drops it: what
  // is left is only what they can still go and see.
  const here = standalone
    ? new URLSearchParams(window.location.search).get("here")
    : null;

  if (here) {
    // Both the marker in the plan and the card in the resting state, matched
    // on the folder so "tour" cannot also catch "tour-1og".
    root
      .querySelectorAll(`[data-tour*="/${here}/"], .gplan__tour-card[href*="/${here}/"]`)
      .forEach((el) => el.remove());

    // The tally would otherwise still promise a tour that is no longer shown.
    root.querySelector(".gplan__intro-stats")?.remove();
  }

  const openTour = (src) => {
    if (!src) return;

    // Opened from inside a tour's overlay: replace that tour rather than
    // stacking up tabs, since switching tours is the whole point of having
    // the plan there. Same origin, so the top window is reachable.
    if (embedded) {
      try {
        // Against document.baseURI, NOT location.href: the standalone plan
        // page sits in assets/ and carries <base href="../">, so the links in
        // it are written from the site root. Resolving against the page's own
        // path instead would turn assets/tour/... into assets/assets/tour/...
        window.top.location.href = new URL(src, document.baseURI).href;
        return;
      } catch {
        /* fall through to a new tab */
      }
    }

    // Called straight out of a click handler, so this is a user gesture and
    // will not be caught by popup blocking. `noopener` keeps the new tab from
    // getting a handle on this page.
    window.open(src, "_blank", "noopener");
  };

  // ---------------------------------------------------------------------------
  //  Raumauswahl
  // ---------------------------------------------------------------------------

  const setInfo = (html) => {
    if (info) info.innerHTML = html;
  };

  const clearArea = () => {
    cats.forEach((cat) => cat.setAttribute("aria-pressed", "false"));
    root.querySelectorAll(".gplan-plate__band").forEach((band) => {
      band.classList.remove("is-highlight", "is-dim");
    });
  };

  // The row in the open floor's list that names a given band.
  const catOf = (band) =>
    groups
      .find((g) => Number(g.dataset.gplanRooms) === selected)
      ?.querySelector(`[data-gplan-cat="${band}"]`);

  /**
   * Select an area by its band name. The block in the plan and the row in the
   * list are two faces of one thing, so both routes land here and the two can
   * never end up showing different selections. Selecting the one already
   * selected clears it.
   */
  const selectArea = (band) => {
    const cat = catOf(band);
    const wasSelected = cat?.getAttribute("aria-pressed") === "true";

    clearArea();

    if (wasSelected || !cat) {
      setInfo(INFO_PICK);
      return;
    }

    cat.setAttribute("aria-pressed", "true");

    // Light up the matching zone on the open floor, let the others recede.
    const floor = floorByIndex(selected);
    floor?.querySelectorAll(".gplan-plate__band").forEach((zone) => {
      const match = zone.dataset.band === band;
      zone.classList.toggle("is-highlight", match);
      zone.classList.toggle("is-dim", !match);
    });

    const name = cat.querySelector(".gplan__cat-name")?.textContent.trim() ?? band;
    const swatch = cat.querySelector("i")?.style.getPropertyValue("--swatch") ?? "";

    setInfo(
      `<i style="--swatch:${swatch}"></i>` +
        `<span><b>${name}</b> · ${FLOOR_NAMES[selected]}</span>`
    );
  };

  // ---------------------------------------------------------------------------
  //  Etage öffnen / schließen
  // ---------------------------------------------------------------------------

  const selectFloor = (index) => {
    selected = index;

    if (index === null) {
      stage.removeAttribute("data-active");
    } else {
      stage.setAttribute("data-active", String(index));
    }

    floors.forEach((floor) => {
      const on = indexOfFloor(floor) === index;
      floor.toggleAttribute("data-active", on);
      floor.toggleAttribute("data-selected", on);
      floor.setAttribute("aria-pressed", String(on));
    });

    // The rail reads off the same state, so the highlighted button and the
    // floor on show can never disagree.
    picks.forEach((pick) => {
      pick.setAttribute(
        "aria-pressed",
        String(Number(pick.dataset.gplanPick) === index)
      );
    });

    groups.forEach((group) => {
      group.classList.toggle(
        "is-active",
        index !== null && Number(group.dataset.gplanRooms) === index
      );
    });

    // Changing floors starts the list from scratch, so an area picked on one
    // floor does not stay highlighted on the next.
    clearArea();
    setInfo(index === null ? INFO_CLOSED : INFO_PICK);
  };

  // Both ways in behave the same: pick a floor to isolate it, pick the one
  // already showing to get the whole stack back.
  const toggleFloor = (i) => selectFloor(selected === i ? null : i);

  floors.forEach((floor) => {
    floor.addEventListener("click", () => toggleFloor(indexOfFloor(floor)));
  });

  picks.forEach((pick) => {
    pick.addEventListener("click", () =>
      toggleFloor(Number(pick.dataset.gplanPick))
    );
  });

  cats.forEach((cat) => {
    cat.addEventListener("click", () => selectArea(cat.dataset.band));
  });

  root.querySelectorAll(".gplan-plate__band").forEach((zone) => {
    zone.addEventListener("click", (event) => {
      const floor = zone.closest("[data-gplan-floor]");
      if (!floor || selected !== indexOfFloor(floor)) return;
      event.stopPropagation(); // do not collapse the floor we are standing on
      selectArea(zone.dataset.band);
    });
  });

  // The 360° marker rides inside its block, so its click has to be stopped
  // from reaching the block underneath - otherwise opening the tour would also
  // re-select the zone.
  root.querySelectorAll(".gplan-plate__tour[data-tour]").forEach((badge) => {
    badge.addEventListener("click", (event) => {
      event.stopPropagation();
      openTour(badge.dataset.tour);
    });
  });

  // ---------------------------------------------------------------------------
  //  Panel
  // ---------------------------------------------------------------------------

  const isOpen = () => !panel.hidden;

  let closingTimer = 0;

  const open = () => {
    // Re-opening mid-close aborts the close rather than queueing behind it.
    window.clearTimeout(closingTimer);
    panel.classList.remove("is-closing");

    if (isOpen()) return;
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");

    // With a single floor there is nothing to choose between, so open it
    // straight away - otherwise the zones stay inert behind a click that has
    // no alternative. Stops applying by itself once more floors are added.
    if (floors.length === 1 && selected === null) {
      selectFloor(indexOfFloor(floors[0]));
    }
  };

  const close = () => {
    if (!isOpen()) return;
    fab.setAttribute("aria-expanded", "false");

    const finish = () => {
      panel.classList.remove("is-closing");
      panel.hidden = true;
      selectFloor(null);
    };

    if (reduceMotion) {
      finish();
      return;
    }

    // Let the closing animation play, then hide. Driven by a timer rather
    // than `animationend`: that event never arrives when the tab is hidden,
    // which would leave the panel stuck open.
    panel.classList.add("is-closing");
    window.clearTimeout(closingTimer);
    closingTimer = window.setTimeout(finish, 210);
  };

  // Click only - never hover. Enter and Space fire click on a <button>, so the
  // keyboard is covered by the same handler.
  fab.addEventListener("click", () => (isOpen() ? close() : open()));

  // Coming back from a 360° tour, whose "Gebäudeplan" link points at
  // #gebaeudeplan: open the panel straight away so the way back lands on the
  // plan rather than on the top of the page. The hash is then dropped, so a
  // later reload starts from the normal closed state.
  if (window.location.hash === "#gebaeudeplan") {
    open();
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  // On the standalone page the panel IS the page: it opens by itself, and
  // closing means dismissing the overlay that holds it, which only the tour
  // around it can do.
  const dismiss = () => {
    if (embedded) {
      window.parent.postMessage("gplan:close", window.location.origin);
      return;
    }
    close();
    fab.focus({ preventScroll: true });
  };

  if (standalone) open();

  closeBtn?.addEventListener("click", dismiss);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) dismiss();
  });

  document.addEventListener("pointerdown", (event) => {
    // Clicking beside the panel closes it. On the standalone page `root`
    // fills the whole viewport, so the panel itself is what counts as
    // "inside" - otherwise the surrounding backdrop would never dismiss.
    const inside = standalone
      ? panel.contains(event.target)
      : root.contains(event.target);

    if (isOpen() && !inside) dismiss();
  });
})();
