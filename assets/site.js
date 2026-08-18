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
   slow-loading file degrades silently to the poster still underneath.

   Clips whose last frame does not match their first cannot use the loop
   attribute: the wrap-around is a visible cut. Measured here, the entry clip
   on Homes jumps across 88 percent of the picture. So instead the clip fades
   out over its tail, restarts, and fades back in. The still underneath is that
   video's own first frame, so the fade lands exactly where the restart begins.
   The hero loop on the home page does close (1.2 percent) and keeps the plain
   loop attribute; data-replay="0" opts it out.
   ============================================================ */
document.querySelectorAll("video[data-loop]").forEach(v => {
  const show = () => v.classList.add("playing");
  v.addEventListener("playing", show, { once: true });
  v.addEventListener("loadeddata", show, { once: true });
  if (v.readyState >= 2) show();
  /* iOS occasionally refuses the initial autoplay; nudge it once */
  const kick = () => { v.play().catch(() => {}); };
  document.addEventListener("touchstart", kick, { once: true, passive: true });

  const tail = v.dataset.replay === undefined ? 0.7 : parseFloat(v.dataset.replay);
  if (!(tail > 0)) return;

  let armed = false;
  const restart = () => {
    v.currentTime = 0;
    v.play().catch(() => {});
    /* Two frames, not one: clearing the class in the same tick as the seek lets
       the browser fold both into a single paint and the fade never renders. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      v.classList.remove("fading"); armed = false;
    }));
  };
  v.addEventListener("ended", restart);
  (function tick() {
    const end = v.duration;
    if (end && !v.paused) {
      if (!armed && end - v.currentTime <= tail) { armed = true; v.classList.add("fading"); }
      if (v.currentTime >= end && armed) restart();
    }
    requestAnimationFrame(tick);
  })();
});

/* ---------- in-page video ----------
   A 47 MB master below the fold should not be fetched with the page, so the
   file lives in data-src and is only attached when the block is one screen
   away. From there it goes through the same loop handling as the headers. */
{
  const vids = document.querySelectorAll("video.fig-vid[data-src]");
  if (vids.length && "IntersectionObserver" in window) {
    const vio = new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return;
      const v = e.target; o.unobserve(v);
      v.src = v.dataset.src;
      v.load();
      v.play().catch(() => {});
    }), { rootMargin: "100% 0px" });
    vids.forEach(v => vio.observe(v));
  }
}

/* ---------- depth on scroll ----------
   Anything with data-depth drifts against the page as it passes the viewport,
   which is what stops a long column of stills from reading as flat. Every layer
   is oversized in CSS by more than the drift, so nothing can expose an edge, and
   it is skipped entirely for anyone who asks for reduced motion. */
{
  const layers = [...document.querySelectorAll("[data-depth]")];
  if (layers.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let queued = false;
    const paint = () => {
      queued = false;
      const vh = innerHeight;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > vh + 240) continue;
        const k = (r.top + r.height / 2 - vh / 2) / vh;       /* roughly -1 to 1 */
        const d = parseFloat(el.dataset.depth) || 30;
        el.style.transform = `translate3d(0, ${(k * d).toFixed(1)}px, 0)`;
      }
    };
    addEventListener("scroll", () => {
      if (queued) return;
      queued = true; requestAnimationFrame(paint);
    }, { passive: true });
    addEventListener("resize", paint, { passive: true });
    paint();
  }
}

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

/* ---------- presentation centre: open now, or not ----------
   data-hours is "open,close,closedDay,closedDay,..." on a 24h clock with Sunday
   as 0. A live state is worth more than a line of opening times: it answers the
   question the visitor actually has, which is whether they can go today. */
document.querySelectorAll("[data-hours]").forEach(el => {
  const parts = el.dataset.hours.split(",").map(Number);
  const [open, close] = parts;
  const shut = new Set(parts.slice(2));
  const now = new Date();
  const isOpen = !shut.has(now.getDay()) &&
                 now.getHours() + now.getMinutes() / 60 >= open &&
                 now.getHours() + now.getMinutes() / 60 < close;
  const tag = document.createElement("span");
  tag.className = "rf-now " + (isOpen ? "open" : "shut");
  tag.innerHTML = "<i></i>" + (isOpen ? "Open now" : "Closed now");
  el.appendChild(tag);
});

