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
     HERO — a photo that turns to pixels only when it moves
     At rest the hero shows the real photo at full resolution. Each
     cell of a fine grid over it is also a particle: when the cursor
     pushes a cell, or the ripple of a photo change reaches it, that
     cell lifts out of the photo as a coloured pixel, moves, and drops
     back into the picture once it has settled. Loose pixels in the
     photo's own colours drift around its faded edges and corners.
     Every photo fades to nothing toward its edges, so there is never
     a hard frame.
     ============================================================ */
  function smooth(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  // the oval fade: full strength in the middle, exactly nothing a little inside every edge
  function vignette(nx, ny){ return smooth((0.96 - Math.sqrt(nx * nx * 0.96 + ny * ny)) / 0.7); }

  // the photo, cover-fitted to the stage and faded at its edges, at full resolution
  function buildLayer(img, w, h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high";
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const d = g.getImageData(0, 0, w, h);
    const px = d.data;
    for(let y = 0; y < h; y++){
      const ny = (y + 0.5) / h * 2 - 1;
      for(let x = 0; x < w; x++){
        const nx = (x + 0.5) / w * 2 - 1;
        const i = (y * w + x) * 4 + 3;
        px[i] = px[i] * vignette(nx, ny);
      }
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  // the same picture at grid resolution: one colour and opacity per particle
  function sampleLayer(layer, gw, gh){
    const c = document.createElement("canvas");
    c.width = gw; c.height = gh;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.imageSmoothingQuality = "high";
    g.drawImage(layer, 0, 0, gw, gh);
    const data = g.getImageData(0, 0, gw, gh).data;
    const n = gw * gh;
    const r = new Uint8Array(n), gg = new Uint8Array(n), b = new Uint8Array(n), al = new Float32Array(n);
    for(let i = 0; i < n; i++){
      const k = i * 4;
      r[i] = data[k]; gg[i] = data[k + 1]; b[i] = data[k + 2]; al[i] = data[k + 3] / 255;
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
    // grid-sized buffers: moving pixels, and which cells show the new or the old photo
    const mk = () => { const c = document.createElement("canvas"); return { c, g: c.getContext("2d") }; };
    const bMove = mk(), bNew = mk(), bOld = mk();
    // stage-sized scratch canvases for cutting a photo to the cells that are at rest
    const offA = mk(), offB = mk();
    let W = 0, H = 0, rect = null, step = 3, gw = 1, gh = 1;
    let pMove, pNew, pOld, uMove, uNew, uOld;
    let newLayer = null, oldLayer = null;
    let current = -1;
    const images = sources.map(s => { const im = new Image(); im.decoding = "async"; im.src = s.src; return im; });

    // particle state: particle i always belongs to grid cell i
    let N = 0;
    let X, Y, VX, VY, HX, HY, CR, CG, CB, A, TR, TG, TB, TA, WAIT, NEW;
    let NR, NG, NB, NA;   // the next photo, held until the ripple reaches each particle

    // loose pixels drifting around the faded edges and corners
    let floaters = [];

    function size(){
      rect = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      const target = fine ? 36000 : 15000;
      step = Math.max(2, Math.ceil(Math.sqrt((W * H) / target)));
      gw = Math.ceil(W / step); gh = Math.ceil(H / step);
      for(const b of [bMove, bNew, bOld]){ b.c.width = gw; b.c.height = gh; }
      for(const o of [offA, offB]){ o.c.width = W * DPR; o.c.height = H * DPR; o.g.setTransform(DPR, 0, 0, DPR, 0, 0); }
      pMove = bMove.g.createImageData(gw, gh); uMove = new Uint32Array(pMove.data.buffer);
      pNew = bNew.g.createImageData(gw, gh); uNew = new Uint32Array(pNew.data.buffer);
      pOld = bOld.g.createImageData(gw, gh); uOld = new Uint32Array(pOld.data.buffer);
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      g.setTransform(DPR, 0, 0, DPR, 0, 0);

      N = gw * gh;
      const f = () => new Float32Array(N);
      X = f(); Y = f(); VX = f(); VY = f(); HX = f(); HY = f();
      CR = f(); CG = f(); CB = f(); A = f(); TR = f(); TG = f(); TB = f(); TA = f(); WAIT = f();
      NR = f(); NG = f(); NB = f(); NA = f(); NEW = new Uint8Array(N);
      for(let i = 0; i < N; i++){
        HX[i] = (i % gw + 0.5) * step;
        HY[i] = (((i / gw) | 0) + 0.5) * step;
        // the first photo assembles out of a scattered cloud, like it is being developed
        X[i] = Math.random() * W; Y[i] = Math.random() * H;
        WAIT[i] = -1;
      }
      makeFloaters();
    }

    function makeFloaters(){
      const count = fine ? 240 : 110;
      floaters = Array.from({ length: count }, () => {
        // most sit in the fading band; some reach right out into the corners
        const corner = Math.random() < 0.4;
        const ang = corner ? (Math.PI / 4 + (Math.random() * 4 | 0) * Math.PI / 2 + (Math.random() - 0.5) * 0.6)
                           : Math.random() * Math.PI * 2;
        return {
          ang, r: corner ? 1.0 + Math.random() * 0.36 : 0.74 + Math.random() * 0.3,
          spin: (Math.random() - 0.5) * 0.0012,
          wob: Math.random() * Math.PI * 2, wobS: 0.0006 + Math.random() * 0.0014,
          tw: Math.random() * Math.PI * 2, twS: 0.001 + Math.random() * 0.003,
          size: step * (Math.random() < 0.25 ? 2 : 1),
          ox: 0, oy: 0, vx: 0, vy: 0,
        };
      });
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
      const layer = buildLayer(img, W, H);
      const s = sampleLayer(layer, gw, gh);
      if(instant || !newLayer){ oldLayer = null; }
      else { oldLayer = newLayer; }
      newLayer = layer;
      if(ox == null){ ox = W / 2; oy = H / 2; }
      // the ripple crosses the whole stage in about 0.9 seconds
      const reach = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) || 1;
      for(let i = 0; i < N; i++){
        NR[i] = s.r[i]; NG[i] = s.g[i]; NB[i] = s.b[i]; NA[i] = s.al[i];
        if(instant){
          TR[i] = CR[i] = NR[i]; TG[i] = CG[i] = NG[i]; TB[i] = CB[i] = NB[i]; TA[i] = NA[i]; A[i] = 0;
          WAIT[i] = -1; NEW[i] = 1;
        } else {
          const d = Math.hypot(HX[i] - ox, HY[i] - oy) / reach;
          WAIT[i] = d * 900 + Math.random() * 90;
          NEW[i] = 0;
        }
      }
      rippleX = ox; rippleY = oy; rippleReach = reach;
      morphing = !instant;
    }
    let rippleX = 0, rippleY = 0, rippleReach = 1, morphing = false;

    let visible = true, raf = null, last = performance.now(), sinceSwap = 0, clock = 0;
    const HOLD = 6500;

    // cut a photo down to the cells marked in a grid mask, then lay it on the stage
    function drawMasked(off, maskCanvas, layer){
      const o = off.g;
      o.globalCompositeOperation = "copy";
      o.imageSmoothingEnabled = false;
      o.drawImage(maskCanvas, 0, 0, gw * step, gh * step);
      o.globalCompositeOperation = "source-in";
      o.drawImage(layer, 0, 0, W, H);
      o.globalCompositeOperation = "source-over";
      g.drawImage(off.c, 0, 0, W, H);
    }

    function tick(now){
      raf = null;
      if(!visible) return;
      // the first photo is still loading
      if(!newLayer){ last = now; raf = requestAnimationFrame(tick); return; }
      const ms = Math.min(48, now - last); last = now; clock += ms;
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
      const SOLID = 0xff000000 | 0;

      uMove.fill(0); uNew.fill(0); uOld.fill(0);
      let moving = 0, restingNew = 0, restingOld = 0, waiting = 0;
      for(let i = 0; i < N; i++){
        // the ripple arrives: pop out away from where it started, then take the new colour
        if(WAIT[i] >= 0){
          waiting++;
          WAIT[i] -= ms;
          if(WAIT[i] < 0){
            TR[i] = NR[i]; TG[i] = NG[i]; TB[i] = NB[i]; TA[i] = NA[i]; NEW[i] = 1;
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

        // at rest: back in its own cell, still, and done changing colour
        const off = Math.abs(x - HX[i]) + Math.abs(y - HY[i]);
        const resting = off < 0.6 && vx * vx + vy * vy < 0.01 && Math.abs(a - TA[i]) < 0.03 &&
          Math.abs(CR[i] - TR[i]) + Math.abs(CG[i] - TG[i]) + Math.abs(CB[i] - TB[i]) < 6;
        if(resting){
          if(NEW[i]){ uNew[i] = SOLID; restingNew++; }
          else { uOld[i] = SOLID; restingOld++; }
          continue;
        }
        moving++;
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
        const j = gy * gw + gx, prev = uMove[j] >>> 24, al = (a * 255) | 0;
        if(al >= prev) uMove[j] = (al << 24) | ((b | 0) << 16) | ((gg | 0) << 8) | (r | 0);
      }
      if(morphing && !waiting && !restingOld){ morphing = false; oldLayer = null; }

      g.clearRect(0, 0, W, H);
      if(!moving && !restingOld){
        // everything at rest: the real photo, untouched
        g.drawImage(newLayer, 0, 0, W, H);
      } else {
        if(restingOld && oldLayer){ bOld.g.putImageData(pOld, 0, 0); drawMasked(offA, bOld.c, oldLayer); }
        if(restingNew){ bNew.g.putImageData(pNew, 0, 0); drawMasked(offB, bNew.c, newLayer); }
        bMove.g.putImageData(pMove, 0, 0);
        g.imageSmoothingEnabled = false;
        g.drawImage(bMove.c, 0, 0, gw * step, gh * step);
      }
      drawFloaters(dt, push, mx, my);
      raf = requestAnimationFrame(tick);
    }

    function drawFloaters(dt, push, mx, my){
      const hx = W / 2, hy = H / 2, sq = Math.sqrt(0.96);
      for(const f of floaters){
        f.ang += f.spin * dt;
        f.wob += f.wobS * dt * 16;
        f.tw += f.twS * dt * 16;
        const r = f.r + Math.sin(f.wob) * 0.035;
        let x = hx + Math.cos(f.ang) * r * hx / sq, y = hy + Math.sin(f.ang) * r * hy;
        // the cursor nudges them aside too, and they drift back
        if(push){
          const dx = x + f.ox - mx, dy = y + f.oy - my, d2 = dx * dx + dy * dy;
          if(d2 < 90 * 90){ const d = Math.sqrt(d2) || 1, k = (1 - d / 90) * 2.2; f.vx += dx / d * k; f.vy += dy / d * k; }
        }
        f.vx = (f.vx - f.ox * 0.04) * 0.9; f.vy = (f.vy - f.oy * 0.04) * 0.9;
        f.ox += f.vx * dt; f.oy += f.vy * dt;
        x += f.ox; y += f.oy;
        if(x < 0 || y < 0 || x >= W || y >= H) continue;
        // coloured from the photo underneath, a little brighter
        const ci = Math.min(N - 1, ((y / step) | 0) * gw + ((x / step) | 0));
        const lift = 40 + sound.level * 120;
        const r0 = Math.min(255, TR[ci] + lift) | 0, g0 = Math.min(255, TG[ci] + lift) | 0, b0 = Math.min(255, TB[ci] + lift) | 0;
        const a = (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f.tw))) * (1 + sound.level);
        g.fillStyle = `rgba(${r0},${g0},${b0},${Math.min(1, a).toFixed(3)})`;
        const s = f.size * (1 + sound.bass * 0.8);
        g.fillRect(Math.round(x / step) * step, Math.round(y / step) * step, s, s);
      }
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
        size(); newLayer = null; form(Math.max(0, current), null, null, true);
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
