/* ============================================================
   CULMENA — shared behaviour  (rev. Jul 2026, post-RK review)
   ============================================================ */

/* ---------- nav: transparent over hero → solid on scroll ---------- */
const nav = document.querySelector("nav");
if (nav) {
  const onScrollNav = () => nav.classList.toggle("solid", window.scrollY > 40);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();
}

/* ---------- mobile drawer ---------- */
const burger = document.querySelector(".burger");
const drawer = document.querySelector(".drawer");
if (burger && drawer) {
  const setMenu = on => {
    document.body.classList.toggle("menu-open", on);
    burger.setAttribute("aria-expanded", String(on));
    drawer.setAttribute("aria-hidden", String(!on));
  };
  burger.addEventListener("click", () =>
    setMenu(!document.body.classList.contains("menu-open")));
  drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
  });
  /* close the drawer if the viewport grows back to desktop */
  matchMedia("(min-width:981px)").addEventListener("change", e => { if (e.matches) setMenu(false); });
}

/* ---------- video headers ----------
   Fade the loop in only once it actually starts playing, so a missing or
   slow-loading file degrades silently to the poster still underneath. */
document.querySelectorAll("video[data-loop]").forEach(v => {
  const show = () => v.classList.add("playing");
  v.addEventListener("playing", show, { once: true });
  if (v.readyState >= 3) show();
  /* iOS occasionally refuses the initial autoplay; nudge it once */
  const kick = () => { v.play().catch(() => {}); document.removeEventListener("touchstart", kick); };
  document.addEventListener("touchstart", kick, { once: true, passive: true });
});

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  });
}, { threshold: .12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* ---------- subtle hero parallax ---------- */
const heroMedia = document.querySelector(".hero .media");
if (heroMedia) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const h = heroMedia.offsetHeight;
      if (y < h) {
        /* capped at the 12% headroom baked into .hero .media img/video */
        const shift = Math.min(y * 0.16, h * 0.11);
        heroMedia.style.transform = `translate3d(0, ${shift}px, 0)`;
      }
      ticking = false;
    });
  }, { passive: true });
}

/* ---------- counters ---------- */
const counters = document.querySelectorAll("[data-count]");
if (counters.length) {
  const cio = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = parseInt(el.dataset.count, 10), suf = el.dataset.suffix || "";
      const t0 = performance.now(), dur = 1400;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: .5 });
  counters.forEach(el => cio.observe(el));
}

/* ---------- demo register form ---------- */
document.querySelectorAll("form[data-demo]").forEach(f =>
  f.addEventListener("submit", e => {
    e.preventDefault();
    alert("Demo only — no data is sent.");
  }));

/* ============================================================
   LIGHTBOX — shared by the gallery and the floorplan modal.
   Lightbox.open(items, index) where items = [{src, title, caption}]
   Supports: arrows, keyboard, swipe, click-to-zoom, drag-to-pan,
   wheel zoom, pinch zoom.
   ============================================================ */
