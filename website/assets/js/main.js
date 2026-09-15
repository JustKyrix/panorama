/* =============================================================================
 *  ADBK / Panorama - progressive enhancement
 *
 *  Nothing here is required for the page to be readable or navigable. Every
 *  feature checks for support first and bails out quietly if it is missing, and
 *  all of it respects prefers-reduced-motion.
 * ========================================================================== */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------------------------
   *  Sticky header - adds a border + shadow once the page has scrolled.
   *  A sentinel + IntersectionObserver avoids a scroll listener firing on every
   *  frame.
   * ------------------------------------------------------------------------ */
  const initStickyHeader = () => {
    const header = document.querySelector("#siteHeader");
    if (!header || !("IntersectionObserver" in window)) return;

    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);

    new IntersectionObserver(
      ([entry]) => header.classList.toggle("is-stuck", !entry.isIntersecting),
      { rootMargin: "0px" }
    ).observe(sentinel);
  };

  /* ---------------------------------------------------------------------------
   *  Scroll reveal - elements start visible; JS opts them into the hidden state
   *  only once it knows it can reveal them again.
   * ------------------------------------------------------------------------ */
  const initReveal = () => {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("js-reveal-ready");

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((item) => observer.observe(item));
  };

  /* ---------------------------------------------------------------------------
   *  Count-up - animates the hero key figures once they scroll into view.
   *  Formatting goes through Intl so the German thousands separator is correct.
   * ------------------------------------------------------------------------ */
  const initCounters = () => {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    const format = new Intl.NumberFormat("de-DE");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      counters.forEach((el) => {
        el.textContent = format.format(Number(el.dataset.count));
      });
      return;
    }

    const run = (el) => {
      const target = Number(el.dataset.count);
      const duration = 1400;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        // easeOutExpo - fast start, gentle settle
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        el.textContent = format.format(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((el) => observer.observe(el));
  };

  /* ---------------------------------------------------------------------------
   *  Scroll spy for the main navigation - marks the section currently in view.
   * ------------------------------------------------------------------------ */
  const initNavHighlight = () => {
    const links = [...document.querySelectorAll(".mainnav__link[href^='#']")];
    if (!links.length || !("IntersectionObserver" in window)) return;

    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!sections.length) return;

    const setCurrent = (id) => {
      links.forEach((link) => {
        const isCurrent = link.getAttribute("href") === `#${id}`;
        if (isCurrent) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
    );

    sections.forEach((section) => observer.observe(section));
  };

  /* ---------------------------------------------------------------------------
   *  Ticker - pause the marquee when the tab is hidden so it does not burn
   *  frames in the background.
   * ------------------------------------------------------------------------ */
  const initTicker = () => {
    const track = document.querySelector(".ticker__track");
    if (!track) return;

    document.addEventListener("visibilitychange", () => {
      track.style.animationPlayState = document.hidden ? "paused" : "running";
    });
  };

  /* ------------------------------------------------------------------------ */

  const init = () => {
    initStickyHeader();
    initReveal();
    initCounters();
    initNavHighlight();
    initTicker();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
