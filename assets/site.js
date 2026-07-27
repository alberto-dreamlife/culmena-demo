/* ============ CULMENA shared behaviour ============ */

/* nav: transparent over hero → solid on scroll */
const nav = document.querySelector("nav");
const onScrollNav = () => nav.classList.toggle("solid", window.scrollY > 40);
window.addEventListener("scroll", onScrollNav, {passive:true});
onScrollNav();

/* reveal on scroll */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
}, {threshold:.12, rootMargin:"0px 0px -40px 0px"});
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

/* subtle hero parallax */
const heroImg = document.querySelector(".hero .media img");
if (heroImg){
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y < window.innerHeight) heroImg.style.transform = `scale(1.02) translateY(${y * 0.18}px)`;
  }, {passive:true});
}

/* counters */
const counters = document.querySelectorAll("[data-count]");
if (counters.length){
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
  }, {threshold:.5});
  counters.forEach(el => cio.observe(el));
}

/* demo register form */
document.querySelectorAll("form[data-demo]").forEach(f =>
  f.addEventListener("submit", e => { e.preventDefault(); alert("Demo only — no data is sent."); }));
