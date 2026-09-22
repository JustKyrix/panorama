/* =============================================================================
 *  Gebäudeplan - floating floor navigator for the map view
 *
 *  Interaction model - everything is driven by clicks, nothing by hover:
 *
 *    click the button -> the panel opens (and closes)
 *    hover a floor    -> highlight only. NOTHING MOVES.
 *    click a floor    -> the stack fans open around it: that floor holds its
 *                        position, the other two are pushed away. Clicking it
 *                        again collapses the stack back to the flat slab.
 *    click a room     -> its zone lights up in the plan, the rest recede
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
    const floor = floors[selected];
    if (floor) {
      floor.querySelectorAll(".gplan-plate__band").forEach((band) => {
        const match = band.dataset.band === room.dataset.band;
        band.classList.toggle("is-highlight", match);
        band.classList.toggle("is-dim", !match);
      });
    }

    const swatch = room.querySelector("i")?.style.getPropertyValue("--swatch") || "";
    const name = room.querySelector("span")?.textContent || "";
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

    floors.forEach((floor, i) => {
      const on = i === index;
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

    clearRoom();
    setInfo(index === null ? INFO_CLOSED : INFO_PICK);
  };

  floors.forEach((floor, i) => {
    floor.addEventListener("click", () => {
      selectFloor(selected === i ? null : i);
    });
  });

  // ---------------------------------------------------------------------------
  //  360-Grad-Rundgang
  //
  //  The tour is a self-contained Marzipano app, so it lives in an iframe
  //  rather than being inlined - it expects to own the whole viewport, and its
  //  stylesheet carries a global reset that would leak into the page.
  // ---------------------------------------------------------------------------

  const tour = document.querySelector("[data-gtour]");
  const tourFrame = tour?.querySelector("[data-gtour-frame]");
  const tourTitle = tour?.querySelector("[data-gtour-title]");
  const tourClose = tour?.querySelector("[data-gtour-close]");

  const openTour = (src, name) => {
    if (!tour || !tourFrame || !src) return;

    if (tourTitle) {
      tourTitle.textContent = name ? `${name} – 360°-Rundgang` : "360°-Rundgang";
    }

    // The src is attached only now. The tour is tens of megabytes of tiles, so
    // it must not start downloading until someone actually asks for it.
    if (tourFrame.getAttribute("src") !== src) tourFrame.setAttribute("src", src);

    if (typeof tour.showModal === "function") tour.showModal();
    else tour.setAttribute("open", "");
  };

  // Dropping the src stops tile loading and the autorotate timer; otherwise
  // the tour keeps running unseen behind the page.
  const unloadTour = () => tourFrame?.removeAttribute("src");

  let tourTimer = 0;

  const closeTour = () => {
    if (!tour?.open) return;

    const finish = () => {
      tour.classList.remove("is-closing");
      tour.close();
      unloadTour();
    };

    if (reduceMotion) {
      finish();
      return;
    }

    tour.classList.add("is-closing");
    window.clearTimeout(tourTimer);
    tourTimer = window.setTimeout(finish, 200);
  };

  // Escape closes a <dialog> natively, bypassing closeTour(), so the events
  // are covered as well. Both are wired because the `close` event proved
  // unreliable in some engines - unloading twice is harmless, never
  // unloading leaves the tour streaming in the background.
  tour?.addEventListener("close", unloadTour);
  tour?.addEventListener("cancel", unloadTour);
  tourClose?.addEventListener("click", closeTour);
  tour?.addEventListener("click", (event) => {
    if (event.target === tour) closeTour(); // click on the backdrop
  });

  // ---------------------------------------------------------------------------
  //  Räume und begehbare Zonen
  // ---------------------------------------------------------------------------

  rooms.forEach((room) => {
    room.addEventListener("click", () => {
      selectRoom(room);
      // Only on selecting, not on clicking the same entry again to clear it.
      if (room.dataset.tour && room.getAttribute("aria-pressed") === "true") {
        openTour(room.dataset.tour, room.dataset.tourName);
      }
    });
  });

  // A zone drawn in the plan opens its tour directly - but only once its floor
  // is already open, so the first click on a closed floor still just opens it.
  root.querySelectorAll(".gplan-plate__band[data-tour]").forEach((zone) => {
    zone.addEventListener("click", (event) => {
      const index = floors.indexOf(zone.closest("[data-gplan-floor]"));
      if (index === -1 || selected !== index) return;
      event.stopPropagation(); // do not collapse the floor we are standing on
      openTour(zone.dataset.tour, zone.dataset.tourName);
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

  // Escape dismisses the topmost layer only: the tour first, then the panel.
  // Handled explicitly rather than leaning on the dialog's own events, which
  // are not reliably delivered everywhere.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (tour?.open) {
      closeTour();
      return;
    }

    if (isOpen()) {
      close();
      fab.focus({ preventScroll: true });
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !root.contains(event.target)) close();
  });
})();
