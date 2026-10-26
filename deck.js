/* ============================================================
   DECK — the control desk at the foot of the page.
   A matte black console, like an editing surface:
   - Chunky keycaps are the links: the sections of the page, your
     Instagram and LinkedIn, "@" (copies your email) and HIRE ME
     (opens a new email to you). They press down when clicked.
   - A small LCD shows your status, and says what a key does while
     you point at it.
   - A round waveform scope traces your initials in green; point at
     a key and it shows that key's own wave.
   - It's a solid object in 3D: it lies tilted back like a desk and
     stands up as you scroll to it, leans toward the cursor, and a
     light sheen follows the pointer across its surface. Keys, the
     screen and the scope sit raised off the panel.
   The email and socials come from content.js.
   You should not need to edit this file.
   ============================================================ */
(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init(){
    const deck = document.getElementById("deck");
    // content.js declares CONTENT with const, so it isn't on window
    if(!deck || typeof CONTENT === "undefined") return;
    const C = CONTENT;
    const email = (C.contact && C.contact.email) || "";
    const social = (re) => ((C.contact && C.contact.socials) || []).find(s => re.test(s.label));
    const ig = social(/insta/i), li = social(/linked/i);
    const slate = (C.hero && C.hero.slate) || [];
    const status = slate.find(r => /status/i.test(r.label));
    const based = slate.find(r => /based|city|location/i.test(r.label));
    const idle = [status && status.value, based && based.value].filter(Boolean).join(" · ") || "On air";

    // [label, what it does, link (or "copy"), colour, wave, wide]
    const keys = [
      ["Home",    "Back to the top",            "#top",         "ink",    "sine",   true],
      ["Work",    "Films and edits",            "#work",        "paper",  "saw"],
      ["IG",      "Instagram",                  ig && ig.url,   "ig",     "square"],
      ["@",       "Copy " + email,              "copy",         "peach",  "pulse"],
      ["Hire me", "Write to " + email,          "mailto:" + email, "ember", "heart", true],
      ["IN",      "LinkedIn",                   li && li.url,   "violet", "tri"],
      ["Photos",  "The albums",                 "#photography", "ink",    "noise",  true],
      ["About",   "Who's behind the lens",      "#about",       "pink",   "lissa"],
      ["Roles",   "Where I've led",             "#roles",       "paper",  "steps"],
    ].filter(k => k[2]);

    deck.innerHTML = `
      <div class="deck-left">
        <div class="deck-lcd"><span class="deck-lcd-text"></span><i class="deck-led"></i></div>
        <div class="deck-keys"></div>
      </div>
      <div class="deck-grille" aria-hidden="true"></div>
      <div class="deck-scope" aria-hidden="true">
        <canvas></canvas>
        <span class="deck-screw s1"></span><span class="deck-screw s2"></span>
        <span class="deck-screw s3"></span><span class="deck-screw s4"></span>
      </div>
      <span class="deck-screw c1" aria-hidden="true"></span><span class="deck-screw c2" aria-hidden="true"></span>`;

    // the stage gives the deck its perspective and its shadow on the floor
    const stage = document.createElement("div");
    stage.className = "deck-stage";
    deck.parentNode.insertBefore(stage, deck);
    stage.appendChild(deck);
    stage.insertAdjacentHTML("beforeend", `<span class="deck-floor" aria-hidden="true"></span>`);
    const floor = stage.querySelector(".deck-floor");

    const lcd = deck.querySelector(".deck-lcd-text");
    const wrap = deck.querySelector(".deck-keys");
    lcd.textContent = idle;
    let wave = "tk", copiedT = 0;

    keys.forEach(([label, hint, href, colour, w, wide]) => {
      const external = /^https?:/.test(href);
      const el = document.createElement(href === "copy" ? "button" : "a");
      el.className = `key key-${colour}` + (wide ? " key-wide" : "");
      if(href === "copy") el.type = "button";
      else {
        el.href = href;
        if(external){ el.target = "_blank"; el.rel = "noopener"; }
      }
      el.setAttribute("aria-label", hint);
      el.innerHTML = `<span class="key-cap">${label}</span>`;
      const on = () => { wave = w; if(!copiedT) lcd.textContent = hint; start(); };
      const off = () => { wave = "tk"; if(!copiedT) lcd.textContent = idle; start(); };
      el.addEventListener("pointerenter", on);
      el.addEventListener("pointerleave", off);
      el.addEventListener("focus", on);
      el.addEventListener("blur", off);
      el.addEventListener("pointerdown", () => { kick = 1; });
      if(href === "copy"){
        el.addEventListener("click", async () => {
          try{ await navigator.clipboard.writeText(email); lcd.textContent = "Copied — " + email; }
          catch(e){ lcd.textContent = email; }
          clearTimeout(copiedT);
          copiedT = setTimeout(() => { copiedT = 0; lcd.textContent = idle; }, 2200);
        });
      }
      wrap.appendChild(el);
    });

    /* ---------- the scope ---------- */
    const canvas = deck.querySelector(".deck-scope canvas");
    const g = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let S = 0, kick = 0, visible = false, raf = 0;

    function size(){
      S = Math.round(canvas.getBoundingClientRect().width) || 200;
      canvas.width = canvas.height = S * DPR;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.fillStyle = "#06100a"; g.fillRect(0, 0, S, S);
    }

    // "TK" as strokes in a -1..1 box
    const TK = [
      [[-0.78, -0.5], [-0.12, -0.5]], [[-0.45, -0.5], [-0.45, 0.52]],
      [[0.12, -0.5], [0.12, 0.52]], [[0.74, -0.5], [0.14, 0.04]], [[0.3, -0.1], [0.78, 0.52]],
    ];

    // y (-1..1) of each wave at x (-1..1), time t in seconds
    function waveY(kind, x, t){
      const p = x * Math.PI * 2 + t * 3;
      switch(kind){
        case "sine": return Math.sin(p) * 0.55;
        case "saw": return (((x + t * 0.5) * 2 % 1 + 1) % 1) * 1.1 - 0.55;
        case "square": return Math.sin(p) >= 0 ? -0.5 : 0.5;
        case "tri": return (Math.asin(Math.sin(p)) / (Math.PI / 2)) * 0.55;
        case "pulse": return (((x + t * 0.4) * 3 % 1 + 1) % 1) < 0.12 ? -0.6 : 0.3;
        case "noise": return (Math.sin(x * 91 + t * 37) * Math.sin(x * 23 - t * 11)) * 0.6;
        case "steps": return (Math.round(Math.sin(p) * 3) / 3) * 0.55;
        case "heart": {
          // a heartbeat: flat, a blip, a spike
          const u = (((x + t * 0.35) % 1) + 1) % 1;
          if(u > 0.42 && u < 0.46) return -0.12;
          if(u > 0.48 && u < 0.5) return 0.2;
          if(u > 0.5 && u < 0.53) return -0.75;
          if(u > 0.53 && u < 0.56) return 0.35;
          return 0.05;
        }
      }
      return 0;
    }

    function beam(pathFn){
      g.save();
      g.strokeStyle = "rgba(120, 255, 150, 0.95)";
      g.lineWidth = 1.6;
      g.shadowColor = "rgba(80, 255, 120, 0.9)";
      g.shadowBlur = 8;
      g.lineJoin = g.lineCap = "round";
      g.beginPath();
      pathFn();
      g.stroke();
      g.restore();
    }

    function draw(now){
      raf = 0;
      if(!visible || document.hidden) return;
      const t = now / 1000, R = S / 2, k = R * 0.78;
      // phosphor: the last frames fade instead of vanishing
      g.fillStyle = reduced ? "#06100a" : "rgba(6, 16, 10, 0.22)";
      g.fillRect(0, 0, S, S);
      // a jolt when a key is pressed
      const j = kick * 0.25; kick *= 0.88;
      const jitter = () => (Math.random() - 0.5) * (0.012 + j * 0.2);

      if(wave === "tk"){
        beam(() => {
          for(const [[x1, y1], [x2, y2]] of TK){
            g.moveTo(R + (x1 + jitter()) * k, R + (y1 + jitter()) * k);
            g.lineTo(R + (x2 + jitter()) * k, R + (y2 + jitter()) * k);
          }
        });
      } else if(wave === "lissa"){
        beam(() => {
          for(let i = 0; i <= 240; i++){
            const u = i / 240 * Math.PI * 2;
            const x = Math.sin(3 * u + t), y = Math.sin(2 * u);
            const px = R + x * k * 0.8, py = R + y * k * 0.8;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        });
      } else {
        beam(() => {
          for(let i = 0; i <= 160; i++){
            const x = i / 160 * 2 - 1;
            const y = waveY(wave, x, t) + jitter();
            const px = R + x * k * 1.15, py = R + y * k;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        });
      }
      if(!reduced) raf = requestAnimationFrame(draw);
    }
    const start = () => { if(!raf && visible) raf = requestAnimationFrame(draw); };

    size();
    window.addEventListener("resize", () => { size(); start(); });
    document.addEventListener("visibilitychange", start);
    /* ---------- the 3D tilt ---------- */
    // tilt: the eased angles; aim: where the pointer wants them
    let rx = 46, ry = 0, aimX = 0, aimY = 0, lx = 50, ly = 20, tiltRaf = 0, near = false;
    window.addEventListener("pointermove", (e) => {
      if(e.pointerType !== "mouse") return;
      const r = deck.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      near = Math.abs(nx) < 1.6 && Math.abs(ny) < 2.4;
      aimY = near ? Math.max(-1, Math.min(1, nx)) * 9 : 0;
      aimX = near ? Math.max(-1, Math.min(1, ny)) * -7 : 0;
      lx = ((e.clientX - r.left) / r.width) * 100;
      ly = ((e.clientY - r.top) / r.height) * 100;
    }, { passive: true });

    function tilt(now){
      tiltRaf = 0;
      if(!visible) return;
      const r = stage.getBoundingClientRect(), vh = window.innerHeight;
      // lying back as it comes up the screen, standing at about 16 degrees once
      // its top is 60% of the way up
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.4)));
      const base = 16 + (1 - p) * 36;
      // with no mouse nearby it drifts a little, as if floating
      const t = now / 1000;
      const idleX = near ? 0 : Math.sin(t * 0.7) * 2.2, idleY = near ? 0 : Math.sin(t * 0.45) * 4;
      rx += (base + aimX + idleX - rx) * 0.09;
      ry += (aimY + idleY - ry) * 0.09;
      deck.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      deck.style.setProperty("--lx", (near ? lx : 50 + ry * 4).toFixed(1) + "%");
      deck.style.setProperty("--ly", (near ? ly : 10).toFixed(1) + "%");
      deck.style.setProperty("--gx", (-ry * 1.5).toFixed(1) + "px");
      // the shadow on the floor slides opposite the lean and spreads as it lies back
      floor.style.transform = `translate3d(${(-ry * 3).toFixed(1)}px, 0, 0) scale(${(1 + (rx - 16) / 90).toFixed(3)}, 1)`;
      tiltRaf = requestAnimationFrame(tilt);
    }

    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      stage.classList.toggle("is-in", visible);
      start();
      if(visible && !tiltRaf){
        if(reduced){ deck.style.transform = "rotateX(16deg)"; }
        else tiltRaf = requestAnimationFrame(tilt);
      }
    }, { threshold: 0 }).observe(stage);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
