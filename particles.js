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
     ============================================================ */
  function sampleImage(img, w, h, maxCount){
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const g = off.getContext("2d", { willReadFrequently: true });
    // cover-fit the photo into the stage
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const data = g.getImageData(0, 0, w, h).data;

    let step = Math.max(3, Math.round(Math.sqrt((w * h) / maxCount)));
    const pts = [];
    for(let y = step / 2; y < h; y += step){
      for(let x = step / 2; x < w; x += step){
        const i = ((y | 0) * w + (x | 0)) * 4;
        const r = data[i], gg = data[i + 1], b = data[i + 2];
        const lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
        if(lum < 0.1) continue;            // the dark ground stays empty
        pts.push({ x, y, r, g: gg, b, lum });
      }
    }
    return { pts, step };
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
    let W = 0, H = 0, rect = null;
    let parts = [];
    let step = 6;
    let current = -1;
    const images = sources.map(s => { const im = new Image(); im.decoding = "async"; im.src = s.src; return im; });

    function size(){
      rect = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function maxCount(){
      const area = W * H;
      return Math.min(fine ? 7000 : 3200, Math.max(1500, area / 34));
    }

    function form(index){
      const img = images[index];
      if(!img.complete || !img.naturalWidth){
        img.addEventListener("load", () => form(index), { once: true });
        return;
      }
      current = index;
      if(caption) caption.textContent = sources[index].title || "";
      const sample = sampleImage(img, W, H, maxCount());
      step = sample.step;
      const pts = sample.pts;
      // shuffle so the hand-over between photos looks like a swarm, not a wipe
      for(let i = pts.length - 1; i > 0; i--){ const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
      const next = [];
      for(let i = 0; i < pts.length; i++){
        const t = pts[i];
        const p = parts[i] || {
          // newcomers fly in from anywhere on the stage
          x: Math.random() * W, y: Math.random() * H + (Math.random() - 0.5) * H,
          vx: 0, vy: 0, a: 0, size: step * 0.7,
          r: t.r, g: t.g, b: t.b,
        };
        p.hx = t.x; p.hy = t.y;
        p.tr = t.r; p.tg = t.g; p.tb = t.b;
        p.tsize = step * (0.45 + t.lum * 0.6);
        p.ta = 0.55 + t.lum * 0.45;
        p.leaving = false;
        next.push(p);
      }
      // particles the new photo doesn't need drift off and fade out
      for(let i = pts.length; i < parts.length; i++){
        const p = parts[i]; p.leaving = true;
        p.vx += (Math.random() - 0.5) * 6; p.vy += (Math.random() - 0.5) * 6;
        next.push(p);
      }
      parts = next;
    }

    let visible = true, raf = null, last = performance.now(), sinceSwap = 0;
    const HOLD = 6000;

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

      const mx = pointer.x - rect.left, my = pointer.y - rect.top;
      const R = Math.max(70, Math.min(W, H) * 0.16) * (1 + sound.level * 0.8);
      const R2 = R * R;
      const lvl = sound.level, bass = sound.bass;
      const cx = W / 2, cy = H / 2;
      // friction scaled to the frame time, so slow screens settle as fast as quick ones
      const damp = Math.pow(0.84, dt), ease = 1 - Math.pow(0.9, dt);

      g.clearRect(0, 0, W, H);
      const alive = [];
      for(const p of parts){
        // spring home
        let ax = (p.hx - p.x) * 0.055, ay = (p.hy - p.y) * 0.055;
        // the cursor pushes them away
        if(pointer.active){
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if(d2 < R2){
            const d = Math.sqrt(d2) || 1, f = (1 - d / R);
            ax += (dx / d) * f * f * 9; ay += (dy / d) * f * f * 9;
          }
        }
        // sound: everything breathes outward from the centre and shivers
        if(lvl > 0.02){
          const ox = p.hx - cx, oy = p.hy - cy, od = Math.hypot(ox, oy) || 1;
          ax += (ox / od) * bass * 2.4 + (Math.random() - 0.5) * lvl * 5;
          ay += (oy / od) * bass * 2.4 + (Math.random() - 0.5) * lvl * 5;
        }
        if(p.leaving){ ax = 0; ay = 0.02; p.ta = 0; }
        p.vx = (p.vx + ax * dt) * damp;
        p.vy = (p.vy + ay * dt) * damp;
        p.x += p.vx * dt; p.y += p.vy * dt;
        // ease colour, size and opacity toward the new photo
        p.r += (p.tr - p.r) * ease; p.g += (p.tg - p.g) * ease; p.b += (p.tb - p.b) * ease;
        p.size += (p.tsize * (1 + lvl * 0.9) - p.size) * ease;
        p.a += (p.ta - p.a) * ease * 0.7;
        if(p.leaving && p.a < 0.02) continue;
        alive.push(p);
        // fast movers glow warm, like sparks
        const speed = Math.min(1, Math.max(0, Math.hypot(p.vx, p.vy) - 0.6) / 6);
        const r = p.r + (255 - p.r) * speed, gg = p.g + (110 - p.g) * speed, b = p.b + (50 - p.b) * speed;
        g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${p.a.toFixed(3)})`;
        const s = p.size;
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      parts = alive;
      raf = requestAnimationFrame(tick);
    }

    function pointerOnStage(){
      return pointer.active && rect &&
        pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    }

    function start(){ if(!raf){ last = performance.now(); raf = requestAnimationFrame(tick); } }

    size();
    // the first photo assembles out of a scattered cloud, like it's being developed
    form(0);
    parts.forEach(p => { p.x = Math.random() * W; p.y = Math.random() * H; p.a = 0; });
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

    let rt = null;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { size(); form(Math.max(0, current)); }, 150);
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
