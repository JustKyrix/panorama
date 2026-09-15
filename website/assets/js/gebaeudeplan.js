/* =============================================================================
 *  Gebäudeplan - floating floor navigator for the map view
 *
 *  Three layers of interaction:
 *
 *    hover the button  -> the panel opens
 *    hover a floor     -> preview: that floor holds still, the others fan away
 *    click a floor     -> select it: the panel locks open so its rooms can be
 *                         picked, and picking one highlights its band
 *
 *  The fan itself is pure CSS; this file only records which floor is active
 *  (`data-active` on the stage) and which room is selected.
 *
 *  Touch screens have no hover, so there a tap stands in for it.
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

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const FLOOR_NAMES = ["2. Obergeschoss", "1. Obergeschoss", "Erdgeschoss"];
  const INFO_DEFAULT = "Etage anklicken, um ihre Räume auszuwählen.";
  const INFO_PICK = "Raum auswählen, um ihn im Plan zu markieren.";

  let active = null; // floor currently fanned (hover preview or selection)
  let pinned = null; // floor committed by a click
  let closeTimer = 0;

  // ---------------------------------------------------------------------------
  //  Raumauswahl
  // ---------------------------------------------------------------------------

  const clearRoom = () => {
    rooms.forEach((room) => room.setAttribute("aria-pressed", "false"));
    root.querySelectorAll(".gplan-plate__band").forEach((band) => {
      band.classList.remove("is-highlight", "is-dim");
    });
  };

  const setInfo = (html) => {
    if (info) info.innerHTML = html;
  };

  const selectRoom = (room) => {
    const wasSelected = room.getAttribute("aria-pressed") === "true";
    clearRoom();

    if (wasSelected) {
      setInfo(pinned === null ? INFO_DEFAULT : INFO_PICK);
      return;
    }

    room.setAttribute("aria-pressed", "true");

    // Emphasise this room's band on the selected floor, recede the rest.
    const floor = floors[active];
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
        `<span><b>${name}</b> · ${room.dataset.fach} · ${FLOOR_NAMES[active]}</span>`
    );
  };

  // ---------------------------------------------------------------------------
  //  Aktive Etage
  // ---------------------------------------------------------------------------

  const setActive = (index) => {
    if (index === active) return;
    active = index;

    if (index === null) {
      stage.removeAttribute("data-active");
    } else {
      stage.setAttribute("data-active", String(index));
    }

    floors.forEach((floor, i) => {
      floor.toggleAttribute("data-active", i === index);
    });

    groups.forEach((group) => {
      group.classList.toggle(
        "is-active",
        index !== null && Number(group.dataset.gplanRooms) === index
      );
    });

    // Changing floors invalidates any room selection.
    clearRoom();
    setInfo(pinned === null ? INFO_DEFAULT : INFO_PICK);
  };

  const setPinned = (index) => {
    pinned = index;
    floors.forEach((floor, i) => {
      floor.toggleAttribute("data-selected", i === index);
      floor.setAttribute("aria-pressed", String(i === index));
    });
    setInfo(index === null ? INFO_DEFAULT : INFO_PICK);
  };

  // ---------------------------------------------------------------------------
  //  Panel
  // ---------------------------------------------------------------------------

  const isOpen = () => !panel.hidden;

  const open = () => {
    window.clearTimeout(closeTimer);
    if (isOpen()) return;
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    window.clearTimeout(closeTimer);
    if (!isOpen()) return;
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    setPinned(null);
    setActive(null);
  };

  // A short grace period keeps the panel open across the gap between the button
  // and the card. A selected floor keeps it open indefinitely.
  const closeSoon = () => {
    if (pinned !== null) return;
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(close, 220);
  };

  if (canHover) {
    root.addEventListener("pointerenter", open);
    root.addEventListener("pointerleave", closeSoon);
  } else {
    fab.addEventListener("click", () => (isOpen() ? close() : open()));
  }

  // ---------------------------------------------------------------------------
  //  Etagen
  // ---------------------------------------------------------------------------

  floors.forEach((floor, i) => {
    if (canHover) {
      floor.addEventListener("pointerenter", () => setActive(i));
    }

    floor.addEventListener("click", () => {
      if (pinned === i) {
        setPinned(null);
        setActive(null);
      } else {
        setPinned(i);
        setActive(i);
      }
    });

    floor.addEventListener("focus", () => {
      open();
      setActive(i);
    });
  });

  if (canHover) {
    // Moving off the plan falls back to the selected floor, or collapses.
    stage.addEventListener("pointerleave", () => setActive(pinned));
  }

  rooms.forEach((room) => {
    room.addEventListener("click", () => selectRoom(room));
  });

  // ---------------------------------------------------------------------------
  //  Tastatur
  // ---------------------------------------------------------------------------

  fab.addEventListener("focus", open);

  root.addEventListener("focusout", (event) => {
    if (pinned === null && !root.contains(event.relatedTarget)) close();
  });

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

  // With a floor selected the panel stays put, so it needs a way out.
  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !root.contains(event.target)) close();
  });
})();
