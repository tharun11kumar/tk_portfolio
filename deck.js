/* ============================================================
   DECK — the control desk the page ends on.
   A matte black console sitting on the very bottom of the page,
   lit from behind by a green glow:
   - Left: a dot-matrix status strip, a round TK badge, and three
     rows of sculpted keycaps that are the links: the sections of the
     page, your Instagram and LinkedIn, "@" (copies your email) and
     HIRE ME (opens a new email to you). Keys sink when pressed.
   - Middle: a slatted speaker grille.
   - Right: a round green scope in a screwed-down plate. It writes
     "TK" stroke by stroke, like a beam; point at a key and it shows
     that key's own wave.
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
    const idle = (status && status.value) || "On air";

    // rows of [label, what it does, link (or "copy"), colour, wave, width in key units]
    const rows = [
      [["Home", "Back to the top", "#top", "black", "sine", 1.75], ["Work", "Films and edits", "#work", "frost", "saw", 1], ["IG", "Instagram", ig && ig.url, "sunset", "square", 1]],
      [["@", "Copy " + email, "copy", "sand", "pulse", 1], ["Hire me", "Write to me", "mailto:" + email, "black", "heart", 1.75], ["IN", "LinkedIn", li && li.url, "black", "tri", 1]],
      [["Photos", "The albums", "#photography", "black", "noise", 1.75], ["About", "Who's behind the lens", "#about", "candy", "lissa", 1], ["Roles", "Where I've led", "#roles", "cobalt", "steps", 1]],
    ];

    deck.innerHTML = `
      <div class="deck-plate deck-left">
        <div class="deck-top">
          <div class="deck-lcd"><span class="deck-lcd-text"></span><i class="deck-led"></i></div>
          <span class="deck-badge" aria-hidden="true">TK</span>
        </div>
        <div class="deck-keys"></div>
      </div>
      <div class="deck-grille" aria-hidden="true"></div>
      <div class="deck-plate deck-scope" aria-hidden="true">
        <div class="deck-crt"><canvas></canvas></div>
        <span class="deck-screw s1"></span><span class="deck-screw s2"></span>
        <span class="deck-screw s3"></span><span class="deck-screw s4"></span>
      </div>`;

    // the green glow rising from behind the deck
    deck.insertAdjacentHTML("beforebegin", `<div class="deck-glow" aria-hidden="true"></div>`);

    const lcd = deck.querySelector(".deck-lcd-text");
    const keysWrap = deck.querySelector(".deck-keys");
    lcd.textContent = idle;
    let wave = "tk", copiedT = 0, kick = 0;

    rows.forEach(row => {
      const r = document.createElement("div");
      r.className = "deck-row";
      row.filter(k => k[2]).forEach(([label, hint, href, colour, w, units]) => {
        const external = /^https?:/.test(href);
        const el = document.createElement(href === "copy" ? "button" : "a");
        el.className = `key key-${colour}`;
        el.style.setProperty("--w", units);
        if(href === "copy") el.type = "button";
        else {
          el.href = href;
          if(external){ el.target = "_blank"; el.rel = "noopener"; }
        }
        el.setAttribute("aria-label", hint);
        el.innerHTML = `<span class="key-cap"><span class="key-label">${label}</span></span>`;
        const on = () => { wave = w; if(!copiedT) lcd.textContent = hint; start(); };
        const off = () => { wave = "tk"; drawn = 0; if(!copiedT) lcd.textContent = idle; start(); };
        el.addEventListener("pointerenter", on);
        el.addEventListener("pointerleave", off);
        el.addEventListener("focus", on);
        el.addEventListener("blur", off);
        el.addEventListener("pointerdown", () => { kick = 1; });
        if(href === "copy"){
          el.addEventListener("click", async () => {
            try{ await navigator.clipboard.writeText(email); lcd.textContent = "Copied!"; }
            catch(e){ lcd.textContent = email; }
            clearTimeout(copiedT);
            copiedT = setTimeout(() => { copiedT = 0; lcd.textContent = idle; }, 2000);
          });
        }
        r.appendChild(el);
      });
      keysWrap.appendChild(r);
    });

    /* ---------- the scope ---------- */
    const canvas = deck.querySelector(".deck-crt canvas");
    const g = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let S = 0, visible = false, raf = 0, drawn = 0, last = 0;

    function size(){
      S = Math.round(canvas.getBoundingClientRect().width) || 200;
      canvas.width = canvas.height = S * DPR;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.fillStyle = "#0a1a10"; g.fillRect(0, 0, S, S);
    }

    // "TK" in a -1..1 box, as one beam path per stroke, a little hand-drawn
    const TK = [
      [[-0.72, -0.42], [-0.4, -0.45], [-0.08, -0.44]],
      [[-0.4, -0.45], [-0.41, 0.05], [-0.42, 0.5]],
      [[0.12, -0.46], [0.13, 0.04], [0.12, 0.5]],
      [[0.66, -0.44], [0.4, -0.2], [0.14, 0.04]],
      [[0.3, -0.08], [0.52, 0.2], [0.72, 0.48]],
    ];
    const TK_LEN = TK.reduce((n, s) => n + s.length - 1, 0);

    function waveY(kind, x, t){
      const p = x * Math.PI * 2 + t * 3;
      switch(kind){
        case "sine": return Math.sin(p) * 0.5;
        case "saw": return (((x + t * 0.5) * 2 % 1 + 1) % 1) * 1 - 0.5;
        case "square": return Math.sin(p) >= 0 ? -0.45 : 0.45;
        case "tri": return (Math.asin(Math.sin(p)) / (Math.PI / 2)) * 0.5;
        case "pulse": return (((x + t * 0.4) * 3 % 1 + 1) % 1) < 0.12 ? -0.55 : 0.25;
        case "noise": return (Math.sin(x * 91 + t * 37) * Math.sin(x * 23 - t * 11)) * 0.55;
        case "steps": return (Math.round(Math.sin(p) * 3) / 3) * 0.5;
        case "heart": {
          const u = (((x + t * 0.35) % 1) + 1) % 1;
          if(u > 0.42 && u < 0.46) return -0.1;
          if(u > 0.48 && u < 0.5) return 0.18;
          if(u > 0.5 && u < 0.53) return -0.7;
          if(u > 0.53 && u < 0.56) return 0.3;
          return 0.04;
        }
      }
      return 0;
    }

    function stroke(fn){
      g.save();
      g.strokeStyle = "rgba(150, 255, 160, 0.95)";
      g.lineWidth = 1.8;
      g.shadowColor = "rgba(90, 255, 120, 0.9)";
      g.shadowBlur = 10;
      g.lineJoin = g.lineCap = "round";
      g.beginPath(); fn(); g.stroke();
      g.restore();
    }

    function draw(now){
      raf = 0;
      if(!visible || document.hidden) return;
      const dt = Math.min(64, now - (last || now)); last = now;
      const t = now / 1000, R = S / 2, k = R * 0.8;
      // phosphor: earlier frames fade rather than vanish
      g.fillStyle = reduced ? "#0a1a10" : "rgba(10, 26, 16, 0.2)";
      g.fillRect(0, 0, S, S);
      const j = kick * 0.25; kick *= 0.88;
      const jit = () => (Math.random() - 0.5) * (0.01 + j * 0.2);

      if(wave === "tk"){
        // the beam writes the letters, holds them, then starts again
        drawn = reduced ? TK_LEN : drawn + dt / 260;
        if(drawn > TK_LEN + 9) drawn = 0;
        let left = Math.min(drawn, TK_LEN), head = null;
        stroke(() => {
          for(const s of TK){
            if(left <= 0) break;
            g.moveTo(R + (s[0][0] + jit()) * k, R + (s[0][1] + jit()) * k);
            for(let i = 1; i < s.length && left > 0; i++){
              const f = Math.min(1, left);
              const x = s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, y = s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f;
              g.lineTo(R + (x + jit()) * k, R + (y + jit()) * k);
              head = [x, y];
              left -= 1;
            }
          }
        });
        // the bright spot of the beam while it's writing
        if(head && drawn < TK_LEN){
          g.fillStyle = "rgba(220, 255, 220, 0.95)";
          g.shadowColor = "rgba(120, 255, 140, 1)"; g.shadowBlur = 14;
          g.beginPath(); g.arc(R + head[0] * k, R + head[1] * k, 2.2, 0, 6.2832); g.fill();
          g.shadowBlur = 0;
        }
      } else if(wave === "lissa"){
        stroke(() => {
          for(let i = 0; i <= 240; i++){
            const u = i / 240 * Math.PI * 2, x = Math.sin(3 * u + t), y = Math.sin(2 * u);
            const px = R + x * k * 0.75, py = R + y * k * 0.75;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        });
      } else {
        stroke(() => {
          for(let i = 0; i <= 160; i++){
            const x = i / 160 * 2 - 1, y = waveY(wave, x, t) + jit();
            const px = R + x * k * 1.2, py = R + y * k;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        });
      }
      if(!reduced) raf = requestAnimationFrame(draw);
    }
    function start(){ if(!raf && visible) raf = requestAnimationFrame(draw); }

    size();
    window.addEventListener("resize", () => { size(); start(); });
    document.addEventListener("visibilitychange", start);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      deck.classList.toggle("is-in", visible);
      start();
    }, { threshold: 0 }).observe(deck);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
