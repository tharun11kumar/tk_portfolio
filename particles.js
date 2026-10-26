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
     Every particle is one pixel of a fine grid over the photo, so
     at rest the picture reads clearly; the particles only show
     themselves when something pushes them. Positions live in
     typed arrays and are drawn into a small pixel buffer that is
     scaled up crisply, which keeps tens of thousands of them fast.
     ============================================================ */
  function sampleImage(img, w, h, step){
    const gw = Math.ceil(w / step), gh = Math.ceil(h / step);
    const off = document.createElement("canvas");
    off.width = gw; off.height = gh;
    const g = off.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high";
    // cover-fit the photo into the grid
    const s = Math.max(gw / img.naturalWidth, gh / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.drawImage(img, (gw - dw) / 2, (gh - dh) / 2, dw, dh);
    const data = g.getImageData(0, 0, gw, gh).data;
    const hx = [], hy = [], r = [], gg = [], b = [], al = [];
    for(let y = 0; y < gh; y++){
      for(let x = 0; x < gw; x++){
        const i = (y * gw + x) * 4;
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        if(lum < 0.025) continue;          // true black stays empty, so the glow shows through
        hx.push((x + 0.5) * step); hy.push((y + 0.5) * step);
        r.push(data[i]); gg.push(data[i + 1]); b.push(data[i + 2]);
        al.push(Math.min(1, lum * 10));
      }
    }
    return { n: hx.length, hx, hy, r, g: gg, b, al };
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

    // particle state, one slot per particle
    let N = 0, keep = 0;
    let X, Y, VX, VY, HX, HY, CR, CG, CB, TR, TG, TB, A, TA, LEAVING;
    function alloc(n){
      const f = () => new Float32Array(n);
      const old = { X, Y, VX, VY, CR, CG, CB, A };
      X = f(); Y = f(); VX = f(); VY = f(); HX = f(); HY = f();
      CR = f(); CG = f(); CB = f(); TR = f(); TG = f(); TB = f(); A = f(); TA = f();
      LEAVING = new Uint8Array(n);
      return old;
    }

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
    }

    function form(index, scatter){
      const img = images[index];
      if(!img.complete || !img.naturalWidth){
        img.addEventListener("load", () => form(index, scatter), { once: true });
        return;
      }
      current = index;
      if(caption) caption.textContent = sources[index].title || "";
      const s = sampleImage(img, W, H, step);
      // shuffle the targets so the hand-over between photos is a swarm, not a wipe
      const order = new Uint32Array(s.n);
      for(let i = 0; i < s.n; i++) order[i] = i;
      for(let i = s.n - 1; i > 0; i--){ const j = (Math.random() * (i + 1)) | 0; const t = order[i]; order[i] = order[j]; order[j] = t; }

      const oldN = N;
      const total = Math.max(s.n, oldN);
      const old = alloc(total);
      for(let i = 0; i < total; i++){
        const had = i < oldN && old.X;
        if(had && !scatter){
          X[i] = old.X[i]; Y[i] = old.Y[i]; VX[i] = old.VX[i]; VY[i] = old.VY[i];
          CR[i] = old.CR[i]; CG[i] = old.CG[i]; CB[i] = old.CB[i]; A[i] = old.A[i];
        } else {
          // newcomers fly in from anywhere around the stage
          X[i] = Math.random() * W; Y[i] = Math.random() * H * 1.4 - H * 0.2;
          VX[i] = 0; VY[i] = 0; A[i] = 0;
        }
        if(i < s.n){
          const k = order[i];
          HX[i] = s.hx[k]; HY[i] = s.hy[k];
          TR[i] = s.r[k]; TG[i] = s.g[k]; TB[i] = s.b[k]; TA[i] = s.al[k];
          if(!had || scatter){ CR[i] = TR[i]; CG[i] = TG[i]; CB[i] = TB[i]; }
          LEAVING[i] = 0;
        } else {
          // particles the new photo does not need drift off and fade out
          LEAVING[i] = 1; TA[i] = 0;
          VX[i] += (Math.random() - 0.5) * 6; VY[i] += (Math.random() - 0.5) * 6;
        }
      }
      N = total; keep = s.n;
    }

    let visible = true, raf = null, last = performance.now(), sinceSwap = 0;
    const HOLD = 6500;

    function tick(now){
      raf = null;
      if(!visible) return;
      const dt = Math.min(48, now - last) / 16.67; last = now;
      readSound();
      sinceSwap += dt * 16.67;
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
      const damp = Math.pow(0.84, dt), ease = 1 - Math.pow(0.9, dt), fade = ease * 0.7;

      pix32.fill(0);
      let leavingAlive = 0;
      for(let i = 0; i < N; i++){
        let ax, ay;
        if(LEAVING[i]){
          ax = 0; ay = 0.02;
        } else {
          ax = (HX[i] - X[i]) * 0.055; ay = (HY[i] - Y[i]) * 0.055;
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
        }
        const vx = (VX[i] + ax * dt) * damp, vy = (VY[i] + ay * dt) * damp;
        VX[i] = vx; VY[i] = vy;
        const x = X[i] += vx * dt, y = Y[i] += vy * dt;
        CR[i] += (TR[i] - CR[i]) * ease; CG[i] += (TG[i] - CG[i]) * ease; CB[i] += (TB[i] - CB[i]) * ease;
        const a = A[i] += (TA[i] - A[i]) * fade;
        if(LEAVING[i]){ if(a < 0.02) continue; leavingAlive++; }

        const gx = (x / step) | 0, gy = (y / step) | 0;
        if(gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
        // fast movers glow warm, like sparks
        const sp = vx * vx + vy * vy;
        let r = CR[i], gg = CG[i], b = CB[i];
        if(sp > 0.4){
          const t = Math.min(1, (Math.sqrt(sp) - 0.6) / 6);
          r += (255 - r) * t; gg += (110 - gg) * t; b += (50 - b) * t;
        }
        pix32[gy * gw + gx] = ((a * 255) << 24) | ((b | 0) << 16) | ((gg | 0) << 8) | (r | 0);
      }
      if(!leavingAlive && N > keep) N = keep;

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
    // the first photo assembles out of a scattered cloud, like it is being developed
    form(0, true);
    start();

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if(visible) start();
    }).observe(stage);
    document.addEventListener("visibilitychange", () => { if(!document.hidden) start(); });

    // clicking the stage moves to the next photo
    stage.addEventListener("click", () => { sinceSwap = 0; form((current + 1) % images.length); });
    stage.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); sinceSwap = 0; form((current + 1) % images.length); }
    });

    let rt = null, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        // phones fire resize when the address bar slides; only rebuild on a real width change
        if(window.innerWidth === lastW && N){ rect = stage.getBoundingClientRect(); return; }
        lastW = window.innerWidth;
        size(); form(Math.max(0, current), true);
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
