/* ============================================================
   TIMECODE — a small camera readout that rides along the page.
   - It sits in the bottom-left corner and stays with you as you
     scroll: a blinking REC light, a running timecode at 24 frames
     a second, the scene you're in, and a thin line showing how far
     down the page you are.
   - Scrolling fast-forwards (or rewinds) the timecode, and the box
     sways behind the scroll on a spring, like a camera on a rig.
   - At the foot of the page it slips away as the control deck comes
     into view.
   - It appears once the intro has finished.
   You should not need to edit this file.
   ============================================================ */
(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the scenes, in page order: the section's id and the name shown
  const SCENES = [["top", "Opening"], ["work", "Work"], ["photography", "Photos"], ["about", "About"], ["roles", "Roles"], ["contact", "Contact"]];

  function init(){
    const box = document.createElement("div");
    box.className = "tcb";
    box.setAttribute("aria-hidden", "true");
    box.innerHTML = `
      <div class="tcb-row"><span class="tcb-rec"><b></b>REC</span><span class="tcb-dir"></span></div>
      <div class="tcb-time">00:00:00:00</div>
      <div class="tcb-scene"></div>
      <div class="tcb-track"><span></span></div>`;
    document.body.appendChild(box);
    const time = box.querySelector(".tcb-time");
    const scene = box.querySelector(".tcb-scene");
    const dir = box.querySelector(".tcb-dir");
    const bar = box.querySelector(".tcb-track > span");
    const deck = document.getElementById("deck");

    const sections = SCENES.map(([id, name], i) => ({ el: document.getElementById(id), name, n: i + 1 })).filter(s => s.el);

    // frames: the running count; scrolling adds to it, scaled by speed
    let frames = 0, last = performance.now(), lastY = window.scrollY;
    let sway = 0, swayV = 0, shown = "", dirShown = "";

    function frame(now){
      const dt = Math.min(100, now - last); last = now;
      const y = window.scrollY, dy = y - lastY; lastY = y;

      // real time, plus a scrub of a frame for every few pixels scrolled
      frames += dt * 0.024 + dy * 0.35;
      if(frames < 0) frames = 0;
      const f = Math.floor(frames);
      const ff = f % 24, s = Math.floor(f / 24), m = Math.floor(s / 60), h = Math.floor(m / 60);
      const tc = [h, m % 60, s % 60, ff].map(v => String(v).padStart(2, "0")).join(":");
      if(tc !== shown){ time.textContent = tc; shown = tc; }

      // fast-forward / rewind marks while the page is moving
      const d = Math.abs(dy) < 2 ? "" : dy > 0 ? "▸▸" : "◂◂";
      if(d !== dirShown){ dir.textContent = d; dirShown = d; }

      // the scene: the last section whose top has passed the middle of the screen
      const mid = window.innerHeight * 0.5;
      let cur = sections[0];
      for(const sc of sections) if(sc.el.getBoundingClientRect().top <= mid) cur = sc;
      const label = `SC ${String(cur.n).padStart(2, "0")} · ${cur.name}`;
      if(scene.textContent !== label) scene.textContent = label;

      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;

      // the deck at the foot takes over: the box slips away while it's up
      if(deck) box.classList.toggle("is-away", deck.getBoundingClientRect().top < window.innerHeight - 40);
      const lift = 0;

      // the box lags behind the scroll on a spring, and settles back
      if(reduced) box.style.transform = `translate3d(0, ${-lift}px, 0)`;
      else {
        swayV += (-dy * 0.6 - sway) * 0.12;
        swayV *= 0.78;
        sway += swayV;
        sway = Math.max(-28, Math.min(28, sway));
        box.style.transform = `translate3d(0, ${(sway - lift).toFixed(2)}px, 0) rotate(${(sway * 0.12).toFixed(2)}deg)`;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // show it once the intro is over
    Promise.resolve(window.__tkIntro).then(() => setTimeout(() => box.classList.add("is-on"), 600));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
