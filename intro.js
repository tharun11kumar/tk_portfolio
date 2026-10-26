/* ============================================================
   INTRO — the camera turning on, before the page appears.
   1. The viewfinder: corner brackets slide in, the readouts light
      up (REC, frame rate, exposure) and the timecode runs.
   2. Focus pull: the name rolls in blurred and pulls sharp while
      the focus square hunts, then locks.
   3. Shutter: a flash, and an eight-bladed iris spins open from the
      middle to reveal the page as the name zooms through it.
   A click, a key or a scroll skips it. Visitors who asked for less
   motion never see it. The page waits for window.__tkIntro.
   You should not need to edit this file.
   ============================================================ */
(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced){ window.__tkIntro = Promise.resolve(); return; }

  let finish;
  window.__tkIntro = new Promise(r => { finish = r; });
  const html = document.documentElement;
  html.classList.add("intro-on");

  const name = (window.CONTENT && CONTENT.name) || "Tharun Kumar";
  const el = document.createElement("div");
  el.className = "intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <svg class="intro-iris" preserveAspectRatio="none"><path class="intro-blades"/><path class="intro-shade" fill-rule="evenodd"/></svg>
    <div class="intro-vf">
      <span class="intro-corner tl"></span><span class="intro-corner tr"></span>
      <span class="intro-corner bl"></span><span class="intro-corner br"></span>
      <span class="intro-hud hud-tl"><b></b>REC</span>
      <span class="intro-hud hud-tr">4K &middot; 24 FPS</span>
      <span class="intro-hud hud-bl">ISO 400 &middot; f/1.8 &middot; 1/50</span>
      <span class="intro-hud hud-br intro-tc">00:00:00:00</span>
      <span class="intro-focus"></span>
      <span class="intro-name"></span>
    </div>
    <div class="intro-flash"></div>`;
  el.querySelector(".intro-name").textContent = name;
  document.body.prepend(el);
  // content.js loads after this script; take the name from it once it has
  document.addEventListener("DOMContentLoaded", () => {
    if(window.CONTENT && CONTENT.name) el.querySelector(".intro-name").textContent = CONTENT.wordmark || CONTENT.name;
  });

  const svg = el.querySelector(".intro-iris");
  const shade = el.querySelector(".intro-shade");
  const blades = el.querySelector(".intro-blades");
  const tc = el.querySelector(".intro-tc");

  // the iris: the screen in black with an eight-sided hole of radius r, turned by a,
  // and the blade edges running on from each corner of the hole
  function iris(r, a){
    const w = window.innerWidth, h = window.innerHeight, cx = w / 2, cy = h / 2;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const pts = [];
    for(let k = 0; k < 8; k++){
      const t = a + k * Math.PI / 4;
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    shade.setAttribute("d", `M0 0H${w}V${h}H0Z M` + pts.map(p => p.join(" ")).join(" L") + "Z");
    const L = Math.hypot(w, h);
    let d = "";
    for(let k = 0; k < 8; k++){
      const p = pts[k], q = pts[(k + 1) % 8];
      const ux = (q[0] - p[0]), uy = (q[1] - p[1]), l = Math.hypot(ux, uy) || 1;
      d += `M${p[0]} ${p[1]}L${p[0] - ux / l * L} ${p[1] - uy / l * L}`;
    }
    blades.setAttribute("d", d);
  }

  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const T_SHUTTER = 1450, T_OPEN = 900;
  let t0 = 0;
  let done = false, frames = 0;

  function tick(now){
    if(done) return;
    const t = now - t0;
    // the timecode runs fast, like a camera spinning up
    frames += 3;
    const f = frames % 24, s = Math.floor(frames / 24);
    tc.textContent = `00:00:${String(s % 60).padStart(2, "0")}:${String(f).padStart(2, "0")}`;

    if(t < T_SHUTTER){
      iris(0, 0);
    } else {
      const p = Math.min(1, (t - T_SHUTTER) / T_OPEN);
      const R = Math.hypot(window.innerWidth, window.innerHeight) * 0.62;
      iris(R * easeInOut(p), ease(p) * Math.PI / 3);
      if(p >= 1){ end(); return; }
    }
    requestAnimationFrame(tick);
  }

  function start(){
    // the clock starts with the animation, not with the page load
    t0 = performance.now();
    el.classList.add("is-go");
    setTimeout(() => el.classList.add("is-locked"), 1180);
    setTimeout(() => el.classList.add("is-shutter"), T_SHUTTER);
    requestAnimationFrame(tick);
  }

  function end(){
    if(done) return;
    done = true;
    el.classList.add("is-gone");
    html.classList.remove("intro-on");
    finish();
    setTimeout(() => el.remove(), 500);
  }

  // skipping: the iris opens straight away
  const skip = () => {
    if(done || el.classList.contains("is-shutter")) { if(!done) end(); return; }
    end();
  };
  window.addEventListener("keydown", skip, { once: true });
  window.addEventListener("wheel", skip, { once: true, passive: true });
  window.addEventListener("touchstart", skip, { once: true, passive: true });
  el.addEventListener("pointerdown", skip);

  // start once the display font is in, so the name pulls focus in its own face
  const go = () => requestAnimationFrame(start);
  if(document.fonts && document.fonts.load){
    Promise.race([document.fonts.load('400 64px "Anton"'), new Promise(r => setTimeout(r, 400))]).then(go);
  } else go();
  // never leave anyone behind a black screen
  setTimeout(end, 6000);
})();