/* ============================================================
   REGISTER — one question per screen
   The markup ships as a plain stacked form. Only once this runs does it fold
   into steps, so a script failure leaves a working form rather than three
   hidden sections and no way to reach them.
   ============================================================ */
document.querySelectorAll("form.steps").forEach(form => {
  const steps = [...form.querySelectorAll(".step")];
  const rail  = [...form.querySelectorAll(".rail span")];
  const block = form.closest(".register");
  const thanks = block.querySelector(".thanks");
  if (steps.length < 2) return;

  form.classList.add("steps-ready");
  let i = 0;

  /* The four steps are different heights. Left alone the section lurches by
     ~120px when the last question arrives; padded to the tallest it carries a
     block of dead space on the short ones. So the stage takes the height of
     whichever step is showing and animates between them. */
  const stage = form.querySelector(".stage");
  const fit = n => { stage.style.minHeight = Math.ceil(steps[n].getBoundingClientRect().height) + "px"; };
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => fit(i), 180); });

  const show = (n, focus = true) => {
    steps.forEach((s, k) => s.classList.toggle("on", k === n));
    fit(n);
    rail.forEach((s, k) => s.classList.toggle("on", k <= n));
    steps[n].querySelector("[data-err]").textContent = "";
    if (!focus) return;
    /* preventScroll matters: without it the browser yanks the page to the field
       and the section jumps under the reader mid-answer. */
    const first = steps[n].querySelector("input:not([type=hidden]), .opt");
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 360);
  };

  const fail = (msg) => {
    const e = steps[i].querySelector("[data-err]");
    e.textContent = msg;
    steps[i].querySelector("input:not([type=hidden]), .opt")?.focus({ preventScroll: true });
  };

  const valid = () => {
    const s = steps[i];
    const required = [...s.querySelectorAll("input[required]")];
    for (const inp of required) {
      if (!inp.value.trim()) return fail("This one we do need."), false;
      if (inp.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(inp.value.trim()))
        return fail("That address does not look right."), false;
    }
    const group = s.querySelector("[data-pick]");
    if (group) {
      const name = group.dataset.pick;
      if (!s.querySelector(`input[name="${name}"]`).value)
        return fail("Pick one to carry on."), false;
    }
    return true;
  };

  form.querySelectorAll("[data-pick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = btn.closest(".step");
      s.querySelectorAll("[data-pick]").forEach(o => o.setAttribute("aria-checked", "false"));
      btn.setAttribute("aria-checked", "true");
      s.querySelector(`input[name="${btn.dataset.pick}"]`).value = btn.dataset.value;
      s.querySelector("[data-err]").textContent = "";
    });
  });

  form.querySelectorAll("[data-next]").forEach(b =>
    b.addEventListener("click", () => { if (valid()) show(++i); }));
  form.querySelectorAll("[data-back]").forEach(b =>
    b.addEventListener("click", () => show(--i)));

  /* Enter should advance, not submit the half-filled form from step one. */
  form.addEventListener("keydown", e => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const next = steps[i].querySelector("[data-next]");
    if (next) next.click(); else form.requestSubmit();
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!valid()) return;
    const name = (form.querySelector('[name="first"]').value || "").trim();
    const msg = thanks.querySelector("[data-thanks-msg]");
    msg.textContent = name
      ? name + ", the floor plans and the current price list are on their way."
      : "The floor plans and the current price list are on their way.";
    form.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  thanks.querySelector("[data-restart]").addEventListener("click", () => {
    form.reset();
    form.querySelectorAll("[data-pick]").forEach(o => o.setAttribute("aria-checked", "false"));
    i = 0; show(0, false);
    thanks.hidden = true; form.hidden = false;
    form.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  show(0, false);
});

/* ============================================================
   LIGHTBOX — shared by the gallery and the floorplan modal.
   Lightbox.open(items, index) where items = [{src, title, caption}]
   Supports: arrows, keyboard, swipe, click-to-zoom, drag-to-pan,
   wheel zoom, pinch zoom.
   ============================================================ */
