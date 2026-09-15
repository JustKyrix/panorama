/* =============================================================================
 *  Gebäudeplan - floating floor navigator for the map view
 *
 *  The fan itself is pure CSS maths; this file only decides *which* floor is
 *  active and writes two custom properties:
 *
 *      --h : index of the active floor
 *      --s : the gap in use (--spread while fanned, --compact at rest)
 *
 *  Pointer devices drive it by hover, keyboards by focus, touch by tap.
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

  // Touch devices get tap-to-select, because they never produce a hover state.
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let active = null;

  // ---------------------------------------------------------------------------
  //  Aktive Etage setzen
  // ---------------------------------------------------------------------------

  const setActive = (index) => {
    if (index === active) return;
    active = index;

    if (index === null) {
      // Resting stack: `--s` back to `--compact` makes the fan formula collapse.
      stage.style.setProperty("--h", "1");
      stage.style.setProperty("--s", "var(--compact)");
      stage.removeAttribute("data-active");
    } else {
      stage.style.setProperty("--h", String(index));
      stage.style.setProperty("--s", "var(--spread)");
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
  //  Etagen-Interaktion
  // ---------------------------------------------------------------------------

  floors.forEach((floor, i) => {
    if (canHover) {
      floor.addEventListener("pointerenter", () => setActive(i));
    }

    // Keyboard: focusing a floor fans the stack around it.
    floor.addEventListener("focus", () => setActive(i));

    // Tap (and click) toggles - the only way in on a touch screen.
    floor.addEventListener("click", () => {
      setActive(active === i ? null : i);
    });
  });

  if (canHover) {
    // Leaving the whole stage returns it to the thick resting state.
    stage.addEventListener("pointerleave", () => setActive(null));
  }

  // Tabbing out of the stack collapses it again.
  stage.addEventListener("focusout", (event) => {
    if (!stage.contains(event.relatedTarget)) setActive(null);
  });

  // ---------------------------------------------------------------------------
  //  Panel öffnen / schließen
  // ---------------------------------------------------------------------------

  const isOpen = () => !panel.hidden;

  const open = () => {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    // Send focus into the panel so keyboard users land where the action is.
    (floors[1] || floors[0]).focus({ preventScroll: true });
  };

  const close = ({ restoreFocus = true } = {}) => {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    setActive(null);
    if (restoreFocus) fab.focus({ preventScroll: true });
  };

  fab.addEventListener("click", () => (isOpen() ? close() : open()));
  closeBtn?.addEventListener("click", () => close());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) close();
  });

  // A click anywhere outside dismisses the panel, as overlays are expected to.
  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !root.contains(event.target)) close({ restoreFocus: false });
  });
})();
