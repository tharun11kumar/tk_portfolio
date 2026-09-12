/* ============================================================
   Renders the whole page from CONTENT (see content.js).
   You should not need to edit this file to update your site —
   edit content.js instead.
   ============================================================ */

const ACCENT_BY_CATEGORY = {
  edits: "var(--accent)",
  photography: "var(--teal)",
  films: "var(--violet)",
};

let activeCategory = CONTENT.categories[0]?.id || null;

function el(tag, className, html){
  const e = document.createElement(tag);
  if(className) e.className = className;
  if(html !== undefined) e.innerHTML = html;
  return e;
}

/* ---------- GATE ---------- */
function renderGateName(){
  const h1 = document.getElementById("gate-name");
  const parts = (CONTENT.name || "").trim().split(" ");
  if(parts.length > 1){
    const last = parts.pop();
    h1.innerHTML = `${parts.join(" ")}<br>${last}`;
  } else {
    h1.textContent = CONTENT.name || "";
  }
}

function renderGate(){
  renderGateName();
  document.getElementById("gate-role").textContent = CONTENT.role || "";
  document.getElementById("gate-blurb").textContent = (CONTENT.hero && CONTENT.hero.blurb) || "";

  const wrap = document.getElementById("reel-select");
  wrap.innerHTML = "";
  CONTENT.categories.forEach(cat => {
    const btn = el("button", "reel");
    btn.setAttribute("data-cursor", "Load");
    btn.innerHTML = `<span class="reel-icon"></span><span class="reel-label">${cat.label}</span><span class="reel-hint">${cat.hint}</span>`;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      renderTabs();
      swapGrid();
      document.getElementById("work").scrollIntoView({ behavior: "smooth" });
    });
    wrap.appendChild(btn);
  });
}

/* ---------- TABS ---------- */
function renderTabs(){
  const wrap = document.getElementById("tabs");
  wrap.innerHTML = "";
  CONTENT.categories.forEach(cat => {
    const btn = el("button", "tab" + (cat.id === activeCategory ? " active" : ""), cat.label);
    btn.addEventListener("click", () => {
      if(cat.id === activeCategory) return;
      activeCategory = cat.id;
      renderTabs();
      swapGrid();
    });
    wrap.appendChild(btn);
  });
}

/* crossfades the grid out, swaps content, fades it back in — motion tied to the click */
function swapGrid(){
  const grid = document.getElementById("work-grid");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced){ renderGrid(); return; }
  grid.classList.add("swapping");
  setTimeout(() => {
    renderGrid();
    grid.classList.remove("swapping");
  }, 220);
}

/* ---------- WORK GRID ---------- */
let gridFirstRenderDone = false;

function getYouTubeId(url){
  if(!url) return null;
  const match = url.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : null;
}

function thumbHTML(item){
  // photo album: cover is the first image, with a photo-count badge
  if(item.images && item.images.length){
    const cover = item.images[0]
      ? `<img src="${item.images[0]}" alt="${item.title}">`
      : `<div class="ph"></div>`;
    return `${cover}<span class="count-badge">${item.images.length} photo${item.images.length===1?"":"s"}</span>`;
  }
  // explicit custom thumbnail always wins
  if(item.image){
    const play = item.video ? `<div class="play"></div>` : "";
    return `<img src="${item.image}" alt="${item.title}">${play}`;
  }
  // no explicit image, but it's a YouTube video: pull the real thumbnail automatically
  if(item.video){
    const ytId = getYouTubeId(item.video);
    if(ytId){
      return `<img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${item.title}"><div class="play"></div>`;
    }
    // non-YouTube video with no "image" set: fall back to a grain placeholder
    return `<div class="ph"></div><div class="play"></div>`;
  }
  return `<div class="ph"></div>`;
}

function renderGrid(){
  const grid = document.getElementById("work-grid");
  grid.innerHTML = "";
  const items = CONTENT.work.filter(w => w.category === activeCategory);
  if(items.length === 0){
    grid.appendChild(el("p", null, "No projects in this category yet — add one in content.js."));
    return;
  }
  items.forEach((item, i) => {
    const card = el("div", "card");
    if(!gridFirstRenderDone){
      card.classList.add("reveal");
      card.style.setProperty("--d", `${i * 0.08}s`);
    }
    card.setAttribute("data-cursor", item.images && item.images.length ? "View" : item.video ? "Play" : "View");
    const accent = ACCENT_BY_CATEGORY[item.category] || "var(--accent)";
    card.innerHTML = `
      <div class="card-thumb" style="background:linear-gradient(150deg, ${accent}, #08090b 78%)">
        ${thumbHTML(item)}
      </div>
      <div class="card-body">
        <p class="card-cat">${labelFor(item.category)}</p>
        <p class="card-title">${item.title}</p>
        <p class="card-meta">${item.role} · ${item.year}</p>
      </div>`;
    card.addEventListener("click", () => openModal(item));
    grid.appendChild(card);
  });
}

