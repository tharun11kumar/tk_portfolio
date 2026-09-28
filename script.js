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

/* abstract cards that fill the hero arc until real work fills it instead.
   Regenerate them with `node scripts/make-art.js` if you change the palette. */
const ART = Array.from({ length: 9 }, (_, i) =>
  `assets/art/${String(i + 1).padStart(2, "0")}.svg`);

let activeCategory = CONTENT.categories[0]?.id || null;

function el(tag, className, html){
  const e = document.createElement(tag);
  if(className) e.className = className;
  if(html !== undefined) e.innerHTML = html;
  return e;
}

/* content.js is hand-edited, so a stray quote or angle bracket in a title
   shouldn't be able to break the markup it gets dropped into */
function esc(str){
  return String(str ?? "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
  ));
}

function reducedMotion(){
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ============================================================
   LINK HANDLING
   You paste normal share links into content.js; these turn them
   into the embed form each service actually needs.
   ============================================================ */
function getYouTubeId(url){
  if(!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function getDriveId(url){
  if(!url) return null;
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}

function getInstagramCode(url){
  if(!url) return null;
  const m = String(url).match(https://www.instagram.com/reel/DYtuaBVTRGg/?stkn=MzRlODBiNWFlZA==);
  return m ? m[1] : null;
}

/* returns a URL safe to drop into an <iframe src> */
function resolveVideo(url){
  if(!url) return null;
  const yt = getYouTubeId(url);
  if(yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const drive = getDriveId(url);
  if(drive) return `https://drive.google.com/file/d/${drive}/preview`;
  return url; // already an embed URL, or some other player
}

function instagramEmbed(url){
  const code = getInstagramCode(url);
  return code ? `https://www.instagram.com/p/${code}/embed` : null;
}

/* a thumbnail we can show on the grid card without an API key.
   YouTube hands these out freely; Drive and Instagram do not. */
function autoThumb(item){
  const yt = getYouTubeId(item.video);
  if(yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

/* ---------- GATE ---------- */
function renderGateName(){
  const h1 = document.getElementById("gate-name");
  const custom = (CONTENT.wordmark || "").trim();
  const raw = custom || (CONTENT.name || "").trim();
  const parts = raw.split(/\s+/);
  let lines;
  if(!custom && parts.length > 1){
    const last = parts.pop();
    lines = [parts.join(" "), last];
  } else {
    lines = [raw];
  }
  // each line gets a clipping wrapper so the reveal can slide up out of it
  h1.innerHTML = lines.map((line, i) => {
    const mark = i === lines.length - 1 ? `<sup class="wordmark-r">®</sup>` : "";
    return `<span class="wm-line"><span class="wm-inner">${esc(line)}${mark}</span></span>`;
  }).join("") + `<span class="wm-sweep" aria-hidden="true"></span>`;
}

function renderSlate(){
  const wrap = document.getElementById("slate");
  const rows = (CONTENT.hero && CONTENT.hero.slate) || [];
  if(!rows.length){ wrap.style.display = "none"; return; }
  wrap.innerHTML = rows.map(r =>
    `<span class="slate-cell"><span class="slate-label">${esc(r.label)}</span><span class="slate-value">${esc(r.value)}</span></span>`
  ).join("");
}

function renderGate(){
  renderGateName();
  renderSlate();
  document.getElementById("gate-role").textContent = CONTENT.role || "";
  document.getElementById("gate-blurb").textContent = (CONTENT.hero && CONTENT.hero.blurb) || "";

  const wrap = document.getElementById("reel-select");
  wrap.innerHTML = "";
  CONTENT.categories.forEach(cat => {
    const btn = el("button", "reel");
    btn.type = "button";
    btn.setAttribute("data-cursor", "Load");
    btn.innerHTML = `<span class="reel-icon"></span><span class="reel-label">${esc(cat.label)}</span><span class="reel-hint">${esc(cat.hint)}</span>`;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      renderTabs();
      swapGrid();
      document.getElementById("work").scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
    });
    wrap.appendChild(btn);
  });
}

/* ---------- TICKER ----------
   The strip loops by sliding to -50%, which only reads as continuous if the
   track is exactly two identical halves AND each half is at least as wide as
   the screen. Three short words don't come close on a wide monitor, so the
   run gets repeated as many times as it takes to cover the viewport first. */
function renderTicker(){
  const track = document.getElementById("ticker");
  if(!track) return;
  const words = String(CONTENT.role || "")
    .split(/[.·•]/).map(s => s.trim()).filter(Boolean);
  if(!words.length) return;

  const run = words.map(w => `<span class="tick">${esc(w)}</span>`).join("");

  if(reducedMotion()){
    track.innerHTML = run;   // nothing moves, so one pass is all that's needed
    return;
  }

  // measure one run, then work out how many it takes to span the screen
  track.innerHTML = run;
  const runWidth = track.getBoundingClientRect().width;
  if(!runWidth) return;
  const reps = Math.max(1, Math.ceil(window.innerWidth / runWidth));
  const half = run.repeat(reps);
  track.innerHTML = half + half;

  // more repeats means a wider track, so hold the speed steady in px/sec
  // rather than letting a wide screen scroll faster than a narrow one
  const halfWidth = runWidth * reps;
  track.style.animationDuration = `${Math.max(14, halfWidth / 55).toFixed(1)}s`;
}

function initTicker(){
  renderTicker();
  // a webfont landing after the first measurement changes the run width
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(renderTicker);
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(renderTicker, 200);
  });
}

/* ---------- HERO COLLAGE ----------
   The arc behind the wordmark uses your actual work where it exists —
   album covers, custom thumbnails, YouTube stills — and fills the rest
   with the generated abstract cards, so it always reads as a full arc. */
function collageSources(){
  const out = [];
  (CONTENT.work || []).forEach(w => {
    if(w.images && w.images.length && w.images[0]) out.push(w.images[0]);
    else if(w.image) out.push(w.image);
    else {
      const auto = autoThumb(w);
      if(auto) out.push(auto);
    }
  });
  return out;
}

function buildCollage(){
  const wrap = document.getElementById("collage");
  if(!wrap) return;

  const srcs = ART.slice();
  // drop real work into the most-visible slots first, centre outward
  const priority = [4, 3, 5, 2, 6, 1, 7, 0, 8];
  collageSources().slice(0, 9).forEach((src, i) => { srcs[priority[i]] = src; });

  wrap.innerHTML = "";
  srcs.forEach(src => {
    const slot = el("div", "col-slot");
    const card = el("div", "col-card");
    // only swap in the image once it actually loads, so a wrong path
    // leaves a styled card rather than a broken-image icon
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.addEventListener("load", () => card.appendChild(img));
    img.src = src;
    slot.appendChild(card);
    wrap.appendChild(slot);
  });
}

/* ---------- TABS ---------- */
function renderTabs(){
  const wrap = document.getElementById("tabs");
  wrap.innerHTML = "";
  CONTENT.categories.forEach(cat => {
    const btn = el("button", "tab" + (cat.id === activeCategory ? " active" : ""), esc(cat.label));
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(cat.id === activeCategory));
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
  if(reducedMotion()){ renderGrid(); return; }
  grid.classList.add("swapping");
  setTimeout(() => {
    renderGrid();
    grid.classList.remove("swapping");
  }, 220);
}

/* ---------- WORK GRID ---------- */
let gridFirstRenderDone = false;

/* the stacked blur that softens the bottom of every thumbnail */
const THUMB_FADE = `<div class="thumb-fade" aria-hidden="true"><div></div><div></div><div></div></div>`;
const IG_GLYPH = `<svg class="ig-glyph" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor"/></svg>`;

function thumbHTML(item){
  const title = esc(item.title);

  // photo album: cover is the first image, the rest stack behind it for the
  // hover preview, plus a photo-count badge
  if(item.images && item.images.length){
    const shots = item.images.slice(0, 6);
    const layers = shots.map((src, i) =>
      `<img class="album-shot${i === 0 ? " is-active" : ""}" src="${esc(src)}" alt="${i === 0 ? title : ""}">`
    ).join("");
    const cover = shots[0] ? layers : `<div class="ph"></div>`;
    return `${cover}${THUMB_FADE}<span class="count-badge">${item.images.length} photo${item.images.length===1?"":"s"}</span>`;
  }

  // an explicit cover always wins
  if(item.image){
    const play = (item.video || item.instagram) ? `<div class="play"></div>` : "";
    return `<img src="${esc(item.image)}" alt="${title}">${THUMB_FADE}${play}`;
  }

  // YouTube is the one service that hands out a still for free
  const auto = autoThumb(item);
  if(auto){
    return `<img src="${esc(auto)}" alt="${title}">${THUMB_FADE}<div class="play"></div>`;
  }

  // Instagram refuses to hand out thumbnails to other sites without an
  // access token, so an IG item with no "image" gets a branded card
  if(item.instagram){
    return `<div class="ph"></div><div class="ig-cover">${IG_GLYPH}<span>View on Instagram</span></div>${THUMB_FADE}`;
  }

  // Drive and other players: grain placeholder with a play badge
  if(item.video){
    return `<div class="ph"></div>${THUMB_FADE}<div class="play"></div>`;
  }
  return `<div class="ph"></div>${THUMB_FADE}`;
}

/* hovering an album card riffles through its photos */
function attachAlbumPreview(card, item){
  if(!(item.images && item.images.length > 1)) return;
  const shots = card.querySelectorAll(".album-shot");
  if(shots.length < 2) return;
  let i = 0, timer = null;
  function show(n){
    shots[i].classList.remove("is-active");
    i = n % shots.length;
    shots[i].classList.add("is-active");
  }
  card.addEventListener("mouseenter", () => {
    if(reducedMotion() || timer) return;
    timer = setInterval(() => show(i + 1), 900);
  });
  card.addEventListener("mouseleave", () => {
    clearInterval(timer); timer = null;
    show(0);
  });
}

function renderGrid(){
  const grid = document.getElementById("work-grid");
  grid.innerHTML = "";
  const items = CONTENT.work.filter(w => w.category === activeCategory);
  if(items.length === 0){
    grid.appendChild(el("p", "grid-empty", "No projects in this category yet — add one in content.js."));
    return;
  }
  items.forEach((item, i) => {
    const card = el("div", "card");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    if(!gridFirstRenderDone){
      card.classList.add("reveal");
      card.style.setProperty("--d", `${i * 0.08}s`);
    }
    const cue = item.images && item.images.length ? "View"
      : item.instagram ? "Watch"
      : item.video ? "Play" : "View";
    card.setAttribute("data-cursor", cue);
    const accent = ACCENT_BY_CATEGORY[item.category] || "var(--accent)";
    card.innerHTML = `
      <div class="card-thumb" style="background:linear-gradient(150deg, ${accent}, #08090b 78%)">
        ${thumbHTML(item)}
      </div>
      <div class="card-body">
        <p class="card-cat">${esc(labelFor(item.category))}</p>
        <p class="card-title">${esc(item.title)}</p>
        <p class="card-meta">${esc(item.role)} · ${esc(item.year)}</p>
      </div>`;
    card.addEventListener("click", () => openModal(item));
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openModal(item); }
    });
    attachAlbumPreview(card, item);
    grid.appendChild(card);
  });
  if(!gridFirstRenderDone) initScrollReveal();
}

function labelFor(catId){
  const c = CONTENT.categories.find(c => c.id === catId);
  return c ? c.label : catId;
}

/* ============================================================
   MODAL — three modes: a single video/still, an Instagram embed,
   or a photo album that plays itself as a slideshow.
   ============================================================ */
let lastFocused = null;

const album = {
  images: [],
  index: 0,
  playing: false,
  raf: null,
  startedAt: 0,
  hold: 4000,      // ms per slide
  paused: false,
};

function openModal(item){
  const modal = document.getElementById("modal");
  lastFocused = document.activeElement;
  document.getElementById("modal-cat").textContent = labelFor(item.category);
  document.getElementById("modal-title").textContent = item.title;
  document.getElementById("modal-meta").textContent = `${item.role} · ${item.year}`;
  document.getElementById("modal-desc").textContent = item.description || "";

  const singleWrap = document.getElementById("modal-single");
  const embedWrap = document.getElementById("modal-embed");
  const albumWrap = document.getElementById("modal-album");
  singleWrap.style.display = "none";
  embedWrap.style.display = "none";
  albumWrap.style.display = "none";
  stopAlbum();

  const igSrc = instagramEmbed(item.instagram);

  if(item.images && item.images.length){
    albumWrap.style.display = "block";
    startAlbum(item.images);
  } else if(igSrc){
    embedWrap.style.display = "block";
    document.getElementById("ig-frame").innerHTML =
      `<iframe src="${esc(igSrc)}" title="${esc(item.title)}" scrolling="no" allowtransparency="true" allowfullscreen></iframe>`;
  } else {
    singleWrap.style.display = "block";
    const thumb = document.getElementById("modal-thumb");
    const accent = ACCENT_BY_CATEGORY[item.category] || "var(--accent)";
    const videoSrc = resolveVideo(item.video);
    if(videoSrc){
      thumb.style.background = "none";
      thumb.innerHTML = `<iframe src="${esc(videoSrc)}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" title="${esc(item.title)}"></iframe>`;
    } else if(item.image){
      thumb.style.background = "none";
      thumb.innerHTML = `<img src="${esc(item.image)}" alt="${esc(item.title)}">`;
    } else {
      thumb.style.background = `linear-gradient(150deg, ${accent}, #08090b 78%)`;
      thumb.innerHTML = "";
    }
  }

  const link = document.getElementById("modal-link");
  const href = item.link || item.instagram || null;
  if(href){
    link.href = href;
    link.textContent = item.link ? "View project ↗" : "Open on Instagram ↗";
    link.style.display = "inline-block";
  } else {
    link.style.display = "none";
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.getElementById("modal-close").focus();
}

function closeModal(){
  const modal = document.getElementById("modal");
  if(!modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  stopAlbum();
  // an iframe keeps playing (audio included) even when just hidden with CSS —
  // clearing it out is what actually stops playback
  document.getElementById("modal-thumb").innerHTML = "";
  document.getElementById("ig-frame").innerHTML = "";
  document.getElementById("album-main").innerHTML = "";
  if(lastFocused && lastFocused.focus) lastFocused.focus();
}

/* ---------- ALBUM SLIDESHOW ---------- */
function startAlbum(images){
  album.images = images;
  album.index = 0;
  album.paused = false;
  renderAlbumFrame();
  buildAlbumThumbs();
  // autoplay is motion the visitor didn't ask for, so reduced-motion sits still
  album.playing = !reducedMotion() && images.length > 1;
  syncToggle();
  if(album.playing) tickAlbum(true);
}

function stopAlbum(){
  album.playing = false;
  if(album.raf) cancelAnimationFrame(album.raf);
  album.raf = null;
  album.images = [];
  setBar(0);
}

function tickAlbum(restart){
  if(restart) album.startedAt = performance.now();
  if(album.raf) cancelAnimationFrame(album.raf);
  const step = (now) => {
    if(!album.playing){ album.raf = null; return; }
    if(album.paused){ album.startedAt = now - 0; setBar(0); album.raf = requestAnimationFrame(step); return; }
    const p = Math.min((now - album.startedAt) / album.hold, 1);
    setBar(p);
    if(p >= 1){
      goAlbum(album.index + 1, false);
      album.startedAt = now;
    }
    album.raf = requestAnimationFrame(step);
  };
  album.raf = requestAnimationFrame(step);
}

function setBar(p){
  const bar = document.getElementById("album-bar");
  if(bar) bar.style.transform = `scaleX(${p})`;
}

function goAlbum(n, fromUser){
  if(!album.images.length) return;
  album.index = (n + album.images.length) % album.images.length;
  renderAlbumFrame();
  markAlbumThumb();
  if(fromUser && album.playing) tickAlbum(true); // manual nav restarts the dwell
}

function renderAlbumFrame(){
  const main = document.getElementById("album-main");
  const src = album.images[album.index];
  const img = el("img");
  img.src = src;
  img.alt = `Photo ${album.index + 1} of ${album.images.length}`;
  // crossfade: the outgoing frame fades while the new one fades in on top
  const prev = main.querySelector("img");
  main.appendChild(img);
  requestAnimationFrame(() => img.classList.add("is-in"));
  if(prev){
    prev.classList.add("is-out");
    setTimeout(() => prev.remove(), 600);
  }
  const count = document.getElementById("album-count");
  if(count) count.textContent = `${album.index + 1} / ${album.images.length}`;
}

function buildAlbumThumbs(){
  const thumbs = document.getElementById("album-thumbs");
  thumbs.innerHTML = "";
  album.images.forEach((src, i) => {
    const img = el("img", i === album.index ? "active" : "");
    img.src = src;
    img.alt = `Thumbnail ${i + 1}`;
    img.setAttribute("data-cursor", "View");
    img.addEventListener("click", () => goAlbum(i, true));
    thumbs.appendChild(img);
  });
}

function markAlbumThumb(){
  const thumbs = document.querySelectorAll("#album-thumbs img");
  thumbs.forEach((t, i) => t.classList.toggle("active", i === album.index));
  const active = thumbs[album.index];
  if(active && active.scrollIntoView) active.scrollIntoView({ block: "nearest", inline: "center", behavior: reducedMotion() ? "auto" : "smooth" });
}

function syncToggle(){
  const btn = document.getElementById("album-toggle");
  if(!btn) return;
  const single = album.images.length < 2;
  btn.style.display = single ? "none" : "inline-flex";
  btn.classList.toggle("is-paused", !album.playing);
  btn.setAttribute("aria-label", album.playing ? "Pause slideshow" : "Play slideshow");
  btn.setAttribute("data-cursor", album.playing ? "Pause" : "Play");
}

function toggleAlbum(){
  if(album.images.length < 2) return;
  album.playing = !album.playing;
  syncToggle();
  if(album.playing) tickAlbum(true); else { if(album.raf) cancelAnimationFrame(album.raf); album.raf = null; setBar(0); }
}

function initAlbumControls(){
  const stage = document.getElementById("album-stage");
  document.getElementById("album-prev").addEventListener("click", () => goAlbum(album.index - 1, true));
  document.getElementById("album-next").addEventListener("click", () => goAlbum(album.index + 1, true));
  document.getElementById("album-toggle").addEventListener("click", toggleAlbum);

  // hovering holds the current frame so a visitor can actually look at it
  stage.addEventListener("mouseenter", () => { album.paused = true; });
  stage.addEventListener("mouseleave", () => { album.paused = false; album.startedAt = performance.now(); });

  // swipe on touch
  let x0 = null;
  stage.addEventListener("touchstart", (e) => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if(x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if(Math.abs(dx) > 40) goAlbum(album.index + (dx < 0 ? 1 : -1), true);
    x0 = null;
  }, { passive: true });
}

/* ---------- HISTORY ---------- */
function renderHistory(){
  const wrap = document.getElementById("timeline");
  wrap.innerHTML = "";
  CONTENT.history.forEach((h, i) => {
    const item = el("div", "tl-item reveal");
    item.style.setProperty("--d", `${i * 0.12}s`);
    item.innerHTML = `
      <span class="tl-time">${esc(h.time)}</span>
      <p class="tl-title">${esc(h.title)}</p>
      <p class="tl-body">${esc(h.body)}</p>`;
    wrap.appendChild(item);
  });
}

/* ---------- ABOUT ---------- */
function renderAbout(){
  const wrap = document.getElementById("about-text");
  wrap.innerHTML = CONTENT.about.paragraphs.map(p => `<p>${esc(p)}</p>`).join("");

  const caption = document.getElementById("portrait-caption");
  if(caption){
    const text = CONTENT.about.caption || "";
    caption.textContent = text;
    if(!text) caption.style.display = "none";
  }

  renderPortrait();

  const chips = document.getElementById("kit-chips");
  chips.innerHTML = "";
  const kit = CONTENT.about.kit || [];
  // render the list twice back-to-back so the marquee can loop seamlessly at -50%
  kit.concat(kit).forEach((k, i) => {
    const isDup = i >= kit.length;
    const chip = el("span", "chip" + (isDup ? " dup" : ""), esc(k));
    if(isDup) chip.setAttribute("aria-hidden", "true");
    chips.appendChild(chip);
  });
}

function renderPortrait(){
  const src = CONTENT.about && CONTENT.about.portrait;
  if(!src) return;
  const frame = document.getElementById("portrait");
  if(!frame) return;
  const img = new Image();
  img.alt = CONTENT.name || "Portrait";
  img.addEventListener("load", () => {
    const placeholder = frame.querySelector("span");
    if(placeholder) placeholder.remove();
    frame.prepend(img);
  });
  img.src = src;
}

/* ---------- CONTACT ---------- */
function renderContact(){
  const email = document.getElementById("contact-email");
  email.textContent = CONTENT.contact.email;
  email.href = `mailto:${CONTENT.contact.email}`;
  const socials = document.getElementById("socials");
  socials.innerHTML = "";
  CONTENT.contact.socials.forEach(s => {
    const a = el("a", null, esc(s.label));
    a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("data-cursor", "Open");
    socials.appendChild(a);
  });
  document.getElementById("year").textContent = new Date().getFullYear();
}

/* ---------- HEADER / NAME ---------- */
function renderHeader(){
  document.title = `${CONTENT.name} — ${CONTENT.role}`;
}

/* ---------- MOBILE MENU ---------- */
function initMenu(){
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  if(!burger || !menu) return;

  function setOpen(open){
    menu.classList.toggle("open", open);
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
  }

  burger.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") setOpen(false); });
  // the desktop nav takes over past this width — don't strand an open overlay
  window.matchMedia("(min-width: 820px)").addEventListener("change", (e) => {
    if(e.matches) setOpen(false);
  });
}

/* ---------- TIMECODE (ambient detail, respects reduced motion) ---------- */
function startTimecode(){
  const node = document.getElementById("timecode");
  if(reducedMotion()) return;
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
    stat.innerHTML = `<div class="stat-value" ${numPart ? `data-target="${numPart}" data-suffix="${esc(suffix)}"` : ""}>${numPart ? "0" + esc(suffix) : esc(s.value)}</div><div class="stat-label">${esc(s.label)}</div>`;
    wrap.appendChild(stat);
  });
}

function initStatsCountUp(){
  const section = document.getElementById("stats");
  if(!section) return;
  const values = section.querySelectorAll(".stat-value[data-target]");
  if(!values.length) return;
  if(reducedMotion()){
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

/* ============================================================
   HERO MOTION (GSAP)
   If GSAP fails to load, or the visitor asked for reduced motion,
   we fall back to the CSS-only intro and everything still works.
   ============================================================ */
function initHeroMotion(){
  const gate = document.getElementById("gate");
  const hasGsap = typeof window.gsap !== "undefined";

  if(!hasGsap || reducedMotion()){
    gate.classList.add("intro-play");   // CSS fallback
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gate.classList.add("js-motion");

  const cards = gsap.utils.toArray("#collage .col-card");
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // 1. the cards get dealt out of a stack in the middle into the arc
  cards.forEach((card) => {
    const slot = card.parentElement;
    const r = getComputedStyle(slot).getPropertyValue("--r").trim() || "0deg";
    gsap.set(card, { rotation: r });
  });
  tl.from(cards, {
    x: () => gsap.utils.random(-40, 40),
    y: () => window.innerHeight * 0.34,
    rotation: 0,
    scale: 0.55,
    opacity: 0,
    duration: 1.25,
    stagger: { each: 0.055, from: "center" },
    ease: "power4.out",
  }, 0);

  // 2. the wordmark slides up out of its clipping line
  tl.from(".wm-inner", {
    yPercent: 115,
    duration: 1.05,
    stagger: 0.09,
    ease: "power4.out",
  }, 0.35);

  // 3. everything under it settles in
  tl.from([".slate", ".gate-role", ".gate-blurb-wrap", ".gate-question", ".reel"], {
    y: 22, opacity: 0, duration: 0.8, stagger: 0.07,
  }, 0.7);

  // A from() tween starts its targets at opacity 0, so if the timeline were
  // ever prevented from finishing the hero would be left blank. requestAnimation-
  // Frame throttles in a background tab, which stalls it legitimately — GSAP
  // resumes on its own once the tab is looked at, but this guarantees it.
  const failsafe = setTimeout(() => {
    if(document.visibilityState === "visible" && tl.progress() < 1) tl.progress(1);
  }, 6000);
  tl.eventCallback("onComplete", () => {
    clearTimeout(failsafe);
    // hand the elements back to CSS once the intro has played
    gsap.set([".slate", ".gate-role", ".gate-blurb-wrap", ".gate-question", ".reel", ".wm-inner"],
      { clearProps: "opacity,transform" });
  });

  // 4. cards keep breathing once they've landed — each on its own clock
  cards.forEach((card, i) => {
    gsap.to(card, {
      yPercent: gsap.utils.random(-7, -3),
      rotation: "+=" + gsap.utils.random(1.2, 2.6),
      duration: gsap.utils.random(3.2, 5.4),
      delay: 1.2 + i * 0.09,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  });

  // 5. mouse parallax — quickTo keeps it smooth instead of jumpy
  const inner = document.querySelector(".collage-inner");
  if(inner && window.matchMedia("(pointer: fine)").matches){
    const xTo = gsap.quickTo(inner, "x", { duration: 0.7, ease: "power3" });
    const yTo = gsap.quickTo(inner, "y", { duration: 0.7, ease: "power3" });
    gate.addEventListener("mousemove", (e) => {
      const rect = gate.getBoundingClientRect();
      xTo(((e.clientX - rect.left) / rect.width - 0.5) * -46);
      yTo(((e.clientY - rect.top) / rect.height - 0.5) * -30);
    });
    gate.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
  }

  // 6. scrolling away pushes the arc down and back, and lifts the text out
  gsap.to(".collage-scroll", {
    yPercent: 16, scale: 1.14, ease: "none",
    scrollTrigger: { trigger: gate, start: "top top", end: "bottom top", scrub: 0.6 },
  });
  gsap.to(".gate-inner", {
    yPercent: -14, opacity: 0.15, ease: "none",
    scrollTrigger: { trigger: gate, start: "top top", end: "bottom top", scrub: 0.6 },
  });
}

/* ---------- CUSTOM CURSOR ---------- */
function initCustomCursor(){
  if(!window.matchMedia("(pointer: fine)").matches) return; // touch devices: skip entirely

  const reduced = reducedMotion();

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
  const targets = document.querySelectorAll(".reveal:not(.in-view)");
  if(reducedMotion()){
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
  const reduced = reducedMotion();
  const holdTime = reduced ? 150 : 1250; // let the clap animation actually finish before hiding

  setTimeout(() => {
    loader.classList.add("hide");
    initHeroMotion();
    setTimeout(() => {
      loader.remove();
      document.documentElement.classList.remove("is-loading");
      // The hero timeline is built while the loader still has the page pinned
      // with overflow:hidden, so ScrollTrigger measured a document that could
      // not scroll. Now that it can, make it measure again — otherwise the
      // hero parallax starts and ends at the wrong scroll positions.
      if(window.ScrollTrigger) ScrollTrigger.refresh();
    }, reduced ? 200 : 650);
  }, holdTime);
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("is-loading");
  renderHeader();
  renderGate();
  initTicker();
  buildCollage();
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
  initMenu();
  initAlbumControls();
  gridFirstRenderDone = true;

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if(e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeModal();
    const modalOpen = document.getElementById("modal").classList.contains("open");
    if(modalOpen && album.images.length){
      if(e.key === "ArrowLeft") goAlbum(album.index - 1, true);
      if(e.key === "ArrowRight") goAlbum(album.index + 1, true);
    }
  });
});
