/* ============================================================
   CURSOR — a small camera that follows the pointer.
   The centre of its lens is the point you are pointing with.
   - It glides after the pointer and tilts the way you move.
   - Over anything clickable the lens zooms in, focus brackets close
     around it and a word says what a click does (Play, View, Open).
   - Over the photo stages a red REC light blinks.
   - A click fires the shutter: a flash bursts from the lens.
   Only on devices with a mouse; touch screens keep their own.
   You should not need to edit this file.
   ============================================================ */
(function(){
  if(!window.matchMedia("(pointer: fine)").matches) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const root = document.createElement("div");
  root.className = "cam-cursor";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <span class="cam-brackets"><i></i><i></i><i></i><i></i></span>
    <span class="cam-flash"></span>
    <span class="cam-body">
      <svg viewBox="0 0 44 34" width="44" height="34">
        <defs>
          <linearGradient id="camRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffb37a"/><stop offset=".5" stop-color="#ff5a1f"/><stop offset="1" stop-color="#ff2e7e"/>
          </linearGradient>
          <radialGradient id="camGlass" cx=".38" cy=".34" r=".7">
            <stop offset="0" stop-color="#6a5cff"/><stop offset=".55" stop-color="#16151b"/><stop offset="1" stop-color="#0b0b0d"/>
          </radialGradient>
        </defs>
        <path class="cam-hump" d="M14 6.5h9l2.2 3H11.8z"/>
        <rect class="cam-shell" x="2" y="8.5" width="40" height="23" rx="5"/>
        <rect class="cam-grip" x="4.5" y="11" width="6" height="18" rx="2"/>
        <circle class="cam-led" cx="36.5" cy="13" r="1.6"/>
        <g class="cam-lens">
          <circle cx="23" cy="20" r="9.5" fill="url(#camRing)"/>
          <circle cx="23" cy="20" r="7.4" fill="#0b0b0d"/>
          <g class="cam-iris">
            <circle cx="23" cy="20" r="6.2" fill="url(#camGlass)"/>
            <path d="M23 14.2l2.2 3.4M28.6 18l-3.9 1M27.4 24.4l-2.6-3.1M21.4 25.6l.9-3.9M17.4 21.6l3.7-1.4M18.8 15.6l2.3 3.2" stroke="rgba(255,255,255,.18)" stroke-width=".9" fill="none"/>
          </g>
          <circle cx="20.6" cy="17.6" r="1.5" fill="rgba(255,255,255,.75)"/>
        </g>
      </svg>
    </span>
    <span class="cam-rec"><b></b>REC</span>
    <span class="cam-label"></span>`;
  document.body.appendChild(root);
  document.documentElement.classList.add("has-cam-cursor");

  const body = root.querySelector(".cam-body");
  const label = root.querySelector(".cam-label");
  const flash = root.querySelector(".cam-flash");

  let x = -100, y = -100, tx = -100, ty = -100, tilt = 0, shown = false;

  window.addEventListener("pointermove", (e) => {
    if(e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if(!shown){ x = tx; y = ty; shown = true; root.classList.add("is-on"); }
  }, { passive: true });
  document.addEventListener("mouseleave", () => { root.classList.remove("is-on"); shown = false; });
  // inside an embedded player the page can't see the pointer, so step aside
  document.addEventListener("mouseover", (e) => {
    const t = e.target;
    if(t.tagName === "IFRAME"){ root.classList.remove("is-on"); shown = false; return; }
    const hot = t.closest("a, button, summary, [role='button'], .clip, .stack, .screen, label");
    root.classList.toggle("is-hot", !!hot);
    label.textContent = hot ? labelFor(hot) : "";
    root.classList.toggle("is-rec", !!t.closest("#hero-stage, #portrait-stage"));
  });

  function labelFor(el){
    if(el.closest(".clip, .screen, .screen-btn")) return "Play";
    if(el.closest(".stack")) return "View";
    if(el.closest("#hero-stage, #portrait-stage")) return "Next";
    if(el.tagName === "A" && el.target === "_blank") return "Open";
    if(el.tagName === "A") return "Go";
    return "";
  }

  // the shutter
  window.addEventListener("pointerdown", (e) => {
    if(e.pointerType !== "mouse") return;
    root.classList.remove("is-shot");
    void root.offsetWidth;   // restart the flash animation
    root.classList.add("is-shot", "is-down");
  });
  window.addEventListener("pointerup", () => root.classList.remove("is-down"));
  flash.addEventListener("animationend", () => root.classList.remove("is-shot"));

  function frame(){
    const k = reduced ? 1 : 0.24;
    const dx = tx - x;
    x += dx * k; y += (ty - y) * k;
    // lean into the direction of travel, and settle back upright
    tilt += ((reduced ? 0 : Math.max(-14, Math.min(14, dx * 0.6))) - tilt) * 0.15;
    root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    body.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
