/* =============================================================================
 *  Gebäudeplan - floating floor navigator for the map view
 *
 *  Interaction model - everything is driven by clicks, nothing by hover:
 *
 *    click the button -> the panel opens (and closes)
 *    hover a floor    -> highlight only. NOTHING MOVES.
 *    click a floor    -> the stack fans open around it: that floor holds its
 *                        position, the other two are pushed away. Clicking it
 *                        again collapses the stack.
 *    click a room     -> its zone lights up in the plan, the rest recede
 *    click a zone     -> a zone with a 360° tour opens it in a new tab
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
  const groups = [...root.querySelectorAll("[data-gplan-rooms]")];
  const rooms = [...root.querySelectorAll("[data-gplan-room]")];

  if (!fab || !panel || !stage || !floors.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FLOOR_NAMES = ["2. Obergeschoss", "1. Obergeschoss", "Erdgeschoss"];
  const INFO_CLOSED = "Etage anklicken, um sie zu öffnen.";
  const INFO_PICK = "Raum auswählen, um ihn im Plan zu markieren.";

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

  const openTour = (src) => {
    if (!src) return;
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

  const clearRoom = () => {
    rooms.forEach((room) => room.setAttribute("aria-pressed", "false"));
    root.querySelectorAll(".gplan-plate__band").forEach((band) => {
      band.classList.remove("is-highlight", "is-dim");
    });
  };

  const selectRoom = (room) => {
    const wasSelected = room.getAttribute("aria-pressed") === "true";
    clearRoom();

    if (wasSelected) {
      setInfo(INFO_PICK);
      return;
    }

    room.setAttribute("aria-pressed", "true");

    // Light up this room's zone on the open floor, let the others recede.
    const floor = floorByIndex(selected);
    if (floor) {
      floor.querySelectorAll(".gplan-plate__band").forEach((band) => {
        const match = band.dataset.band === room.dataset.band;
        band.classList.toggle("is-highlight", match);
        band.classList.toggle("is-dim", !match);
      });
    }

    // The room's label is the button's own text, and the colour now lives on
    // the category header it sits under.
    const name = room.textContent.trim();
    const swatch =
      room
        .closest("[data-gplan-cat]")
        ?.querySelector("i")
        ?.style.getPropertyValue("--swatch") ?? "";
    setInfo(
      `<i style="--swatch:${swatch}"></i>` +
        `<span><b>${name}</b> · ${room.dataset.fach} · ${FLOOR_NAMES[selected]}</span>`
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

    groups.forEach((group) => {
      group.classList.toggle(
        "is-active",
        index !== null && Number(group.dataset.gplanRooms) === index
      );
    });

    // Changing floors starts the list from scratch, so a category left open
    // on one floor does not carry over to the next.
    root.querySelectorAll("[data-gplan-cat]").forEach((cat) => {
      cat.open = false;
    });

    clearRoom();
    setInfo(index === null ? INFO_CLOSED : INFO_PICK);
  };

  floors.forEach((floor) => {
    const i = indexOfFloor(floor);
    floor.addEventListener("click", () => {
      selectFloor(selected === i ? null : i);
    });
  });

  rooms.forEach((room) => {
    room.addEventListener("click", () => selectRoom(room));
  });

  // The category belonging to a band, within the open floor's list.
  const categoryOf = (band) =>
    groups
      .find((g) => Number(g.dataset.gplanRooms) === selected)
      ?.querySelector(`[data-gplan-cat="${band}"]`);

  // Clicking a block in the plan picks that category: its zone lights up, the
  // others recede, and its section opens in the list. The blocks are the
  // bigger, more obvious target, so this is the main way in - the list is the
  // way to drill down to a single room.
  const selectZone = (zone) => {
    const band = zone.dataset.band;
    const floor = zone.closest("[data-gplan-floor]");

    clearRoom();

    floor.querySelectorAll(".gplan-plate__band").forEach((other) => {
      const match = other.dataset.band === band;
      other.classList.toggle("is-highlight", match);
      other.classList.toggle("is-dim", !match);
    });

    const group = groups.find((g) => Number(g.dataset.gplanRooms) === selected);
    group?.querySelectorAll("[data-gplan-cat]").forEach((cat) => {
      cat.open = cat.dataset.gplanCat === band;
    });

    const cat = categoryOf(band);
    const label = cat?.querySelector(".gplan__cat-name")?.textContent ?? band;
    const swatch =
      cat?.querySelector("i")?.style.getPropertyValue("--swatch") ?? "";

    setInfo(
      `<i style="--swatch:${swatch}"></i>` +
        `<span><b>${label}</b> · ${FLOOR_NAMES[selected]}</span>`
    );
  };

  root.querySelectorAll(".gplan-plate__band").forEach((zone) => {
    zone.addEventListener("click", (event) => {
      const floor = zone.closest("[data-gplan-floor]");
      if (!floor || selected !== indexOfFloor(floor)) return;
      event.stopPropagation(); // do not collapse the floor we are standing on
      selectZone(zone);
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

  closeBtn?.addEventListener("click", () => {
    close();
    fab.focus({ preventScroll: true });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      close();
      fab.focus({ preventScroll: true });
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !root.contains(event.target)) close();
  });
})();