function labelFor(catId){
  const c = CONTENT.categories.find(c => c.id === catId);
  return c ? c.label : catId;
}

/* ---------- MODAL ---------- */
let galleryImages = [];
let galleryIndex = 0;

function openModal(item){
  const modal = document.getElementById("modal");
  document.getElementById("modal-cat").textContent = labelFor(item.category);
  document.getElementById("modal-title").textContent = item.title;
  document.getElementById("modal-meta").textContent = `${item.role} · ${item.year}`;
  document.getElementById("modal-desc").textContent = item.description || "";

  const singleWrap = document.getElementById("modal-single");
  const albumWrap = document.getElementById("modal-album");

  if(item.images && item.images.length){
    // ---- photo album / gallery mode ----
    singleWrap.style.display = "none";
    albumWrap.style.display = "block";
    galleryImages = item.images;
    galleryIndex = 0;
    renderGalleryFrame();
  } else {
    // ---- single edit / film mode ----
    albumWrap.style.display = "none";
    singleWrap.style.display = "block";
    const thumb = document.getElementById("modal-thumb");
    const accent = ACCENT_BY_CATEGORY[item.category] || "var(--accent)";
    if(item.video){
      thumb.style.background = "none";
      thumb.innerHTML = `<iframe src="${item.video}" allowfullscreen title="${item.title}"></iframe>`;
    } else if(item.image){
      thumb.style.background = "none";
      thumb.innerHTML = `<img src="${item.image}" alt="${item.title}">`;
    } else {
      thumb.style.background = `linear-gradient(150deg, ${accent}, #08090b 78%)`;
      thumb.innerHTML = "";
    }
  }

  const link = document.getElementById("modal-link");
  if(item.link){ link.href = item.link; link.style.display = "inline-block"; }
  else { link.style.display = "none"; }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function renderGalleryFrame(){
  const main = document.getElementById("album-main");
  main.innerHTML = `<img src="${galleryImages[galleryIndex]}" alt="Photo ${galleryIndex+1}">`;
  document.getElementById("album-count").textContent = `${galleryIndex+1} / ${galleryImages.length}`;

  const thumbs = document.getElementById("album-thumbs");
  thumbs.innerHTML = "";
  galleryImages.forEach((src, i) => {
    const img = el("img", i === galleryIndex ? "active" : "");
    img.src = src;
    img.alt = `Thumbnail ${i+1}`;
    img.setAttribute("data-cursor", "View");
    img.addEventListener("click", () => { galleryIndex = i; renderGalleryFrame(); });
    thumbs.appendChild(img);
  });
}

function closeModal(){
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  // an iframe keeps playing (audio included) even when just hidden with CSS —
  // clearing it out is what actually stops playback
  document.getElementById("modal-thumb").innerHTML = "";
  document.getElementById("album-main").innerHTML = "";
}

/* ---------- HISTORY ---------- */
function renderHistory(){
  const wrap = document.getElementById("timeline");
  wrap.innerHTML = "";
  CONTENT.history.forEach((h, i) => {
    const item = el("div", "tl-item reveal");
    item.style.setProperty("--d", `${i * 0.12}s`);
    item.innerHTML = `
      <span class="tl-time">${h.time}</span>
      <p class="tl-title">${h.title}</p>
      <p class="tl-body">${h.body}</p>`;
    wrap.appendChild(item);
  });
}

/* ---------- ABOUT ---------- */
function renderAbout(){
  const wrap = document.getElementById("about-text");
  wrap.innerHTML = CONTENT.about.paragraphs.map(p => `<p>${p}</p>`).join("");

  const caption = document.getElementById("portrait-caption");
  if(caption) caption.textContent = CONTENT.about.caption || "";

  const chips = document.getElementById("kit-chips");
  chips.innerHTML = "";
  const kit = CONTENT.about.kit || [];
  // render the list twice back-to-back so the marquee can loop seamlessly at -50%
  kit.concat(kit).forEach((k, i) => {
    const isDup = i >= kit.length;
    const chip = el("span", "chip" + (isDup ? " dup" : ""), k);
    if(isDup) chip.setAttribute("aria-hidden", "true");
    chips.appendChild(chip);
  });
}

/* ---------- CONTACT ---------- */
function renderContact(){
  const email = document.getElementById("contact-email");
  email.textContent = CONTENT.contact.email;
  email.href = `mailto:${CONTENT.contact.email}`;
  const socials = document.getElementById("socials");
  socials.innerHTML = "";
  CONTENT.contact.socials.forEach(s => {
    const a = el("a", null, s.label);
    a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    socials.appendChild(a);
  });
  document.getElementById("year").textContent = new Date().getFullYear();
}

/* ---------- HEADER / NAME ---------- */
function renderHeader(){
  document.title = `${CONTENT.name} — ${CONTENT.role}`;
}

/* ---------- TIMECODE (ambient detail, respects reduced motion) ---------- */
function startTimecode(){
  const node = document.getElementById("timecode");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduced) return;
  let frames = 0;
  setInterval(() => {
    frames++;
    const f = frames % 24;
    const totalSec = Math.floor(frames / 24);
    const h = String(Math.floor(totalSec/3600)).padStart(2,"0");
    const m = String(Math.floor((totalSec%3600)/60)).padStart(2,"0");
    const s = String(totalSec%60).padStart(2,"0");
    node.textContent = `${h}:${m}:${s}:${String(f).padStart(2,"0")}`;
  }, 1000/24);
}

