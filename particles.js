/* ============================================================
   PARTICLES — the moving layer of the site.
   - The hero shows your photos; where the cursor (or a finger)
     touches, the picture breaks into pixels that drift back, and
     every few seconds a ripple carries it to the next photo.
   - A light field of drifting points sits behind the whole page
     and also gets out of the cursor's way.
   Everything holds still for visitors with "reduce motion" on.
   You should not need to edit this file.
   ============================================================ */

(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- shared pointer state ---------- */
  const pointer = { x: -9999, y: -9999, active: false };
  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.active = false; });
  window.addEventListener("touchend", () => { pointer.active = false; }, { passive: true });

  /* ============================================================
     PIXEL STAGES — a picture that turns to pixels only when it moves
     Used by the hero (your photos, one after another).
     At rest the stage shows the real picture at full resolution.
     Each cell of a fine grid over it is also a particle: when the
     cursor pushes a cell, or the ripple of a change reaches it, that
     cell lifts out of the picture as a coloured pixel, moves, and
     drops back once it has settled.
     The hero adds loose pixels drifting around its faded edges and
     corners.
     ============================================================ */
  function smooth(t){ t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  // the oval fade: full strength in the middle, exactly nothing a little inside every edge
  function vignette(nx, ny){ return smooth((0.96 - Math.sqrt(nx * nx * 0.96 + ny * ny)) / 0.7); }

  // the oval fade as an alpha mask the size of the stage
  function vignetteMask(w, h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    const d = g.createImageData(w, h);
    const px = d.data;
    for(let y = 0; y < h; y++){
      const ny = (y + 0.5) / h * 2 - 1;
      for(let x = 0; x < w; x++){
        const i = (y * w + x) * 4;
        px[i] = px[i + 1] = px[i + 2] = 255;
        px[i + 3] = 255 * vignette((x + 0.5) / w * 2 - 1, ny);
      }
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  // a picture or a video frame fitted to the stage (cover or contain), faded at
  // its edges for the hero; a cut-out keeps its own transparency
  function paintLayer(c, media, fit, mask){
    const w = c.width, h = c.height, g = c.getContext("2d");
    const mw = media.videoWidth || media.naturalWidth, mh = media.videoHeight || media.naturalHeight;
    const s = (fit === "contain" ? Math.min : Math.max)(w / mw, h / mh);
    const dw = mw * s, dh = mh * s;
    g.globalCompositeOperation = "copy";
    g.imageSmoothingQuality = "high";
    g.drawImage(media, (w - dw) / 2, fit === "contain" ? h - dh : (h - dh) / 2, dw, dh);
    if(mask){
      g.globalCompositeOperation = "destination-in";
      g.drawImage(mask, 0, 0);
    }
    g.globalCompositeOperation = "source-over";
    return c;
  }
  function buildLayer(media, w, h, fit, mask){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return paintLayer(c, media, fit, mask);
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

  function pixelStage(cfg){
    const { stage, canvas, sources, caption } = cfg;
    const fit = cfg.fit || "cover";
    const g = canvas.getContext("2d");
    // grid-sized buffers: moving pixels, and which cells show the new or the old picture
    const mk = () => { const c = document.createElement("canvas"); return { c, g: c.getContext("2d") }; };
    const bMove = mk(), bNew = mk(), bOld = mk();
    // stage-sized scratch canvases for cutting a picture to the cells that are at rest
    const offA = mk(), offB = mk();
    let W = 0, H = 0, rect = null, step = 3, gw = 1, gh = 1;
    let pMove, pNew, pOld, uMove, uNew, uOld;
    let newLayer = null, oldLayer = null;
    let current = -1;
    // a source is a photo ({ src }) or a silent looping video ({ video })
    const images = sources.map(s => {
      if(s.video){
        const v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
        v.src = s.video;
        return v;
      }
      const im = new Image(); im.decoding = "async"; im.src = s.src; return im;
    });
    const isVideo = (m) => m && m.tagName === "VIDEO";
    const isReady = (m) => isVideo(m) ? m.readyState >= 2 : (m.complete && m.naturalWidth);
    let mask = null, live = null;

    // particle state: particle i always belongs to grid cell i
    let N = 0;
    let X, Y, VX, VY, HX, HY, CR, CG, CB, A, TR, TG, TB, TA, WAIT, NEW;
    // REST: how far each cell has eased from pixel back into the photo (0 to 1);
    // ROLD: the old photo's share of a cell, fading out after the ripple passes
    let REST, ROLD;
    let NR, NG, NB, NA;   // the next picture, held until the ripple reaches each particle

    let floaters = [];    // hero: loose pixels drifting around the faded edges and corners
    let edges = [];       // portrait: the outline cells, with the way out of the figure
    let dust = [];        // portrait: specks breaking off the outline

    function size(){
      rect = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      const target = (fine ? 36000 : 15000) * (cfg.density || 1);
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
      mask = cfg.vignette ? vignetteMask(W, H) : null;

      N = gw * gh;
      const f = () => new Float32Array(N);
      X = f(); Y = f(); VX = f(); VY = f(); HX = f(); HY = f();
      CR = f(); CG = f(); CB = f(); A = f(); TR = f(); TG = f(); TB = f(); TA = f(); WAIT = f();
      NR = f(); NG = f(); NB = f(); NA = f(); NEW = new Uint8Array(N);
      REST = f(); ROLD = f();
      for(let i = 0; i < N; i++){
        HX[i] = (i % gw + 0.5) * step;
        HY[i] = (((i / gw) | 0) + 0.5) * step;
        // the first picture assembles out of a scattered cloud, like it is being developed
        X[i] = Math.random() * W; Y[i] = Math.random() * H;
        WAIT[i] = -1;
      }
      if(cfg.ring) makeFloaters();
      dust = [];
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

    // the outline of a cut-out: solid cells with an empty neighbour, and which way is out
    function findEdges(s){
      edges = [];
      const at = (x, y) => (x < 0 || y < 0 || x >= gw || y >= gh) ? 0 : s.al[y * gw + x];
      for(let y = 0; y < gh; y++){
        for(let x = 0; x < gw; x++){
          const a = at(x, y);
          if(a < 0.35) continue;
          if(at(x - 1, y) > 0.15 && at(x + 1, y) > 0.15 && at(x, y - 1) > 0.15 && at(x, y + 1) > 0.15) continue;
          let nx = at(x - 1, y) - at(x + 1, y), ny = at(x, y - 1) - at(x, y + 1);
          const l = Math.hypot(nx, ny) || 1;
          edges.push({ i: y * gw + x, x: (x + 0.5) * step, y: (y + 0.5) * step, nx: nx / l, ny: ny / l });
        }
      }
    }

    // ox, oy: where the ripple starts (the click, or the middle)
    function form(index, ox, oy, instant){
      const img = images[index];
      if(!isReady(img)){
        img.addEventListener(isVideo(img) ? "loadeddata" : "load", () => form(index, ox, oy, instant), { once: true });
        if(isVideo(img)) img.load();
        return;
      }
      // the video that was playing rests; the new one starts from the top
      const prev = images[current];
      if(isVideo(prev) && prev !== img) setTimeout(() => prev.pause(), 1200);
      current = index;
      if(caption) caption.textContent = sources[index].title || "";
      if(isVideo(img)){ try{ img.currentTime = 0; }catch(e){} img.play().catch(() => {}); }
      const layer = buildLayer(img, W, H, fit, mask);
      live = isVideo(img) ? img : null;
      const s = sampleLayer(layer, gw, gh);
      if(cfg.dust) findEdges(s);
      oldLayer = (instant || !newLayer) ? null : newLayer;
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

    let visible = true, raf = null, last = performance.now(), sinceSwap = 0;
    const HOLD = 6500, HOLD_VIDEO = 9000;

    // cut a picture down to the cells marked in a grid mask, then lay it on the stage
    function drawMasked(off, maskCanvas, layer){
      const o = off.g;
      o.globalCompositeOperation = "copy";
      o.imageSmoothingEnabled = true;
      o.drawImage(maskCanvas, 0, 0, gw * step, gh * step);
      o.globalCompositeOperation = "source-in";
      o.drawImage(layer, 0, 0, W, H);
      o.globalCompositeOperation = "source-over";
      g.drawImage(off.c, 0, 0, W, H);
    }

    function tick(now){
      raf = null;
      if(!visible) return;
      // the first picture is still loading
      if(!newLayer){ last = now; raf = requestAnimationFrame(tick); return; }
      const ms = Math.min(48, now - last); last = now;
      const dt = ms / 16.67;
      sinceSwap += ms;
      // a playing video keeps its layer current
      if(live && !live.paused && live.readyState >= 2) paintLayer(newLayer, live, fit, mask);
      const hold = live ? HOLD_VIDEO : HOLD;
      if(cfg.cycle && sinceSwap > hold && images.length > 1 && !pointerOnStage()){
        sinceSwap = 0;
        form((current + 1) % images.length);
      }

      const mx = pointer.x - rect.left, my = pointer.y - rect.top, push = pointer.active;
      const R = Math.max(70, Math.min(W, H) * 0.15);
      const R2 = R * R;
      // friction scaled to the frame time, so slow screens settle as fast as quick ones
      const damp = Math.pow(0.84, dt), ease = 1 - Math.pow(0.86, dt), fade = 1 - Math.pow(0.9, dt);
      // a settling pixel melts into the photo over about half a second; a cell that
      // starts moving lets go of the photo quickly
      const kIn = 1 - Math.pow(0.9, dt), kOut = 1 - Math.pow(0.62, dt), kOld = 1 - Math.pow(0.8, dt);

      uMove.fill(0); uNew.fill(0); uOld.fill(0);
      let moving = 0, showingNew = 0, showingOld = 0, waiting = 0;
      for(let i = 0; i < N; i++){
        // the ripple arrives: pop out away from where it started, then take the new colour
        if(WAIT[i] >= 0){
          waiting++;
          WAIT[i] -= ms;
          if(WAIT[i] < 0){
            TR[i] = NR[i]; TG[i] = NG[i]; TB[i] = NB[i]; TA[i] = NA[i];
            // the old photo's share of this cell fades out rather than vanishing
            if(!NEW[i]){ ROLD[i] = REST[i]; REST[i] = 0; }
            NEW[i] = 1;
            const dx = HX[i] - rippleX, dy = HY[i] - rippleY, d = Math.sqrt(dx * dx + dy * dy) || 1;
            const kick = 2 + 3.5 * (1 - Math.min(1, d / rippleReach));
            VX[i] += (dx / d) * kick + (Math.random() - 0.5) * 2.5;
            VY[i] += (dy / d) * kick + (Math.random() - 0.5) * 2.5 - 1.2;
          }
        }
        if(ROLD[i] > 0){
          ROLD[i] -= ROLD[i] * kOld;
          if(ROLD[i] < 0.01) ROLD[i] = 0;
          else { uOld[i] = ((ROLD[i] * 255) | 0) << 24; showingOld++; }
        }
        // empty cells of a cut-out have nothing to show; skip their physics
        if(TA[i] < 0.01 && A[i] < 0.01 && WAIT[i] < 0){ continue; }
        let ax = (HX[i] - X[i]) * 0.055, ay = (HY[i] - Y[i]) * 0.055;
        if(push){
          const dx = X[i] - mx, dy = Y[i] - my, d2 = dx * dx + dy * dy;
          if(d2 < R2){
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            ax += (dx / d) * f * f * 9; ay += (dy / d) * f * f * 9;
          }
        }
        const vx = (VX[i] + ax * dt) * damp, vy = (VY[i] + ay * dt) * damp;
        VX[i] = vx; VY[i] = vy;
        const x = X[i] += vx * dt, y = Y[i] += vy * dt;
        CR[i] += (TR[i] - CR[i]) * ease; CG[i] += (TG[i] - CG[i]) * ease; CB[i] += (TB[i] - CB[i]) * ease;
        const a = A[i] += (TA[i] - A[i]) * fade;

        // settled: back near its own cell, nearly still, and nearly done changing colour
        const off = Math.abs(x - HX[i]) + Math.abs(y - HY[i]);
        const settled = off < 1.2 && vx * vx + vy * vy < 0.04 && Math.abs(a - TA[i]) < 0.06 &&
          Math.abs(CR[i] - TR[i]) + Math.abs(CG[i] - TG[i]) + Math.abs(CB[i] - TB[i]) < 14;
        let rest = REST[i];
        rest += settled ? (1 - rest) * kIn : -rest * kOut;
        if(rest > 0.995) rest = 1; else if(rest < 0.005) rest = 0;
        REST[i] = rest;

        // the photo's share of the cell
        if(rest > 0){
          const m = ((rest * 255) | 0) << 24;
          if(NEW[i]){ uNew[i] = m; showingNew++; } else { uOld[i] = m; showingOld++; }
        }
        if(rest === 1) continue;
        moving++;
        // the pixel's share, fading as the photo takes over
        const pa = a * (1 - rest);
        if(pa < 0.01) continue;
        const gx = (x / step) | 0, gy = (y / step) | 0;
        if(gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
        // fast movers glow warm, like sparks
        const sp = vx * vx + vy * vy;
        let r = CR[i], gg = CG[i], b = CB[i];
        if(sp > 0.4){
          const t = Math.min(1, (Math.sqrt(sp) - 0.6) / 6);
          r += (255 - r) * t; gg += (110 - gg) * t; b += (50 - b) * t;
        }
        const j = gy * gw + gx, prev = uMove[j] >>> 24, al = (pa * 255) | 0;
        if(al >= prev) uMove[j] = (al << 24) | ((b | 0) << 16) | ((gg | 0) << 8) | (r | 0);
      }
      if(morphing && !waiting && !showingOld){ morphing = false; oldLayer = null; }

      g.clearRect(0, 0, W, H);
      if(!moving && !showingOld){
        // everything at rest: the real picture, untouched
        g.drawImage(newLayer, 0, 0, W, H);
      } else {
        if(showingOld && oldLayer){ bOld.g.putImageData(pOld, 0, 0); drawMasked(offA, bOld.c, oldLayer); }
        if(showingNew){ bNew.g.putImageData(pNew, 0, 0); drawMasked(offB, bNew.c, newLayer); }
        bMove.g.putImageData(pMove, 0, 0);
        g.imageSmoothingEnabled = false;
        g.drawImage(bMove.c, 0, 0, gw * step, gh * step);
      }
      if(cfg.ring) drawFloaters(dt, push, mx, my);
      if(cfg.dust) drawDust(ms, dt, push, mx, my);
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
        // coloured from the picture underneath, a little brighter
        const ci = Math.min(N - 1, ((y / step) | 0) * gw + ((x / step) | 0));
        const lift = 40;
        const r0 = Math.min(255, TR[ci] + lift) | 0, g0 = Math.min(255, TG[ci] + lift) | 0, b0 = Math.min(255, TB[ci] + lift) | 0;
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(f.tw));
        g.fillStyle = `rgba(${r0},${g0},${b0},${Math.min(1, a).toFixed(3)})`;
        const s = f.size;
        g.fillRect(Math.round(x / step) * step, Math.round(y / step) * step, s, s);
      }
    }

    // specks breaking off the outline and drifting away on a slow, turning wind
    let dustClock = 0;
    function drawDust(ms, dt, push, mx, my){
      if(!edges.length) return;
      dustClock += ms;
      const cap = fine ? 1100 : 450;
      // a steady shedding all round, much stronger near the cursor
      let spawn = (fine ? 2.2 : 1.1) * dt;
      while(spawn > 0 && dust.length < cap){
        if(spawn < 1 && Math.random() > spawn) break;
        spawn -= 1;
        emit(edges[(Math.random() * edges.length) | 0], 1);
      }
      if(push){
        let near = 0;
        for(let k = 0; k < 40 && near < 6 * dt; k++){
          const e = edges[(Math.random() * edges.length) | 0];
          const dx = e.x - mx, dy = e.y - my;
          if(dx * dx + dy * dy < 140 * 140){ emit(e, 2.2); near++; }
        }
      }
      const wind = Math.sin(dustClock * 0.00035) * 0.25;
      const alive = [];
      for(const p of dust){
        p.life -= ms;
        if(p.life <= 0) continue;
        // a curling drift, up and out, like ash leaving a fire
        p.vx += (Math.sin(p.y * 0.018 + dustClock * 0.0012 + p.seed) * 0.03 + wind * 0.02) * dt;
        p.vy += (-0.012 + Math.cos(p.x * 0.015 + dustClock * 0.001 + p.seed) * 0.02) * dt;
        if(push){
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if(d2 < 100 * 100){ const d = Math.sqrt(d2) || 1, k = (1 - d / 100) * 0.6; p.vx += dx / d * k; p.vy += dy / d * k; }
        }
        p.vx *= Math.pow(0.985, dt); p.vy *= Math.pow(0.985, dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
        const t = p.life / p.max;
        const a = Math.min(1, t * 1.6) * p.a;
        g.fillStyle = `rgba(${p.r},${p.g},${p.b},${a.toFixed(3)})`;
        g.fillRect(Math.round(p.x / step) * step, Math.round(p.y / step) * step, p.size, p.size);
        alive.push(p);
      }
      dust = alive;
    }
    function emit(e, force){
      const i = e.i;
      const lift = 30;
      dust.push({
        x: e.x, y: e.y,
        vx: (e.nx * (0.4 + Math.random() * 0.9) + (Math.random() - 0.5) * 0.4) * force,
        vy: (e.ny * (0.4 + Math.random() * 0.9) + (Math.random() - 0.5) * 0.4 - 0.25) * force,
        life: 900 + Math.random() * 2200, max: 0, seed: Math.random() * 10,
        r: Math.min(255, TR[i] + lift) | 0, g: Math.min(255, TG[i] + lift) | 0, b: Math.min(255, TB[i] + lift) | 0,
        a: 0.5 + Math.random() * 0.5,
        size: step * (Math.random() < 0.2 ? 2 : 1),
      });
      dust[dust.length - 1].max = dust[dust.length - 1].life;
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

    // clicking sends the next picture (or, with one, the same one again) out from where you clicked
    const next = () => (current + 1) % images.length;
    stage.addEventListener("click", (e) => {
      sinceSwap = 0;
      const r = stage.getBoundingClientRect();
      const fromPointer = e.detail > 0;   // a keyboard "click" has no position
      form(next(), fromPointer ? e.clientX - r.left : null, fromPointer ? e.clientY - r.top : null);
    });
    stage.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); sinceSwap = 0; form(next()); }
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

  /* a still picture for visitors who asked for less motion */
  function stillInstead(stage, canvas, src, alt, cls){
    const img = new Image();
    img.src = src; img.alt = alt || ""; img.className = cls;
    stage.appendChild(img);
    canvas.remove();
  }

  function initHero(){
    const stage = document.getElementById("hero-stage");
    const canvas = document.getElementById("hero-particles");
    if(!stage || !canvas) return;
    const sources = (window.TK_HERO_PHOTOS || []).filter(p => p && (p.src || p.video));
    const caption = document.getElementById("hero-caption-title");
    if(!sources.length) return;
    if(reduced){
      const first = sources.find(s => s.src) || sources[0];
      stillInstead(stage, canvas, first.src || "", first.title, "hero-still");
      if(caption) caption.textContent = first.title || "";
      return;
    }
    pixelStage({ stage, canvas, sources, caption, fit: "cover", vignette: true, ring: true, cycle: true });
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
      // scrolling stirs the field a little
      const y = window.scrollY; drift += (y - lastY) * 0.02; lastY = y; drift *= 0.9;
      g.clearRect(0, 0, W, H);
      const R = 140, R2 = R * R;
      for(const d of dots){
        let ax = 0, ay = 0;
        if(pointer.active){
          const dx = d.x - pointer.x, dy = d.y - pointer.y, d2 = dx * dx + dy * dy;
          if(d2 < R2){ const dd = Math.sqrt(d2) || 1, f = 1 - dd / R; ax += (dx / dd) * f * 0.9; ay += (dy / dd) * f * 0.9; }
        }
        d.vx = (d.vx + ax) * 0.96 + (Math.random() - 0.5) * 0.02;
        d.vy = (d.vy + ay) * 0.96 + (Math.random() - 0.5) * 0.02 - drift * 0.02;
        d.x += d.vx; d.y += d.vy;
        if(d.x < -10) d.x = W + 10; else if(d.x > W + 10) d.x = -10;
        if(d.y < -10) d.y = H + 10; else if(d.y > H + 10) d.y = -10;
        g.fillStyle = `rgba(${d.c},${d.a.toFixed(3)})`;
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, Math.PI * 2); g.fill();
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
    initField();
    // wait a frame so the hero has its final size before sampling the photo
    requestAnimationFrame(() => requestAnimationFrame(() => { initHero(); }));
  });
})();
