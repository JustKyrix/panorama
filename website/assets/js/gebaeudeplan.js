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

  rooms.forEach((room) => {
    room.addEventListener("click", () => selectRoom(room));
  });

  // ---------------------------------------------------------------------------
  //  Panel
  // ---------------------------------------------------------------------------

  const isOpen = () => !panel.hidden;

  const open = () => {
    if (isOpen()) return;
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    if (!isOpen()) return;
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    selectFloor(null);
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
