document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");
// review variant: headings in IvyPresto Regular instead of Light (?titles=regular)
if (new URLSearchParams(location.search).get("titles") === "regular") document.documentElement.classList.add("titles-regular");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.matchMedia("(min-width: 901px)").matches;

// Scroll reveal across the whole page: tag every content block that isn't already tagged
(() => {
  const blocks = [
    ".problem-media", ".problem-copy > :not(h2)", ".treat-list", ".treat-col",
    ".testimonials .marquee", ".testimonials-cta", ".why-media",
    ".starting > .btn", ".faq [data-accordion]", ".final-media", ".footer-inner", ".footer .watermark",
  ];
  // these containers step aside so their inner pieces can reveal on their own
  document.querySelectorAll(".problem-card, .starting-cols").forEach((el) => el.removeAttribute("data-reveal"));
  document.querySelectorAll(blocks.join(",")).forEach((el) => {
    if (!el.closest("[data-reveal], [data-stagger]")) el.setAttribute("data-reveal", "");
  });
  // accordions/lists reveal row by row
  document.querySelectorAll(".starting-cols .acc-col, .faq [data-accordion]").forEach((el) => {
    el.removeAttribute("data-reveal");
    el.setAttribute("data-stagger", "");
  });
})();

// Title reveals (transitions.dev): hero headline word by word (streaming text),
// section titles line by line (texts reveal). Words are wrapped once; line indexes are re-measured on resize.
(() => {
  const wrapWords = (el) => {
    let n = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(part);
            // outer span is the mask, inner span is what rises through it
            const w = document.createElement("span");
            const inner = document.createElement("span");
            w.className = "t-w";
            inner.className = "t-wi";
            inner.textContent = part;
            w.append(inner);
            w.style.setProperty("--wi", n++);
            frag.append(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== "BR") walk(c);
      });
    };
    walk(el);
  };
  const setLines = (el) => {
    let line = -1, lastTop = null, k = 0;
    el.querySelectorAll(".t-w").forEach((w) => {
      const t = w.offsetTop;
      if (lastTop === null || Math.abs(t - lastTop) > 4) { line++; lastTop = t; k = 0; }
      w.style.setProperty("--line", line);
      w.style.setProperty("--k", k++);
    });
  };
  const lineTitles = [...document.querySelectorAll("[data-lines]")];
  document.querySelectorAll("[data-lines], [data-words]").forEach(wrapWords);
  lineTitles.forEach(setLines);
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => lineTitles.forEach(setLines), 150); });
})();

// Hero entrance plays once on load
(() => {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  hero.querySelectorAll(".hero-anim").forEach((el) => void getComputedStyle(el).opacity); // commit the hidden state first
  setTimeout(() => hero.classList.add("is-in"), 60);
})();

// Scroll reveal (single blocks + staggered groups)
(() => {
  document.querySelectorAll("[data-stagger]").forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 6))));
  const els = document.querySelectorAll("[data-reveal], [data-stagger], [data-words]");
  const titles = document.querySelectorAll("[data-lines]");
  if (reduceMotion || !("IntersectionObserver" in window)) return [...els, ...titles].forEach((el) => el.classList.add("is-in", "t-done"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
      if (e.target.hasAttribute("data-words")) setTimeout(() => e.target.classList.add("t-done"), 2800);
      // once revealed, hand transitions back to the element's own hover/active styles
      if (e.target.hasAttribute("data-stagger")) setTimeout(() => e.target.removeAttribute("data-stagger"), 900);
    });
  }, { rootMargin: "0px 0px -10% 0px" });
  els.forEach((el) => io.observe(el));

  // Section titles wait until they're actually in view: fully on screen and clear of the bottom edge
  const titleIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      titleIO.unobserve(e.target);
      setTimeout(() => e.target.classList.add("t-done"), 2200);
    });
  }, { threshold: 1, rootMargin: "0px 0px -15% 0px" });
  titles.forEach((el) => titleIO.observe(el));
})();

