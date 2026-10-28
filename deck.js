/* ============================================================
   DECK — the control desk the page ends on.
   A matte black console sitting on the very bottom of the page,
   lit from behind by a green glow:
   - Left: a dot-matrix status strip with its LED, a round TK badge,
     and three rows of keycaps (rendered images in assets/deck/)
     that are the links: the sections of
     the page, your Instagram and LinkedIn, "@" (copies your email)
     and HIRE ME (opens a new email to you). A key under the cursor
     snaps down at once, its skirt slipping under the row in front.
   - The status strip runs on a loop: your status with the LED lit,
     then it goes dark and types out a check, then back again.
   - Middle: a slatted speaker grille.
   - Right: a round green scope in a screwed-down plate, running its
     own loop: a sine sweep that speeds up, then your initials held
     with a shimmer, then round again.
   The email and socials come from content.js.
   You should not need to edit this file.
   ============================================================ */
(function(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Title Case for the status strip: "Open for freelance" -> "Open For Freelance"
  const title = (s) => String(s).replace(/\b\w/g, c => c.toUpperCase());

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
    const ON = title((status && status.value) || "Available for freelance");
    const CHECK = "Checking Freelance Availability";

    // rows of [rendered cap (assets/deck/key-NAME.webp), what it does, link (or "copy"), width in key units]
    const rows = [
      [["home", "Back to the top", "#top", 1.75], ["work", "Films and edits", "#work", 1], ["ig", "Instagram", ig && ig.url, 1]],
      [["at", "Copy " + email, "copy", 1], ["hire", "Write to me", "mailto:" + email, 1.75], ["in", "LinkedIn", li && li.url, 1]],
      [["photos", "The albums", "#photography", 1.75], ["about", "Who's behind the lens", "#about", 1], ["roles", "Where I've led", "#roles", 1]],
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

    const lcdBox = deck.querySelector(".deck-lcd");
    const lcd = deck.querySelector(".deck-lcd-text");
    const keysWrap = deck.querySelector(".deck-keys");
    let copied = 0;

    rows.forEach((row, ri) => {
      const r = document.createElement("div");
      r.className = "deck-row";
      // each row sits over the one behind it, so a pressed key slips under
      r.style.zIndex = ri + 1;
      row.filter(k => k[2]).forEach(([name, hint, href, units]) => {
        const external = /^https?:/.test(href);
        const el = document.createElement(href === "copy" ? "button" : "a");
        el.className = "key";
        el.style.setProperty("--w", units);
        if(href === "copy") el.type = "button";
        else {
          el.href = href;
          if(external){ el.target = "_blank"; el.rel = "noopener"; }
        }
        el.setAttribute("aria-label", hint);
        el.innerHTML = `<img class="key-img" src="assets/deck/key-${name}.webp" alt="" draggable="false" decoding="async">`;
        if(href === "copy"){
          el.addEventListener("click", async () => {
            try{ await navigator.clipboard.writeText(email); }catch(e){}
            copied = performance.now();
          });
        }
        r.appendChild(el);
      });
      keysWrap.appendChild(r);
    });

    /* ---------- the status strip: a 7 second loop ---------- */
    // 0 to 4.2s: the status, LED lit; a blink of dark; then the check types out
    // with the LED off; back to the status
    const LOOP = 7000;
    let shown = "", ledOn = null;
    function lcdAt(now){
      let text, led;
      if(copied && now - copied < 1600){ text = "Copied!"; led = true; }
      else {
        const t = reduced ? 0 : now % LOOP;
        if(t < 4200){ text = ON; led = true; }
        else if(t < 4600){ text = ""; led = false; }
        else {
          const n = Math.min(CHECK.length, Math.floor((t - 4600) / 45));
          text = CHECK.slice(0, n); led = false;
        }
      }
      if(text !== shown){ lcd.textContent = text; shown = text; }
      if(led !== ledOn){ lcdBox.classList.toggle("is-off", !led); ledOn = led; }
    }

    /* ---------- the scope: a 4.8 second loop ---------- */
    const canvas = deck.querySelector(".deck-crt canvas");
    const g = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let S = 0, visible = false, raf = 0;

    function size(){
      S = Math.round(canvas.getBoundingClientRect().width) || 200;
      canvas.width = canvas.height = S * DPR;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.fillStyle = "#0a1a10"; g.fillRect(0, 0, S, S);
    }

    // "TK" in a -1..1 box, a little hand-drawn
    const TK = [
      [[-0.66, -0.4], [-0.36, -0.43], [-0.06, -0.41]],
      [[-0.36, -0.43], [-0.37, 0.05], [-0.38, 0.46]],
      [[0.12, -0.44], [0.13, 0.02], [0.12, 0.46]],
      [[0.6, -0.42], [0.37, -0.2], [0.14, 0.02]],
      [[0.29, -0.09], [0.48, 0.18], [0.66, 0.45]],
    ];

    function beam(fn){
      g.save();
      g.strokeStyle = "rgba(150, 255, 160, 0.9)";
      g.lineWidth = 1.6;
      g.shadowColor = "rgba(90, 255, 120, 0.9)";
      g.shadowBlur = 9;
      g.lineJoin = g.lineCap = "round";
      g.beginPath(); fn(); g.stroke();
      g.restore();
    }

    const SCOPE = 4833;
    function draw(now){
      raf = 0;
      if(!visible || document.hidden) return;
      lcdAt(now);
      const R = S / 2, k = R * 0.8;
      // phosphor: earlier frames fade rather than vanish
      g.fillStyle = reduced ? "#0a1a10" : "rgba(10, 26, 16, 0.24)";
      g.fillRect(0, 0, S, S);
      const t = reduced ? 3000 : now % SCOPE;

      if(t < 1500){
        // a sine that sweeps faster and faster
        const p = t / 1500, cycles = 0.6 + p * p * 5.5, amp = 0.48 + p * 0.06;
        beam(() => {
          for(let i = 0; i <= 200; i++){
            const x = i / 200 * 2 - 1;
            const y = -Math.sin((x + 1) * Math.PI * cycles + p * 2) * amp;
            const px = R + x * k * 1.2, py = R + y * k;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
        });
      } else {
        // the initials, held, with the beam's shimmer
        const jit = () => (Math.random() - 0.5) * 0.012;
        beam(() => {
          for(const s of TK){
            g.moveTo(R + (s[0][0] + jit()) * k, R + (s[0][1] + jit()) * k);
            for(let i = 1; i < s.length; i++) g.lineTo(R + (s[i][0] + jit()) * k, R + (s[i][1] + jit()) * k);
          }
        });
      }
      if(!reduced) raf = requestAnimationFrame(draw);
    }
    function start(){ if(!raf && visible) raf = requestAnimationFrame(draw); }

    size();
    lcdAt(performance.now());
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