/* ---------- STATS ---------- */
function renderStats(){
  const wrap = document.getElementById("stats-grid");
  wrap.innerHTML = "";
  (CONTENT.stats || []).forEach(s => {
    const stat = el("div", "stat");
    const match = String(s.value).match(/^(\d+)(.*)$/); // split "10+" into 10 and "+"
    const numPart = match ? match[1] : null;
    const suffix = match ? match[2] : "";
    stat.innerHTML = `<div class="stat-value" data-target="${numPart || ""}" data-suffix="${suffix}">${numPart ? "0" + suffix : s.value}</div><div class="stat-label">${s.label}</div>`;
    wrap.appendChild(stat);
  });
}

function initStatsCountUp(){
  const section = document.getElementById("stats");
  if(!section) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const values = section.querySelectorAll(".stat-value[data-target]");
  if(reduced){
    values.forEach(v => { v.textContent = v.dataset.target + v.dataset.suffix; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      values.forEach(v => {
        const target = parseInt(v.dataset.target, 10);
        const suffix = v.dataset.suffix;
        const duration = 900;
        const start = performance.now();
        function tick(now){
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          v.textContent = Math.round(target * eased) + suffix;
          if(p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      io.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  io.observe(section);
}

/* ---------- CUSTOM CURSOR ---------- */
function initCustomCursor(){
  if(!window.matchMedia("(pointer: fine)").matches) return; // touch devices: skip entirely

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dot = el("div", "cursor-dot");
  const ring = el("div", "cursor-ring");
  const label = el("span", "cursor-label");
  ring.appendChild(label);
  // start off-screen so there's no stray circle at (0,0) before the mouse first moves
  dot.style.transform = "translate(-100px, -100px)";
  ring.style.transform = "translate(-100px, -100px)";
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    if(reduced){
      ring.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    }
  });

  if(!reduced){
    (function follow(){
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    })();
  }

  // event delegation so this works on cards/buttons rendered after this runs
  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-cursor], a, button");
    if(!target) return;
    label.textContent = target.getAttribute("data-cursor") || "";
    ring.classList.add("hovering");
    dot.classList.add("hovering");
  });
  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-cursor], a, button");
    if(!target) return;
    ring.classList.remove("hovering");
    dot.classList.remove("hovering");
    label.textContent = "";
  });

  document.addEventListener("mouseleave", () => { dot.style.opacity = "0"; ring.style.opacity = "0"; });
  document.addEventListener("mouseenter", () => { dot.style.opacity = "1"; ring.style.opacity = "1"; });
}

/* ---------- SCROLL REVEAL ---------- */
function initScrollReveal(){
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targets = document.querySelectorAll(".reveal:not(.in-view)");
  if(reduced){
    targets.forEach(t => t.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  targets.forEach(t => io.observe(t));
}

/* ---------- LOADER (the one deliberate page-load sequence) ---------- */
function runLoader(){
  const loader = document.getElementById("loader");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const holdTime = reduced ? 150 : 1250; // let the clap animation actually finish before hiding

  setTimeout(() => {
    loader.classList.add("hide");
    document.getElementById("gate").classList.add("intro-play");
    setTimeout(() => {
      loader.remove();
      document.documentElement.classList.remove("is-loading");
    }, reduced ? 200 : 650);
  }, holdTime);
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("is-loading");
  renderHeader();
  renderGate();
  renderTabs();
  renderGrid();
  renderHistory();
  renderAbout();
  renderContact();
  renderStats();
  startTimecode();
  runLoader();
  initScrollReveal();
  initStatsCountUp();
  initCustomCursor();
  gridFirstRenderDone = true;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if(e.target.id === "modal") closeModal();
  });
  document.getElementById("album-prev").addEventListener("click", () => {
    galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
    renderGalleryFrame();
  });
  document.getElementById("album-next").addEventListener("click", () => {
    galleryIndex = (galleryIndex + 1) % galleryImages.length;
    renderGalleryFrame();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeModal();
    const modalOpen = document.getElementById("modal").classList.contains("open");
    if(modalOpen && galleryImages.length){
      if(e.key === "ArrowLeft"){ galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length; renderGalleryFrame(); }
      if(e.key === "ArrowRight"){ galleryIndex = (galleryIndex + 1) % galleryImages.length; renderGalleryFrame(); }
    }
  });
});
