// Smooth scroll for the whole page (Lenis — https://lenis.dev) + Lenis Snap:
// scroll freely with inertia; as it slows down it settles on the nearest section instead of anywhere.
import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis.mjs";
import Snap from "https://cdn.jsdelivr.net/npm/lenis@1.3.4/dist/lenis-snap.mjs";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.matchMedia("(min-width: 901px)").matches;

if (!reduceMotion) {
  // more inertia than the default (lerp 0.1): the page keeps gliding longer after each scroll
  const lenis = new Lenis({ autoRaf: true, lerp: 0.05, wheelMultiplier: 0.9, anchors: { offset: -78 } });
  window.__lenis = lenis;

  const easeOut = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)); // expo out
  const snap = new Snap(lenis, { type: "proximity", duration: 1.1, easing: easeOut, debounce: 120 });

  // Snap points: each section top (just under the nav). Tall sections also get stops inside them so
  // you can rest mid-section, and Treatments gets one stop per treatment.
  const NAV = () => document.querySelector(".nav").offsetHeight;
  const sections = [...document.querySelectorAll("main > section, .footer")];
  let removers = [];
  const build = () => {
    removers.forEach((r) => r());
    removers = [];
    // no snapping on narrow screens (and Snap must not run with an empty list)
    if (!isDesktop()) return snap.stop();
    snap.start();
    const vh = window.innerHeight, nav = NAV(), pts = [];
    sections.forEach((s) => {
      const docTop = s.getBoundingClientRect().top + window.scrollY;
      const t = docTop - nav, end = docTop + s.offsetHeight - vh;
      pts.push(t);
      if (s.matches("[data-treat-section]")) {
        const total = s.offsetHeight - vh, n = s.querySelectorAll(".treat-item").length;
        for (let i = 1; i < n; i++) pts.push(docTop + (total * (i + 0.5)) / n);
      } else if (end - t > vh * 0.25) {
        for (let y = t + (vh - nav) * 0.8; y < end - 40; y += (vh - nav) * 0.8) pts.push(y);
        pts.push(end);
      }
    });
    removers = pts.map((y) => snap.add(Math.max(0, Math.round(y))));
  };
  build();
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  window.addEventListener("load", build);
}