const Lightbox = (() => {
  let items = [], i = 0, el = null, img = null, capEl = null, countEl = null;
  let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, px = 0, py = 0;
  let baseW = 0, baseH = 0, moved = false;
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

    /* click to toggle zoom — skipped if the pointer was dragged, otherwise
       every pan would end in a click that resets the zoom */
    img.addEventListener("click", e => {
      e.stopPropagation();
      if (moved) { moved = false; return; }
      if (scale > 1) { reset(); } else { zoomAt(2.2, e); }
    });

    /* wheel zoom, anchored on the cursor */
    el.addEventListener("wheel", e => {
      e.preventDefault();
      const next = clamp(scale * (e.deltaY < 0 ? 1.16 : 0.86), 1, MAXS);
      if (next === 1) { reset(); return; }
      zoomAt(next, e);
    }, { passive: false });

    /* drag to pan */
    img.addEventListener("pointerdown", e => {
      if (scale <= 1) return;
      e.preventDefault();
      dragging = true; moved = false; img.classList.add("grabbing");
      sx = e.clientX; sy = e.clientY; px = tx; py = ty;
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      tx = px + dx; ty = py + dy;
      clampT(); applyT();
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

  /* Size of the image with no transform applied. Panning limits are derived
     from this, so they have to be measured while the transform is off. */
  function measure() {
    const prev = img.style.transform;
    img.style.transform = "none";
    const r = img.getBoundingClientRect();
    baseW = r.width; baseH = r.height;
    img.style.transform = prev;
  }

  /* Keep the image reachable: you can always pan far enough to bring any
     edge into view (plus a little slack so the bottom clears the caption),
     but never so far that it drifts off into empty space. */
  function clampT() {
    const st = el.querySelector(".lb-stage").getBoundingClientRect();
    const slack = 90;
    const mx = Math.max(0, (baseW * scale - st.width) / 2) + slack;
    const my = Math.max(0, (baseH * scale - st.height) / 2) + slack;
    tx = clamp(tx, -mx, mx);
    ty = clamp(ty, -my, my);
  }

  const applyT = () => {
    img.classList.toggle("zoomed", scale > 1);
    el.classList.toggle("is-zoomed", scale > 1);
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };
  const reset = () => { scale = 1; tx = 0; ty = 0; applyT(); };

  /* Anchor the zoom on the pointer: a point sitting ox from the centre lands
     at ox*s after scaling, so it needs translating back by -ox*(s-1) to stay
     put. (Dividing by s here is what pulled the plan off-centre.) */
  function zoomAt(s, e) {
    if (!baseW) measure();
    const stage = el.querySelector(".lb-stage").getBoundingClientRect();
    const centreX = stage.left + stage.width / 2;
    const centreY = stage.top + stage.height / 2;
    /* offset of the cursor from the image centre, in untransformed units */
    const ox = (e.clientX - centreX - tx) / scale;
    const oy = (e.clientY - centreY - ty) / scale;
    scale = s;
    tx = -ox * (s - 1);
    ty = -oy * (s - 1);
    clampT(); applyT();
  }

  function render() {
    const it = items[i];
    reset();
    baseW = baseH = 0;
    img.style.opacity = 0;
    const show = () => {
      img.src = it.src;
      img.style.opacity = 1;
      /* measure once the browser has laid the new image out */
      requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    const pre = new Image();
    pre.onload = show;
    pre.src = it.src;
    if (pre.complete) show();
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

/* Safari on iOS tints the status bar with theme-color. Each page ships its own
   value in the head, measured off the top 26px of that page at iPhone width, so
   the bar reads as an extension of the sky rather than a white shelf above it.
   Once the nav goes solid the bar has to follow it to paper, or a sky-blue strip
   sits above a cream header. */
{
  const meta = document.querySelector('meta[name="theme-color"]');
  const navEl = document.querySelector("nav");
  if (meta && navEl) {
    const TOP = meta.getAttribute("content"), LIGHT = "#FAF7F1";
    const sync = () => {
      const solid = navEl.classList.contains("solid") ||
                    document.body.classList.contains("menu-open");
      meta.setAttribute("content", solid ? LIGHT : TOP);
    };
    new MutationObserver(sync).observe(navEl, { attributes: true, attributeFilter: ["class"] });
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    sync();
  }
}