const Lightbox = (() => {
  let items = [], i = 0, el = null, img = null, capEl = null, countEl = null;
  let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, px = 0, py = 0;
  const MAXS = 4;

  function build() {
    el = document.createElement("div");
    el.className = "lb";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <span class="lb-zoomhint">Click image to zoom</span>
      <button class="lb-close" aria-label="Close">&#10005;</button>
      <button class="lb-prev" aria-label="Previous">&#8249;</button>
      <button class="lb-next" aria-label="Next">&#8250;</button>
      <div class="lb-stage"><img alt=""></div>
      <div class="lb-bar">
        <div class="lb-cap"></div>
        <div class="lb-count"></div>
      </div>`;
    document.body.appendChild(el);
    img = el.querySelector("img");
    capEl = el.querySelector(".lb-cap");
    countEl = el.querySelector(".lb-count");

    el.querySelector(".lb-close").addEventListener("click", close);
    el.querySelector(".lb-prev").addEventListener("click", e => { e.stopPropagation(); go(-1); });
    el.querySelector(".lb-next").addEventListener("click", e => { e.stopPropagation(); go(1); });
    el.addEventListener("click", e => {
      if (e.target === el || e.target.classList.contains("lb-stage")) close();
    });

    /* click to toggle zoom */
    img.addEventListener("click", e => {
      e.stopPropagation();
      if (scale > 1) { reset(); } else { zoomAt(2.2, e); }
    });

    /* wheel zoom */
    el.addEventListener("wheel", e => {
      e.preventDefault();
      const next = clamp(scale * (e.deltaY < 0 ? 1.16 : 0.86), 1, MAXS);
      if (next === 1) reset(); else { scale = next; applyT(); }
    }, { passive: false });

    /* drag to pan */
    img.addEventListener("pointerdown", e => {
      if (scale <= 1) return;
      dragging = true; img.classList.add("grabbing");
      sx = e.clientX; sy = e.clientY; px = tx; py = ty;
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener("pointermove", e => {
      if (!dragging) return;
      tx = px + (e.clientX - sx); ty = py + (e.clientY - sy); applyT();
    });
    const endDrag = () => { dragging = false; img.classList.remove("grabbing"); };
    img.addEventListener("pointerup", endDrag);
    img.addEventListener("pointercancel", endDrag);

    /* swipe between images when not zoomed */
    let tsx = 0, tsy = 0;
    el.addEventListener("touchstart", e => {
      tsx = e.touches[0].clientX; tsy = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", e => {
      if (scale > 1 || items.length < 2) return;
      const dx = e.changedTouches[0].clientX - tsx;
      const dy = e.changedTouches[0].clientY - tsy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    document.addEventListener("keydown", e => {
      if (!el.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const applyT = () => {
    img.classList.toggle("zoomed", scale > 1);
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  const reset = () => { scale = 1; tx = 0; ty = 0; applyT(); };

  function zoomAt(s, e) {
    const r = img.getBoundingClientRect();
    const ox = e.clientX - (r.left + r.width / 2);
    const oy = e.clientY - (r.top + r.height / 2);
    scale = s; tx = -ox * (s - 1) / s; ty = -oy * (s - 1) / s;
    applyT();
  }

  function render() {
    const it = items[i];
    reset();
    img.style.opacity = 0;
    const pre = new Image();
    pre.onload = () => { img.src = it.src; img.style.opacity = 1; };
    pre.src = it.src;
    if (pre.complete) { img.src = it.src; img.style.opacity = 1; }
    img.alt = it.title || "";
    capEl.innerHTML = (it.title ? `<b>${it.title}</b>` : "") + (it.caption || "");
    countEl.textContent = items.length > 1 ? `${i + 1} / ${items.length}` : "";
    const multi = items.length > 1;
    el.querySelector(".lb-prev").style.display = multi ? "grid" : "none";
    el.querySelector(".lb-next").style.display = multi ? "grid" : "none";
  }

  function go(step) {
    if (items.length < 2) return;
    i = (i + step + items.length) % items.length;
    render();
  }

  function open(list, index = 0) {
    if (!el) build();
    items = list; i = index;
    render();
    el.classList.add("open");
    requestAnimationFrame(() => el.classList.add("show"));
    document.body.style.overflow = "hidden";
  }

  function close() {
    el.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => el.classList.remove("open"), 300);
  }

  return { open, close };
})();
window.Lightbox = Lightbox;

/* ---------- auto-wire any [data-lightbox] gallery on the page ---------- */
(() => {
  const nodes = [...document.querySelectorAll("[data-lightbox]")];
  if (!nodes.length) return;
  const items = nodes.map(n => ({
    src: n.dataset.full || n.querySelector("img")?.src,
    title: n.dataset.title || "",
    caption: n.dataset.caption || ""
  }));
  nodes.forEach((n, idx) => {
    n.style.cursor = "zoom-in";
    n.addEventListener("click", e => { e.preventDefault(); Lightbox.open(items, idx); });
  });
})();
