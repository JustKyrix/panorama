/* =============================================================================
 *  Gebäudeplan - floating floor navigator for the map view
 *
 *  Everything is hover-driven: hovering the button opens the panel, hovering a
 *  floor fans the stack around it, and leaving the widget closes it again.
 *
 *  The fan itself is pure CSS - this file only records *which* floor is active
 *  via `data-active`, and the stylesheet holds the nine resulting positions.
 *
 *  Touch screens have no hover at all, so there tapping stands in for it.
 * ========================================================================== */

(() => {
  "use strict";

  const root = document.querySelector("[data-gplan]");
  if (!root) return;

  const fab = root.querySelector("[data-gplan-toggle]");
  const panel = root.querySelector("[data-gplan-panel]");
  const closeBtn = root.querySelector("[data-gplan-close]");
  const stage = root.querySelector("[data-gplan-stage]");
  const floors = [...root.querySelectorAll("[data-gplan-floor]")];
  const groups = [...root.querySelectorAll("[data-gplan-rooms]")];

  if (!fab || !panel || !stage || !floors.length) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let active = null;
  let closeTimer = 0;

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
      floor.setAttribute("aria-pressed", String(i === index));
    });

    groups.forEach((group) => {
      const isActive = index !== null && Number(group.dataset.gplanRooms) === index;
      group.classList.toggle("is-active", isActive);
    });
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
    setActive(null);
  };

  // A short grace period keeps the panel open across the gap between the button
  // and the card, and survives the pointer skimming an edge.
  const closeSoon = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(close, 220);
  };

  if (canHover) {
    root.addEventListener("pointerenter", open);
    root.addEventListener("pointerleave", closeSoon);
  } else {
    // Touch: the button toggles, since hover does not exist here.
    fab.addEventListener("click", () => (isOpen() ? close() : open()));
  }

  // ---------------------------------------------------------------------------
  //  Etagen
  // ---------------------------------------------------------------------------

  floors.forEach((floor, i) => {
    if (canHover) {
      floor.addEventListener("pointerenter", () => setActive(i));
    } else {
      floor.addEventListener("click", () => setActive(active === i ? null : i));
    }

    // Keyboard equivalent of hovering a floor.
    floor.addEventListener("focus", () => {
      open();
      setActive(i);
    });
  });

  if (canHover) {
    // Moving off the plan - but still inside the panel - collapses the stack.
    stage.addEventListener("pointerleave", () => setActive(null));
  }

  // ---------------------------------------------------------------------------
  //  Tastatur
  // ---------------------------------------------------------------------------

  fab.addEventListener("focus", open);

  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) close();
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
})();