// Stats: number pop-in — each character rides in behind the previous one
(() => {
  const nums = document.querySelectorAll("[data-count]");
  nums.forEach((el) => {
    const group = document.createElement("span");
    group.className = "t-digit-group";
    group.setAttribute("aria-label", el.textContent.trim());
    [...el.textContent.trim()].forEach((ch, i) => {
      const d = document.createElement("span");
      d.className = "t-digit";
      d.textContent = ch;
      d.setAttribute("aria-hidden", "true");
      d.style.setProperty("--n", i);
      group.append(d);
    });
    el.replaceChildren(group);
  });
  if (reduceMotion || !("IntersectionObserver" in window)) return nums.forEach((el) => el.firstChild.classList.add("is-animating"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      // wait for the stats block to finish fading in, then pop each stat in turn
      const i = [...nums].indexOf(e.target);
      e.target.firstChild.style.setProperty("--stat-delay", `${i * 160}ms`);
      setTimeout(() => e.target.firstChild.classList.add("is-animating"), 450);
      io.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  nums.forEach((n) => io.observe(n));
})();

// How it works: each step plays its animation once it's in view; photos drift with the scroll
(() => {
  const steps = [...document.querySelectorAll("[data-how-steps] .how-step")];
  if (!steps.length) return;
  steps.forEach((s, i) => s.style.setProperty("--step", isDesktop() ? i : 0));
  if (reduceMotion || !("IntersectionObserver" in window)) return steps.forEach((s) => s.classList.add("is-play"));
  // play only once the step's card is really in view (most of it on screen)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const step = e.target.closest(".how-step");
      step.classList.add("is-play");
      io.unobserve(e.target);
    });
  }, { threshold: 0.75 });
  steps.forEach((s) => io.observe(s.querySelector(".how-ill") || s));

  const photos = [...document.querySelectorAll(".how-ill.photo")];
  const parallax = () => {
    const vh = window.innerHeight;
    photos.forEach((f) => {
      const r = f.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1 … 1 across the viewport
      f.style.setProperty("--plx", `${(p * r.height * 0.07).toFixed(1)}px`);
    });
  };
  let q = false;
  window.addEventListener("scroll", () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; parallax(); }); }, { passive: true });
  parallax();
})();

// Images: blur-up once loaded and in view
(() => {
  const imgs = document.querySelectorAll("img.t-img");
  const show = (img) => (img.complete && img.naturalWidth ? img.classList.add("is-loaded") : img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true }));
  if (reduceMotion || !("IntersectionObserver" in window)) return imgs.forEach(show);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -5% 0px" });
  imgs.forEach((img) => io.observe(img));
})();

// Before/after drag (pointer or keyboard via range input)
document.querySelectorAll("[data-ba]").forEach((el) => {
  const input = el.querySelector("input[type=range]");
  const set = (v) => { el.style.setProperty("--pos", v + "%"); input.value = v; };
  input.addEventListener("input", () => set(input.value));
  const fromPointer = (e) => {
    const r = el.getBoundingClientRect();
    set(Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100))));
  };
  let dragging = false;
  el.addEventListener("pointerdown", (e) => { dragging = true; el.setPointerCapture(e.pointerId); fromPointer(e); });
  el.addEventListener("pointermove", (e) => dragging && fromPointer(e));
  el.addEventListener("pointerup", () => (dragging = false));
  el.addEventListener("pointercancel", () => (dragging = false));
});

// Treatments: one open at a time; on desktop the active one follows scroll
(() => {
  const section = document.querySelector("[data-treat-section]");
  if (!section) return;
  const items = [...section.querySelectorAll(".treat-item")];
  const slides = [...section.querySelectorAll(".ba-slide")];
  let current = 0;
  const activate = (i) => {
    if (i === current) return;
    current = i;
    items.forEach((item, j) => {
      item.classList.toggle("is-open", j === i);
      item.querySelector(".treat-trigger").setAttribute("aria-expanded", j === i);
    });
    slides.forEach((s, j) => s.classList.toggle("is-active", j === i));
  };
  const scrollable = () => isDesktop() && !reduceMotion;
  const onScroll = () => {
    if (!scrollable()) return;
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const p = Math.min(0.999, Math.max(0, -r.top / Math.max(1, total)));
    activate(Math.floor(p * items.length));
  };
  items.forEach((item, i) => {
    item.querySelector(".treat-trigger").addEventListener("click", () => {
      if (scrollable()) {
        const total = section.offsetHeight - window.innerHeight;
        const top = section.getBoundingClientRect().top + window.scrollY + total * ((i + 0.5) / items.length);
        window.__lenis ? window.__lenis.scrollTo(top) : window.scrollTo({ top, behavior: "smooth" });
      } else activate(i);
    });
  });
  window.addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();
})();

