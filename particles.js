/* ============================================================
   PARTICLES — the moving layer of the site.
   - The hero builds your photos out of particles. They scatter
     away from the cursor (or a finger) and drift back, and every
     few seconds they re-form into the next photo.
   - A light field of drifting points sits behind the whole page
     and also gets out of the cursor's way.
   - "React to sound" listens to the microphone (nothing is
     recorded or sent anywhere) and lets the volume push the
     particles and swell the glow.
   Everything holds still for visitors with "reduce motion" on.
   You should not need to edit this file.
   ============================================================ */

(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- shared pointer + sound state ---------- */
  const pointer = { x: -9999, y: -9999, active: false };
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.active = false; });
  window.addEventListener("touchend", () => { pointer.active = false; }, { passive: true });

  const sound = { level: 0, bass: 0, on: false };
  window.TKSound = sound;

  /* ============================================================
     SOUND — microphone level, only after the visitor asks for it
     ============================================================ */
  let audio = null;
  async function startSound(){
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.7;
    src.connect(analyser);
    const wave = new Uint8Array(analyser.fftSize);
    const freq = new Uint8Array(analyser.frequencyBinCount);
    audio = { stream, ctx, analyser, wave, freq };
    sound.on = true;
  }
  function stopSound(){
    if(!audio) return;
    audio.stream.getTracks().forEach(t => t.stop());
    audio.ctx.close();
    audio = null;
    sound.on = false;
  }
  function readSound(){
    if(!audio){
      sound.level *= 0.9; sound.bass *= 0.9;
    } else {
      audio.analyser.getByteTimeDomainData(audio.wave);
      let sum = 0;
      for(let i = 0; i < audio.wave.length; i++){ const v = (audio.wave[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / audio.wave.length);
      audio.analyser.getByteFrequencyData(audio.freq);
      let low = 0; const n = 12;
      for(let i = 1; i <= n; i++) low += audio.freq[i];
      // gentle curve so talking moves things and music moves them a lot
      const lvl = Math.min(1, Math.pow(rms * 4.2, 0.85));
      const bass = Math.min(1, low / n / 200);
      sound.level += (lvl - sound.level) * 0.35;
      sound.bass += (bass - sound.bass) * 0.25;
    }
    document.documentElement.style.setProperty("--level", sound.level.toFixed(3));
    document.documentElement.style.setProperty("--bass", sound.bass.toFixed(3));
  }

  function initSoundButton(){
    const btn = document.getElementById("sound-toggle");
    if(!btn) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || reduced){
      btn.hidden = true;
      return;
    }
    const label = btn.querySelector(".sound-label");
    btn.addEventListener("click", async () => {
      if(sound.on){
        stopSound();
        btn.setAttribute("aria-pressed", "false");
        label.textContent = "React to sound";
        return;
      }
      label.textContent = "Allow the microphone…";
      try{
        await startSound();
        btn.setAttribute("aria-pressed", "true");
        label.textContent = "Listening — make some noise";
      } catch(err){
        btn.setAttribute("aria-pressed", "false");
        label.textContent = "Microphone blocked";
        setTimeout(() => { label.textContent = "React to sound"; }, 2600);
      }
    });
  }

  /* ============================================================
     HERO — photos made of particles
     The photo is a fine grid of particles, one per cell, so at rest
     the picture reads clearly. Each photo fades to nothing toward its
     edges, so there is never a hard frame. Changing photo sends a
     ripple out from where you clicked (or the centre): as it reaches
     a particle, that particle pops out, takes the new photo's colour
     and settles back into place. Positions live in typed arrays and
     are drawn into a small pixel buffer scaled up crisply, which keeps
     tens of thousands of particles fast.
     ============================================================ */
  function smooth(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  // every grid cell of the photo, with its colour and how visible it is
  function sampleImage(img, gw, gh){
    const off = document.createElement("canvas");
    off.width = gw; off.height = gh;
    const g = off.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high";
    // cover-fit the photo into the grid
    const s = Math.max(gw / img.naturalWidth, gh / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.drawImage(img, (gw - dw) / 2, (gh - dh) / 2, dw, dh);
    const data = g.getImageData(0, 0, gw, gh).data;
    const n = gw * gh;
    const r = new Uint8Array(n), gg = new Uint8Array(n), b = new Uint8Array(n), al = new Float32Array(n);
    for(let y = 0; y < gh; y++){
      const ny = (y + 0.5) / gh * 2 - 1;
      for(let x = 0; x < gw; x++){
        const i = y * gw + x, k = i * 4;
        const nx = (x + 0.5) / gw * 2 - 1;
        // a soft oval vignette: full strength in the middle, fading to exactly
        // nothing a little inside every edge, so the canvas never shows a line
        const e = Math.sqrt(nx * nx * 0.96 + ny * ny);
        const vig = smooth((0.96 - e) / 0.7);
        const lum = (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255;
        r[i] = data[k]; gg[i] = data[k + 1]; b[i] = data[k + 2];
        // true black stays see-through so the glow shows through it
        al[i] = Math.min(1, lum * 10) * vig;
      }
    }
    return { r, g: gg, b, al };
  }

  function initHero(){
    const stage = document.getElementById("hero-stage");
    const canvas = document.getElementById("hero-particles");
    if(!stage || !canvas) return;
    const sources = (window.TK_HERO_PHOTOS || []).filter(p => p && p.src);
    const caption = document.getElementById("hero-caption-title");
    if(!sources.length) return;

    if(reduced){
      // a still photo in place of the particles
      const img = new Image();
      img.src = sources[0].src;
      img.alt = sources[0].title || "";
      img.className = "hero-still";
      stage.appendChild(img);
      canvas.remove();
      if(caption) caption.textContent = sources[0].title || "";
      return;
    }

    const g = canvas.getContext("2d");
    const buf = document.createElement("canvas");
    const bg = buf.getContext("2d");
    let W = 0, H = 0, rect = null, step = 3, gw = 1, gh = 1, pix = null, pix32 = null;
    let current = -1;
    const images = sources.map(s => { const im = new Image(); im.decoding = "async"; im.src = s.src; return im; });

    // particle state: particle i always belongs to grid cell i
    let N = 0;
    let X, Y, VX, VY, HX, HY, CR, CG, CB, A, TR, TG, TB, TA, WAIT;
    // the next photo, held until the ripple reaches each particle
    let NR, NG, NB, NA;

    function size(){
      rect = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      // finer grid on bigger, faster screens; about 36k particles on a desktop
      const target = fine ? 36000 : 15000;
      step = Math.max(2, Math.ceil(Math.sqrt((W * H) / target)));
      gw = Math.ceil(W / step); gh = Math.ceil(H / step);
      buf.width = gw; buf.height = gh;
      pix = bg.createImageData(gw, gh);
      pix32 = new Uint32Array(pix.data.buffer);
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.imageSmoothingEnabled = false;

      N = gw * gh;
      const f = () => new Float32Array(N);
      X = f(); Y = f(); VX = f(); VY = f(); HX = f(); HY = f();
      CR = f(); CG = f(); CB = f(); A = f(); TR = f(); TG = f(); TB = f(); TA = f(); WAIT = f();
      NR = f(); NG = f(); NB = f(); NA = f();
      for(let i = 0; i < N; i++){
        HX[i] = (i % gw + 0.5) * step;
        HY[i] = (((i / gw) | 0) + 0.5) * step;
        // the first photo assembles out of a scattered cloud, like it is being developed
        X[i] = Math.random() * W; Y[i] = Math.random() * H;
        WAIT[i] = -1;
      }
    }

    // ox, oy: where the ripple starts (the click, or the middle)
    function form(index, ox, oy, instant){
      const img = images[index];
      if(!img.complete || !img.naturalWidth){
        img.addEventListener("load", () => form(index, ox, oy, instant), { once: true });
        return;
      }
      current = index;
      if(caption) caption.textContent = sources[index].title || "";
      const s = sampleImage(img, gw, gh);
      if(ox == null){ ox = W / 2; oy = H / 2; }
      // the ripple crosses the whole stage in about 0.9 seconds
      const reach = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) || 1;
      for(let i = 0; i < N; i++){
        NR[i] = s.r[i]; NG[i] = s.g[i]; NB[i] = s.b[i]; NA[i] = s.al[i];
        if(instant){
          TR[i] = CR[i] = NR[i]; TG[i] = CG[i] = NG[i]; TB[i] = CB[i] = NB[i]; TA[i] = NA[i]; A[i] = 0;
          WAIT[i] = -1;
        } else {
          const d = Math.hypot(HX[i] - ox, HY[i] - oy) / reach;
          WAIT[i] = d * 900 + Math.random() * 90;
        }
      }
      rippleX = ox; rippleY = oy; rippleReach = reach;
    }
    let rippleX = 0, rippleY = 0, rippleReach = 1;

    let visible = true, raf = null, last = performance.now(), sinceSwap = 0;
    const HOLD = 6500;

    function tick(now){
      raf = null;
      if(!visible) return;
      const ms = Math.min(48, now - last); last = now;
      const dt = ms / 16.67;
      readSound();
      sinceSwap += ms;
      if(sinceSwap > HOLD && images.length > 1 && !pointerOnStage()){
        sinceSwap = 0;
        form((current + 1) % images.length);
      }

      const mx = pointer.x - rect.left, my = pointer.y - rect.top, push = pointer.active;
      const R = Math.max(70, Math.min(W, H) * 0.15) * (1 + sound.level * 0.8);
      const R2 = R * R;
      const lvl = sound.level, bass = sound.bass, shake = lvl > 0.02;
      const cx = W / 2, cy = H / 2;
      // friction scaled to the frame time, so slow screens settle as fast as quick ones
      const damp = Math.pow(0.84, dt), ease = 1 - Math.pow(0.86, dt), fade = 1 - Math.pow(0.9, dt);

      pix32.fill(0);
      for(let i = 0; i < N; i++){
        // the ripple arrives: pop out away from where it started, then take the new colour
        if(WAIT[i] >= 0){
          WAIT[i] -= ms;
          if(WAIT[i] < 0){
            TR[i] = NR[i]; TG[i] = NG[i]; TB[i] = NB[i]; TA[i] = NA[i];
            const dx = HX[i] - rippleX, dy = HY[i] - rippleY, d = Math.sqrt(dx * dx + dy * dy) || 1;
            const kick = 2 + 3.5 * (1 - Math.min(1, d / rippleReach));
            VX[i] += (dx / d) * kick + (Math.random() - 0.5) * 2.5;
            VY[i] += (dy / d) * kick + (Math.random() - 0.5) * 2.5 - 1.2;
          }
        }
        let ax = (HX[i] - X[i]) * 0.055, ay = (HY[i] - Y[i]) * 0.055;
        if(push){
          const dx = X[i] - mx, dy = Y[i] - my, d2 = dx * dx + dy * dy;
          if(d2 < R2){
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            ax += (dx / d) * f * f * 9; ay += (dy / d) * f * f * 9;
          }
        }
        if(shake){
          const ox = HX[i] - cx, oy = HY[i] - cy, od = Math.sqrt(ox * ox + oy * oy) || 1;
          ax += (ox / od) * bass * 2.4 + (Math.random() - 0.5) * lvl * 5;
          ay += (oy / od) * bass * 2.4 + (Math.random() - 0.5) * lvl * 5;
        }
        const vx = (VX[i] + ax * dt) * damp, vy = (VY[i] + ay * dt) * damp;
        VX[i] = vx; VY[i] = vy;
        const x = X[i] += vx * dt, y = Y[i] += vy * dt;
        CR[i] += (TR[i] - CR[i]) * ease; CG[i] += (TG[i] - CG[i]) * ease; CB[i] += (TB[i] - CB[i]) * ease;
        const a = A[i] += (TA[i] - A[i]) * fade;
        if(a < 0.01) continue;

        const gx = (x / step) | 0, gy = (y / step) | 0;
        if(gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
        // fast movers glow warm, like sparks
        const sp = vx * vx + vy * vy;
        let r = CR[i], gg = CG[i], b = CB[i];
        if(sp > 0.4){
          const t = Math.min(1, (Math.sqrt(sp) - 0.6) / 6);
          r += (255 - r) * t; gg += (110 - gg) * t; b += (50 - b) * t;
        }
        // where two particles land on one cell, the brighter one shows
        const j = gy * gw + gx, prev = pix32[j] >>> 24, al = (a * 255) | 0;
        if(al >= prev) pix32[j] = (al << 24) | ((b | 0) << 16) | ((gg | 0) << 8) | (r | 0);
      }

      bg.putImageData(pix, 0, 0);
      g.clearRect(0, 0, W, H);
      g.drawImage(buf, 0, 0, gw * step, gh * step);
      raf = requestAnimationFrame(tick);
    }

    function pointerOnStage(){
      return pointer.active && rect &&
        pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    }

    function start(){ if(!raf){ last = performance.now(); raf = requestAnimationFrame(tick); } }

    size();
    form(0, null, null, true);
    start();

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if(visible) start();
    }).observe(stage);
    document.addEventListener("visibilitychange", () => { if(!document.hidden) start(); });

    // clicking the stage sends the next photo out from where you clicked
    stage.addEventListener("click", (e) => {
      sinceSwap = 0;
      const r = stage.getBoundingClientRect();
      const fromPointer = e.detail > 0;   // a keyboard "click" has no position
      form((current + 1) % images.length, fromPointer ? e.clientX - r.left : null, fromPointer ? e.clientY - r.top : null);
    });
    stage.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); sinceSwap = 0; form((current + 1) % images.length); }
    });

    let rt = null, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        // phones fire resize when the address bar slides; only rebuild on a real width change
        if(window.innerWidth === lastW){ rect = stage.getBoundingClientRect(); return; }
        lastW = window.innerWidth;
        size(); form(Math.max(0, current), null, null, true);
      }, 150);
    });
    window.addEventListener("scroll", () => { rect = stage.getBoundingClientRect(); }, { passive: true });
  }

  /* ============================================================
     FIELD — the drifting points behind the whole page
     ============================================================ */
  function initField(){
    const canvas = document.getElementById("field");
    if(!canvas) return;
    if(reduced){ canvas.remove(); return; }
    const g = canvas.getContext("2d");
    let W, H, dots = [];
    const COLORS = ["255,90,31", "255,46,126", "120,110,255", "255,190,120", "244,241,234"];

    function size(){
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.round(Math.min(150, (W * H) / (fine ? 11000 : 16000)));
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: 0.6 + Math.random() * 1.6,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        a: 0.25 + Math.random() * 0.5,
      }));
    }

    let lastY = window.scrollY, drift = 0;
    function tick(){
      if(document.hidden){ requestAnimationFrame(tick); return; }
      if(!document.getElementById("hero-particles")) readSound();
      // scrolling stirs the field a little
      const y = window.scrollY; drift += (y - lastY) * 0.02; lastY = y; drift *= 0.9;
      const lvl = sound.level;
      g.clearRect(0, 0, W, H);
      const R = 140, R2 = R * R;
      for(const d of dots){
        let ax = 0, ay = 0;
        if(pointer.active){
          const dx = d.x - pointer.x, dy = d.y - pointer.y, d2 = dx * dx + dy * dy;
          if(d2 < R2){ const dd = Math.sqrt(d2) || 1, f = 1 - dd / R; ax += (dx / dd) * f * 0.9; ay += (dy / dd) * f * 0.9; }
        }
        d.vx = (d.vx + ax) * 0.96 + (Math.random() - 0.5) * 0.02 * (1 + lvl * 20);
        d.vy = (d.vy + ay) * 0.96 + (Math.random() - 0.5) * 0.02 * (1 + lvl * 20) - drift * 0.02;
        d.x += d.vx * (1 + lvl * 3); d.y += d.vy * (1 + lvl * 3);
        if(d.x < -10) d.x = W + 10; else if(d.x > W + 10) d.x = -10;
        if(d.y < -10) d.y = H + 10; else if(d.y > H + 10) d.y = -10;
        const rr = d.r * (1 + lvl * 1.5);
        g.fillStyle = `rgba(${d.c},${Math.min(1, d.a + lvl * 0.4).toFixed(3)})`;
        g.beginPath(); g.arc(d.x, d.y, rr, 0, Math.PI * 2); g.fill();
      }
      // thin threads between points that sit near the cursor
      if(pointer.active){
        const near = dots.filter(d => Math.abs(d.x - pointer.x) < 180 && Math.abs(d.y - pointer.y) < 180);
        g.lineWidth = 1;
        for(let i = 0; i < near.length; i++){
          for(let j = i + 1; j < near.length; j++){
            const a = near[i], b = near[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
            if(d < 110){
              g.strokeStyle = `rgba(255,140,90,${(0.22 * (1 - d / 110)).toFixed(3)})`;
              g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            }
          }
        }
      }
      requestAnimationFrame(tick);
    }
    size();
    window.addEventListener("resize", size);
    requestAnimationFrame(tick);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSoundButton();
    initField();
    // wait a frame so the hero has its final size before sampling the photo
    requestAnimationFrame(() => requestAnimationFrame(initHero));
  });
})();
