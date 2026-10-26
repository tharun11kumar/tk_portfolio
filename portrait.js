/* ============================================================
   PORTRAIT — the About photo, printed as a warm halftone.
   - The photo is laid down as dots, like a page from a magazine:
     the brighter the spot, the bigger the dot.
   - A lens follows the pointer. Through it you see the real photo,
     a little magnified, inside a focus ring. Dots just outside the
     glass swell and bend away, the way a loupe warps a printed page.
   - With no pointer over it, the lens drifts slowly around the face.
   - A click (or a tap) pulls focus: the lens opens wide, then settles.
   - The dots print themselves in when the section scrolls into view.
   - With sound on, the lens swells with the music.
   Visitors who asked for less motion get the plain photo.
   The photo comes from CONTENT.about.portrait.
   You should not need to edit this file.
   ============================================================ */
(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const BG = "#0c0b0d";
  // where the lens rests when nobody is pointing: his face, as a share of the frame
  const FACE = { x: 0.62, y: 0.26 };

  function init(){
    const stage = document.getElementById("portrait-stage");
    const canvas = document.getElementById("portrait-particles");
    const src = window.TK_PORTRAIT;
    if(!stage || !canvas || !src) return;
    if(reduced){
      const img = new Image();
      img.src = src; img.alt = ""; img.className = "portrait-still";
      canvas.replaceWith(img);
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => start(stage, canvas, img);
    img.src = src;
  }

  function start(stage, canvas, img){
    const g = canvas.getContext("2d");
    let W, H, CELL, cols, rows, LUM, photo, print, R;

    // lens position (eased), its target, and its radius scale for the focus pull
    let lx, ly, tx, ty, open = 1, openV = 0, over = false, spin = 0;
    // the print-in: 0 before, 1 once every dot is down
    let reveal = 0, revealing = false, visible = false, raf = 0;

    function size(){
      const r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      CELL = W < 420 ? 6 : 7;
      R = Math.max(62, Math.min(W, H) * 0.2);

      // the photo, fitted to cover the frame, kept at full resolution for the lens
      photo = document.createElement("canvas");
      photo.width = W * DPR; photo.height = H * DPR;
      const pg = photo.getContext("2d");
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * DPR;
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      pg.imageSmoothingQuality = "high";
      pg.drawImage(img, (photo.width - dw) / 2, (photo.height - dh) / 2, dw, dh);

      // one brightness value per dot, read from a small copy of the photo
      cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
      const small = document.createElement("canvas");
      small.width = cols; small.height = rows;
      const sg = small.getContext("2d", { willReadFrequently: true });
      sg.drawImage(photo, 0, 0, cols * CELL * DPR, rows * CELL * DPR, 0, 0, cols, rows);
      const d = sg.getImageData(0, 0, cols, rows).data;
      LUM = new Float32Array(cols * rows);
      for(let i = 0; i < LUM.length; i++){
        LUM[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      }
      // stretch the contrast so the darkest third prints as bare paper and the
      // brightest few percent as full dots; the shadows fall away to black
      const sorted = Float32Array.from(LUM).sort();
      const lo = sorted[(sorted.length * 0.3) | 0], hi = sorted[(sorted.length * 0.985) | 0];
      for(let i = 0; i < LUM.length; i++){
        const t = Math.max(0, Math.min(1, (LUM[i] - lo) / (hi - lo || 1)));
        LUM[i] = Math.pow(t, 1.4);
      }

      print = document.createElement("canvas");
      print.width = W * DPR; print.height = H * DPR;
      if(reveal >= 1) paintPrint(1);

      if(lx === undefined){ lx = tx = W * FACE.x; ly = ty = H * FACE.y; }
      else { lx = Math.min(W, lx); ly = Math.min(H, ly); }
    }

    // the dot for cell (c, r): its centre (every other row shifted half a cell,
    // like a printing screen), its size from brightness, its colour from ember
    // in the shadows to warm paper in the highlights
    const DEEP = [178, 52, 26], EMBER = [255, 106, 44], PAPER = [246, 238, 226];
    function dotColour(l){
      let a, b, t;
      if(l < 0.4){ a = DEEP; b = EMBER; t = l / 0.4; }
      else { a = EMBER; b = PAPER; t = (l - 0.4) / 0.6; }
      return `rgb(${(a[0] + (b[0] - a[0]) * t) | 0},${(a[1] + (b[1] - a[1]) * t) | 0},${(a[2] + (b[2] - a[2]) * t) | 0})`;
    }
    const PALETTE = Array.from({ length: 33 }, (_, i) => dotColour(i / 32));

    function dotAt(c, r){
      const x = c * CELL + (r & 1 ? CELL / 2 : 0), y = r * CELL;
      const l = LUM[r * cols + c];
      return { x, y, l, rad: CELL * 0.6 * Math.sqrt(l) };
    }

    // the whole page of dots; p is how far the print-in has run (0 to 1),
    // sweeping in on a diagonal from the top left
    function paintPrint(p){
      const pg = print.getContext("2d");
      pg.setTransform(DPR, 0, 0, DPR, 0, 0);
      pg.fillStyle = BG; pg.fillRect(0, 0, W, H);
      const span = cols + rows;
      for(let r = 0; r < rows; r++){
        for(let c = 0; c < cols; c++){
          const { x, y, l, rad } = dotAt(c, r);
          if(l < 0.04) continue;
          let k = 1;
          if(p < 1){
            const at = ((c + r) / span) * 0.75;
            k = Math.max(0, Math.min(1, (p - at) / 0.25));
            k = 1 - Math.pow(1 - k, 3);
            if(k <= 0) continue;
          }
          pg.fillStyle = PALETTE[Math.round(l * 32)];
          pg.beginPath(); pg.arc(x, y, rad * k, 0, 6.2832); pg.fill();
        }
      }
    }

    function frame(now){
      raf = 0;
      if(!visible || document.hidden) return;

      // the print-in
      if(revealing){
        reveal = Math.min(1, reveal + 1 / 70);
        paintPrint(reveal);
        if(reveal >= 1) revealing = false;
      }

      // with no pointer, the lens wanders slowly around the face
      if(!over){
        const t = now / 1000;
        tx = W * FACE.x + Math.sin(t * 0.5) * W * 0.07;
        ty = H * FACE.y + Math.sin(t * 0.37 + 1) * H * 0.05;
      }
      const k = over ? 0.16 : 0.04;
      const vx = (tx - lx) * k, vy = (ty - ly) * k;
      lx += vx; ly += vy;
      // the focus ring turns as the lens travels
      spin += (vx + vy) * 0.012;
      // the focus pull: a springy radius
      openV += (1 - open) * 0.09; openV *= 0.8; open += openV;

      // the lens breathes with the bass, and keeps redrawing while there's sound
      const snd = window.TKSound || { level: 0, bass: 0 };
      const lr = R * open * Math.min(1, reveal * 1.4) * (1 + snd.bass * 0.22 + snd.level * 0.08);
      g.drawImage(print, 0, 0, W, H);
      if(lr > 2) drawLens(lr);
      raf = requestAnimationFrame(frame);
    }

    function drawLens(lr){
      // dots in a band around the glass swell and bend outward, like print under a loupe
      const band = lr * 0.7, outer = lr + band;
      g.save();
      g.beginPath(); g.arc(lx, ly, outer, 0, 6.2832); g.clip();
      g.fillStyle = BG; g.fillRect(lx - outer, ly - outer, outer * 2, outer * 2);
      const c0 = Math.max(0, Math.floor((lx - outer - CELL) / CELL)), c1 = Math.min(cols - 1, Math.ceil((lx + outer) / CELL));
      const r0 = Math.max(0, Math.floor((ly - outer) / CELL)), r1 = Math.min(rows - 1, Math.ceil((ly + outer) / CELL));
      for(let r = r0; r <= r1; r++){
        for(let c = c0; c <= c1; c++){
          const { x, y, l, rad } = dotAt(c, r);
          if(l < 0.04) continue;
          const dx = x - lx, dy = y - ly, d = Math.sqrt(dx * dx + dy * dy) || 1;
          if(d > outer + CELL) continue;
          // 1 at the rim of the glass, 0 at the edge of the band
          const f = Math.max(0, 1 - Math.abs(d - lr) / band);
          const push = f * f * CELL * 1.6;
          g.fillStyle = PALETTE[Math.round(l * 32)];
          g.beginPath();
          g.arc(x + dx / d * push, y + dy / d * push, rad * (1 + f * 0.7), 0, 6.2832);
          g.fill();
        }
      }
      g.restore();

      // the glass: the real photo, magnified a little about the lens centre
      const mag = 1.22;
      g.save();
      g.beginPath(); g.arc(lx, ly, lr, 0, 6.2832); g.clip();
      g.translate(lx, ly); g.scale(mag, mag); g.translate(-lx, -ly);
      g.drawImage(photo, 0, 0, W, H);
      g.restore();

      // a soft darkening at the inside edge of the glass
      const shade = g.createRadialGradient(lx, ly, lr * 0.72, lx, ly, lr);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.42)");
      g.fillStyle = shade;
      g.beginPath(); g.arc(lx, ly, lr, 0, 6.2832); g.fill();

      // the ring: a warm rim, and tick marks round a focus ring that turns as it moves
      g.lineWidth = 1.5;
      g.strokeStyle = "rgba(246,238,226,0.9)";
      g.beginPath(); g.arc(lx, ly, lr, 0, 6.2832); g.stroke();
      g.lineWidth = 1;
      g.strokeStyle = "rgba(255,120,60,0.85)";
      for(let i = 0; i < 48; i++){
        const a = spin + i * Math.PI / 24, long = i % 4 === 0;
        const r1 = lr + 4, r2 = lr + (long ? 11 : 7);
        g.beginPath();
        g.moveTo(lx + Math.cos(a) * r1, ly + Math.sin(a) * r1);
        g.lineTo(lx + Math.cos(a) * r2, ly + Math.sin(a) * r2);
        g.stroke();
      }
      // the centre mark
      g.strokeStyle = "rgba(246,238,226,0.7)";
      g.beginPath();
      g.moveTo(lx - 7, ly); g.lineTo(lx - 3, ly); g.moveTo(lx + 3, ly); g.lineTo(lx + 7, ly);
      g.moveTo(lx, ly - 7); g.lineTo(lx, ly - 3); g.moveTo(lx, ly + 3); g.lineTo(lx, ly + 7);
      g.stroke();
    }

    const kick = () => { if(!raf && visible) raf = requestAnimationFrame(frame); };

    function pointAt(e){
      const r = stage.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
    }
    stage.addEventListener("pointermove", (e) => { over = true; pointAt(e); });
    stage.addEventListener("pointerleave", () => { over = false; });
    stage.addEventListener("pointerdown", (e) => {
      pointAt(e);
      // a tap on a touch screen sends the lens there, then lets it wander back
      if(e.pointerType !== "mouse"){ over = true; clearTimeout(stage._tkWander); stage._tkWander = setTimeout(() => { over = false; }, 2600); }
      openV += 0.32;
    });
    stage.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openV += 0.32; }
    });

    size();
    let resizeT;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { size(); if(reveal >= 1) paintPrint(1); kick(); }, 120);
    });
    document.addEventListener("visibilitychange", kick);

    // only run while the portrait is on screen; print it in the first time it shows
    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if(visible && reveal === 0) revealing = true;
      kick();
    }, { threshold: 0.15 }).observe(stage);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // script.js sets TK_PORTRAIT while it builds the page; wait a frame for it and for layout
    requestAnimationFrame(() => requestAnimationFrame(init));
  });
})();