// How it works: hover image follows cursor (desktop); active row on scroll (mobile)
(() => {
  const how = document.querySelector("[data-how]");
  if (!how) return;
  const list = how.querySelector(".how-list");
  const rows = [...how.querySelectorAll(".how-row")];
  const float = how.querySelector(".how-float");
  const img = float.querySelector("img");
  const setActive = (row) => {
    rows.forEach((r) => r.classList.toggle("is-active", r === row));
    list.classList.toggle("has-active", !!row);
  };
  let tx = 0, ty = 0, x = 0, y = 0, raf = null, fresh = true;
  const loop = () => {
    x += (tx - x) * 0.18; y += (ty - y) * 0.18;
    float.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : null;
  };
  const place = (row, e) => {
    const h = how.getBoundingClientRect(), num = row.querySelector(".how-num").getBoundingClientRect();
    // sits left of the number, follows the cursor slightly on Y
    tx = num.left - h.left - float.offsetWidth - 48;
    const rowMid = row.getBoundingClientRect().top + row.offsetHeight / 2 - h.top;
    ty = rowMid - float.offsetHeight / 2 + (e.clientY - h.top - rowMid) * 0.35;
    if (fresh) { x = tx; y = ty; fresh = false; float.style.transform = `translate3d(${x}px, ${y}px, 0)`; }
    if (!raf) raf = requestAnimationFrame(loop);
  };
  rows.forEach((row) => {
    row.addEventListener("mouseenter", (e) => {
      if (!isDesktop()) return;
      setActive(row);
      if (!img.src.endsWith(row.dataset.img)) img.src = row.dataset.img;
      place(row, e);
      float.classList.add("is-on");
    });
    row.addEventListener("mousemove", (e) => isDesktop() && place(row, e));
  });
  list.addEventListener("mouseleave", () => {
    if (!isDesktop()) return;
    setActive(null);
    float.classList.remove("is-on");
    fresh = true;
  });

  // Mobile: the row nearest the middle of the screen is active
  const onScroll = () => {
    if (isDesktop()) return;
    const mid = window.innerHeight / 2;
    let best = null, bestD = Infinity;
    rows.forEach((r) => {
      const b = r.getBoundingClientRect();
      const d = Math.abs(b.top + Math.min(b.height, 160) / 2 - mid);
      if (b.bottom > 0 && b.top < window.innerHeight && d < bestD) { best = r; bestD = d; }
    });
    const hb = list.getBoundingClientRect();
    setActive(hb.top < mid && hb.bottom > mid * 0.6 ? best : null);
  };
  rows.forEach((r) => r.addEventListener("click", () => !isDesktop() && setActive(r)));
  window.addEventListener("scroll", () => requestAnimationFrame(onScroll), { passive: true });
})();

// Testimonials marquee: duplicate cards for a seamless loop; pause on touch
(() => {
  const m = document.querySelector("[data-marquee]");
  if (!m) return;
  const track = m.querySelector(".marquee-track");
  [...track.children].forEach((c) => {
    const clone = c.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    // the copies sit off-screen at first; skip the blur-up on them so they're never left hidden
    clone.querySelectorAll("img.t-img").forEach((img) => img.classList.remove("t-img"));
    track.append(clone);
  });
  m.addEventListener("touchstart", () => m.classList.add("is-paused"), { passive: true });
  m.addEventListener("touchend", () => setTimeout(() => m.classList.remove("is-paused"), 2500));
})();

// Accordions (Starting points + FAQ): toggle independently
document.querySelectorAll("[data-accordion] .acc-item").forEach((item) => {
  const trigger = item.querySelector(".acc-trigger");
  trigger.addEventListener("click", () => {
    const open = !item.classList.contains("is-open");
    item.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open);
  });
});

// Mobile sticky CTA: hidden while the hero CTA is visible
(() => {
  const bar = document.querySelector(".mobile-cta");
  const heroCta = document.querySelector("[data-hero-cta]");
  if (!bar || !heroCta) return;
  new IntersectionObserver(([e]) => bar.classList.toggle("is-open", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(heroCta);
})();
