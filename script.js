/* ============================================================
   Renders the whole page from CONTENT (see content.js).
   You should not need to edit this file to update your site —
   edit content.js instead.
   ============================================================ */

window.__tkReady = true;

let activeCategory = "all";

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

function isNarrow(){
  return window.matchMedia("(max-width: 760px)").matches;
}

/* "ROLE" -> "Role", so labels typed in capitals still read as sentence case */
function sentenceCase(str){
  const s = String(str || "").trim();
  if(s && s === s.toUpperCase()) return s.charAt(0) + s.slice(1).toLowerCase();
  return s;
}

/* an album photo can be a plain path or { src, caption }; keep the paths in
   "images" (everything else reads those) and the titles alongside in "captions" */
function normalizeAlbums(){
  (CONTENT.work || []).forEach(w => {
    if(!Array.isArray(w.images)) return;
    const shots = w.images.filter(p => p && (typeof p === "string" || p.src));
    w.captions = shots.map(p => (typeof p === "object" && p.caption) || "");
    w.images = shots.map(p => typeof p === "object" ? p.src : p);
  });
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
  const m = String(url).match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
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

function isVideoFile(url){
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(url));
}

function instagramEmbed(url){
  const code = getInstagramCode(url);
  return code ? `https://www.instagram.com/p/${code}/embed` : null;
}

/* the best still we have for a piece of work, or null.
   YouTube hands out thumbnails freely; Drive and Instagram do not. */
function coverFor(item){
  if(item.images && item.images.length && item.images[0]) return item.images[0];
  if(item.image) return item.image;
  const yt = getYouTubeId(item.video);
  if(yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

function labelFor(catId){
  const c = CONTENT.categories.find(c => c.id === catId);
  return c ? c.label : catId;
}

/* ============================================================
   DRAWN COVERS
   Until a piece has a real still, it gets a flat drawing of its
   own kind of work: a timeline for edits, a framed view for
   photography, a letterboxed shot for films. The drawing is seeded
   by the title, so each piece always gets the same one.
   ============================================================ */
function seeded(str){
  let h = 2166136261;
  for(const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function drawCover(item, w, h){
  const r = seeded(item.title + item.category);
  const INK = "#0b0b0d", SOFT = "#3a2a4a", BG = "#f4f1ea", SURF = "#1d1b22", ACC = "#ff5a1f";
  let body = "";

  if(item.category === "photography"){
    const sunX = w * (0.3 + r() * 0.4), sunY = h * (0.3 + r() * 0.15), sunR = w * (0.14 + r() * 0.06);
    const hz = h * (0.58 + r() * 0.08);
    body += `<rect width="${w}" height="${h}" fill="${SURF}"/>`;
    body += `<circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${ACC}"/>`;
    let hills = `M0 ${hz}`;
    for(let x = 0; x <= w; x += w / 6) hills += ` L${x} ${hz - r() * h * 0.08}`;
    body += `<path d="${hills} L${w} ${h} L0 ${h}Z" fill="${SOFT}"/>`;
    body += `<rect y="${hz + h * 0.1}" width="${w}" height="${h}" fill="${INK}"/>`;
  } else if(item.category === "films"){
    const bar = h * 0.17;
    const hz = h * (0.55 + r() * 0.1);
    body += `<rect width="${w}" height="${h}" fill="${SURF}"/>`;
    body += `<circle cx="${w * (0.2 + r() * 0.6)}" cy="${hz}" r="${w * 0.16}" fill="${ACC}"/>`;
    body += `<rect y="${hz}" width="${w}" height="${h}" fill="${SOFT}"/>`;
    const fx = w * (0.25 + r() * 0.5);
    body += `<rect x="${fx}" y="${hz - h * 0.16}" width="${w * 0.035}" height="${h * 0.16}" fill="${INK}"/>`;
    body += `<circle cx="${fx + w * 0.0175}" cy="${hz - h * 0.18}" r="${w * 0.028}" fill="${INK}"/>`;
    body += `<rect width="${w}" height="${bar}" fill="${INK}"/><rect y="${h - bar}" width="${w}" height="${bar}" fill="${INK}"/>`;
  } else {
    // an edit timeline: clips on stacked tracks, a waveform, the playhead
    body += `<rect width="${w}" height="${h}" fill="${ACC}"/>`;
    const tracks = 4, th = h * 0.065, top = h * 0.3;
    for(let t = 0; t < tracks; t++){
      let x = -r() * 40;
      const y = top + t * (th + h * 0.025);
      while(x < w){
        const cw = 26 + r() * w * 0.32;
        if(r() > 0.18){
          const fill = t < 2 ? (r() > 0.4 ? INK : SOFT) : (r() > 0.5 ? SOFT : BG);
          body += `<rect x="${x}" y="${y}" width="${cw}" height="${th}" fill="${fill}"/>`;
        }
        x += cw + 5;
      }
    }
    const wy = top + tracks * (th + h * 0.025) + h * 0.06, bars = 34, bw = w / bars;
    for(let b = 0; b < bars; b++){
      const bh = (0.2 + r() * 0.8) * h * 0.12;
      body += `<rect x="${b * bw + bw * 0.2}" y="${wy + (h * 0.12 - bh) / 2}" width="${bw * 0.6}" height="${bh}" fill="${SOFT}"/>`;
    }
    const px = w * (0.35 + r() * 0.3);
    body += `<rect x="${px}" y="${top - h * 0.06}" width="4" height="${h * 0.55}" fill="${INK}"/>`;
    body += `<path d="M${px - 10} ${top - h * 0.06}h24l-12 14z" fill="${INK}"/>`;
  }
  const wrap = el("div", "drawn");
  wrap.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
  return wrap;
}

/* a real still if one loads, otherwise the drawn cover.
   A wrong image path leaves the drawing rather than a broken icon. */
function pictureFor(item, w, h, alt){
  const drawn = drawCover(item, w, h);
  const src = coverFor(item);
  if(!src) return drawn;
  const img = new Image();
  img.alt = alt || "";
  img.decoding = "async";
  img.addEventListener("load", () => {
    img.className = drawn.className;
    drawn.replaceWith(img);
  });
  img.src = src;
  return drawn;
}

/* ============================================================
   FIT TEXT
   The name, the email and the "Roles" word are set to fill their
   width exactly, whatever the words are.
   ============================================================ */
function fitLines(container, lines, maxPx){
  const avail = container.clientWidth;
  if(!avail) return;
  container.style.fontSize = "100px";
  const widest = Math.max(...lines.map(l => l.getBoundingClientRect().width));
  if(!widest) return;
  const size = Math.min((100 * avail) / widest * 0.995, maxPx || Infinity);
  container.style.fontSize = `${size}px`;
}

/* ---------- HERO ---------- */
function renderName(){
  const h1 = document.getElementById("name");
  const custom = (CONTENT.wordmark || "").trim();
  const raw = custom || (CONTENT.name || "").trim();
  const parts = raw.split(/\s+/);
  const lines = isNarrow() && parts.length > 1
    ? [parts.slice(0, -1).join(" "), parts[parts.length - 1]]
    : [raw];
  h1.setAttribute("aria-label", `${CONTENT.name}, ${CONTENT.role}`);
  h1.innerHTML = lines.map(l =>
    `<span class="name-line" aria-hidden="true"><span class="name-inner">${esc(l)}</span></span>`).join("");
}

function fitName(){
  const h1 = document.getElementById("name");
  const inners = [...h1.querySelectorAll(".name-inner")];
  // a short wordmark like "TK" shouldn't swallow the whole screen
  fitLines(h1, inners, window.innerHeight * (isNarrow() ? 0.3 : 0.32));
}

function renderSlate(){
  const wrap = document.getElementById("slate");
  const rows = (CONTENT.hero && CONTENT.hero.slate) || [];
  if(!rows.length){ wrap.style.display = "none"; return; }
  wrap.innerHTML = rows.map(r => {
    const isStatus = /status/i.test(r.label);
    const dot = isStatus ? `<span class="status-dot" aria-hidden="true"></span>` : "";
    return `<div><dt>${esc(sentenceCase(r.label))}</dt><dd>${dot}${esc(r.value)}</dd></div>`;
  }).join("");
}

/* the photos the hero builds out of particles (particles.js reads this list).
   hero.photos in content.js picks them; otherwise every album photo is used. */
function heroPhotos(){
  const picked = (CONTENT.hero && CONTENT.hero.photos) || [];
  if(picked.length) return picked.map(p => typeof p === "string" ? { src: p, title: "" } : p);
  const out = [];
  (CONTENT.work || []).forEach(w => (w.images || []).forEach(src => out.push({ src, title: w.title })));
  return out;
}

function renderHero(){
  renderName();
  renderSlate();
  // the role plus where he works, so the first screen says plainly what this is
  const based = ((CONTENT.hero && CONTENT.hero.slate) || []).find(r => /based|city|location/i.test(r.label));
  document.getElementById("hero-role").innerHTML =
    esc(CONTENT.role || "") + (based ? `<span>Based in ${esc(based.value)}</span>` : "");
  document.getElementById("hero-blurb").textContent = (CONTENT.hero && CONTENT.hero.blurb) || "";
  // who said it, when the blurb is a quote
  const by = (CONTENT.hero && CONTENT.hero.blurbBy) || "";
  const cite = document.getElementById("hero-blurb-by");
  cite.textContent = by ? `— ${by}` : "";
  cite.hidden = !by;
  document.getElementById("bar-mark").textContent = initials(CONTENT.name);
  window.TK_HERO_PHOTOS = heroPhotos();
}

function initials(name){
  return String(name || "").split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 3);
}

/* ---------- TIMECODE (ambient detail, respects reduced motion) ---------- */
function startTimecode(){
  const node = document.getElementById("timecode");
  if(reducedMotion()){ node.style.display = "none"; return; }
  let frames = 0;
  setInterval(() => {
    if(document.hidden) return;
    frames++;
    const f = frames % 24;
    const totalSec = Math.floor(frames / 24);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    node.textContent = `${h}:${m}:${s}:${String(f).padStart(2, "0")}`;
  }, 1000 / 24);
}

/* ============================================================
   WORK — one screen plays the silent preview of a piece, with its
   details beside it. When a preview ends the next piece starts on
   its own, all the way along. Below, the films and the edits each
   run in a single row you can scroll sideways; pointing at a piece
   puts it on the screen, clicking it (or the screen) opens it to
   watch with sound.
   ============================================================ */
const PHOTO = "photography";
function listWork(){ return CONTENT.work.filter(w => w.category !== PHOTO); }

/* the label on a card: a film's type, or "Edit" */
function groupOf(item){
  if(item.category === "edits") return (item.type || "").trim() || "Edit";
  return (item.type || "").trim() || labelFor(item.category);
}

/* a title, with the fandom tag after it when the piece is a movie edit */
function titleHTML(item){
  return esc(item.title) + (item.fandom ? ` <span class="fandom">(FANDOM EDIT)</span>` : "");
}

/* the categories in page order: films first, then edits */
function workCategories(){
  return CONTENT.categories.filter(c => c.id !== PHOTO)
    .sort((a, b) => (a.id === "films" ? -1 : 0) - (b.id === "films" ? -1 : 0));
}

function renderTabs(){
  const wrap = document.getElementById("tabs");
  wrap.innerHTML = "";
  const work = listWork();
  const chip = (id, label, count) => {
    const btn = el("button", "chip", esc(label));
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(id === activeCategory));
    btn.setAttribute("aria-label", `${label}, ${count} piece${count === 1 ? "" : "s"}`);
    btn.addEventListener("click", () => {
      if(id === activeCategory) return;
      activeCategory = id;
      renderTabs();
      renderWork();
    });
    return btn;
  };
  wrap.appendChild(chip("all", "All", work.length));
  workCategories().forEach(c => wrap.appendChild(chip(c.id, c.label, work.filter(w => w.category === c.id).length)));
}

function actionFor(item){
  if(item.images && item.images.length) return `View album, ${item.images.length} photo${item.images.length === 1 ? "" : "s"}`;
  if(item.instagram) return "Watch the post";
  if(item.video) return "Play";
  return "Read more";
}

/* the order pieces play in on the screen, and their cards */
let playlist = [];

function renderWork(){
  const reels = document.getElementById("reels");
  reels.innerHTML = "";
  playlist = [];
  const work = listWork();
  const sections = workCategories()
    .filter(c => activeCategory === "all" || c.id === activeCategory)
    .map(c => ({ label: c.label, items: work.filter(w => w.category === c.id) }))
    .filter(s => s.items.length);

  if(!sections.length){
    reels.appendChild(el("p", "work-empty", "Nothing here yet."));
    showOnScreen(null);
    return;
  }

  sections.forEach(sec => {
    const block = el("section", "reel-section");
    // a heading per section only when more than one is showing
    if(sections.length > 1){
      block.appendChild(el("h3", "reel-head rv", `${esc(sec.label)}<span>${sec.items.length}</span>`));
    }
    const row = el("ul", "reels");
    sec.items.forEach((item, i) => {
      const li = el("li", "rv");
      li.style.setProperty("--d", `${Math.min(i, 5) * 60}ms`);
      const btn = el("button", "clip");
      btn.type = "button";
      btn.setAttribute("aria-label", `${item.title}${item.fandom ? ", fandom edit" : ""}, ${groupOf(item)}, ${item.year}. ${actionFor(item)}`);
      const thumb = el("span", "clip-thumb");
      thumb.appendChild(pictureFor(item, 640, 360, ""));
      thumb.insertAdjacentHTML("beforeend", `<span class="clip-progress" aria-hidden="true"></span>`);
      btn.appendChild(thumb);
      btn.insertAdjacentHTML("beforeend",
        `<span class="clip-kind">${esc(groupOf(item))}<span>${esc(item.year)}</span></span>` +
        `<span class="clip-title">${titleHTML(item)}</span>`);
      const entry = { item, btn, row };
      btn.addEventListener("pointerenter", () => play(entry, true));
      btn.addEventListener("focus", () => play(entry, true));
      btn.addEventListener("click", () => openModal(item));
      li.appendChild(btn);
      row.appendChild(li);
      playlist.push(entry);
    });
    block.appendChild(row);
    initDragRow(row);
    reels.appendChild(block);
  });

  play(playlist[0], false);
  if(document.documentElement.classList.contains("is-ready")) initReveal();
}

/* put a piece on the screen and mark its card; the row slides so the card is in view */
let nowPlaying = null;
function play(entry, fromPointer){
  if(!entry) return;
  nowPlaying = entry;
  playlist.forEach(e => e.btn.classList.toggle("is-current", e === entry));
  showOnScreen(entry.item);
  if(!fromPointer){
    const target = entry.btn.parentElement.offsetLeft - 24;
    entry.row.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? "auto" : "smooth" });
  }
}

/* when a preview ends (or a still has been up for a while), the next piece follows */
function playNext(){
  if(!playlist.length) return;
  const i = playlist.indexOf(nowPlaying);
  play(playlist[(i + 1) % playlist.length], false);
}

/* the big screen: the silent preview plays once and hands over to the next
   piece; a piece with no video shows its cover for a few seconds. A new piece
   fades in over the last one. */
let screenItem = null, stillTimer = null;
const STILL_HOLD = 5000;
function showOnScreen(item){
  const media = document.getElementById("screen-media");
  const info = document.getElementById("screen-info");
  const screen = document.getElementById("screen");
  if(item === screenItem) return;
  screenItem = item;
  clearTimeout(stillTimer);
  if(!item){ media.innerHTML = ""; info.innerHTML = ""; screen.hidden = true; return; }
  screen.hidden = false;

  // a short silent "preview" clip wins; otherwise a video kept with the site plays itself
  const own = resolveVideo(item.video);
  const src = item.preview || (own && isVideoFile(own) ? own : null);
  let layer;
  if(src && !reducedMotion()){
    layer = document.createElement("video");
    layer.muted = true;
    layer.playsInline = true;
    layer.preload = "auto";
    if(item.image) layer.poster = item.image;
    layer.setAttribute("aria-hidden", "true");
    // hand over to the next piece once, however the end is reached
    let done = false;
    const finish = () => { if(done || screenItem !== item) return; done = true; playNext(); };
    layer.addEventListener("loadedmetadata", () => {
      // a full video opens on its livelier last stretch rather than the first frame
      if(!item.preview && layer.duration > 8) layer.currentTime = layer.duration * 0.75;
      layer.play().catch(() => {});
      // a stalled or blocked video still moves on after its own length plus a little
      const left = (layer.duration - layer.currentTime) * 1000;
      clearTimeout(stillTimer);
      stillTimer = setTimeout(finish, Math.max(STILL_HOLD, left + 2500));
    }, { once: true });
    layer.addEventListener("timeupdate", () => {
      if(!layer.duration) return;
      setProgress(item, layer.currentTime / layer.duration);
      if(layer.currentTime >= layer.duration - 0.12) finish();
    });
    layer.addEventListener("ended", finish);
    layer.addEventListener("error", () => { clearTimeout(stillTimer); stillTimer = setTimeout(finish, STILL_HOLD); });
    layer.src = src;
  } else {
    layer = pictureFor(item, 1280, 720, "");
    if(!reducedMotion()) stillTimer = setTimeout(() => { if(screenItem === item) playNext(); }, STILL_HOLD);
  }
  layer.classList.add("screen-layer");
  media.appendChild(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add("is-on")));
  // let the old picture fade, then drop it (which also stops its video)
  [...media.children].forEach(n => { if(n !== layer){ n.classList.remove("is-on"); setTimeout(() => n.remove(), 450); } });

  screen.onclick = () => openModal(item);
  screen.setAttribute("aria-label", `${actionFor(item)}: ${item.title}`);
  info.innerHTML = `
    <p class="screen-kind">${esc(groupOf(item))}<span>${esc(item.year)}</span></p>
    <h3 class="screen-title">${titleHTML(item)}</h3>
    <p class="screen-role">${esc(item.role)}</p>
    ${item.description ? `<p class="screen-desc">${esc(item.description)}</p>` : ""}
    <button class="btn screen-btn" type="button">${esc(actionFor(item))}</button>`;
  info.querySelector(".screen-btn").addEventListener("click", () => openModal(item));
}

/* a thin bar under the playing card shows how far its preview has run */
function setProgress(item, p){
  const e = playlist.find(x => x.item === item);
  if(e) e.btn.querySelector(".clip-progress").style.transform = `scaleX(${p.toFixed(3)})`;
  playlist.forEach(x => { if(x.item !== item) x.btn.querySelector(".clip-progress").style.transform = "scaleX(0)"; });
}

/* a row can be dragged sideways with a mouse, as well as scrolled or swiped */
function initDragRow(row){
  let down = null, moved = false;
  row.addEventListener("pointerdown", (e) => {
    if(e.pointerType !== "mouse" || e.button !== 0) return;
    down = { x: e.clientX, left: row.scrollLeft }; moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if(!down) return;
    const dx = e.clientX - down.x;
    if(Math.abs(dx) > 6){ moved = true; row.classList.add("is-dragging"); }
    if(moved) row.scrollLeft = down.left - dx;
  });
  window.addEventListener("pointerup", () => { down = null; setTimeout(() => row.classList.remove("is-dragging"), 0); });
  // a drag should not also open the piece it ended on
  row.addEventListener("click", (e) => { if(moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
}

/* ============================================================
   PHOTOGRAPHY — each album is a small stack of prints in a row
   you can scroll or drag sideways. Pointing at a stack fans the
   prints out and leafs through the album; clicking opens it as
   the slideshow.
   ============================================================ */
function renderPhotos(){
  const row = document.getElementById("photos-row");
  const section = document.getElementById("photography");
  const albums = CONTENT.work.filter(w => w.category === PHOTO && w.images && w.images.length);
  if(!albums.length){ section.hidden = true; return; }
  row.innerHTML = "";
  albums.forEach((album, i) => {
    const li = el("li", "stack-item rv");
    li.style.setProperty("--d", `${Math.min(i, 4) * 70}ms`);
    const btn = el("button", "stack");
    btn.type = "button";
    btn.setAttribute("aria-label", `${album.title}, ${album.images.length} photos. Open the album`);
    // three prints: the cover on top, the next two tucked underneath
    const prints = album.images.slice(0, 3).map((src, k) =>
      `<span class="print print-${k}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></span>`).reverse().join("");
    btn.innerHTML = `
      <span class="stack-prints">${prints}<span class="stack-glow" aria-hidden="true"></span></span>
      <span class="stack-text">
        <span class="stack-title">${esc(album.title)}</span>
        <span class="stack-meta">${album.images.length} photo${album.images.length === 1 ? "" : "s"} · ${esc(album.year)}</span>
      </span>`;
    btn.addEventListener("click", () => openModal(album));
    leafThrough(btn, album);
    tiltOnPointer(btn);
    li.appendChild(btn);
    row.appendChild(li);
  });
  initPhotoRow(row);
}

/* pointing at a stack leafs through the album on the top print */
function leafThrough(btn, album){
  if(album.images.length < 2) return;
  const top = btn.querySelector(".print-0 img");
  let i = 0, timer = null;
  const start = () => {
    if(timer || reducedMotion()) return;
    timer = setInterval(() => {
      i = (i + 1) % album.images.length;
      top.src = album.images[i];
    }, 850);
  };
  const stop = () => { clearInterval(timer); timer = null; i = 0; top.src = album.images[0]; };
  btn.addEventListener("pointerenter", start);
  btn.addEventListener("pointerleave", stop);
  btn.addEventListener("focus", start);
  btn.addEventListener("blur", stop);
}

/* the stack leans toward the cursor, like picking up a print */
function tiltOnPointer(btn){
  if(reducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
  const prints = btn.querySelector(".stack-prints");
  btn.addEventListener("pointermove", (e) => {
    const r = prints.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    prints.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    prints.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
    prints.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    prints.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  btn.addEventListener("pointerleave", () => {
    prints.style.setProperty("--rx", "0deg");
    prints.style.setProperty("--ry", "0deg");
  });
}

/* arrows, and dragging the row sideways with a mouse */
function initPhotoRow(row){
  const by = () => (row.querySelector(".stack-item")?.getBoundingClientRect().width || 400) + 24;
  const go = (dir) => row.scrollBy({ left: dir * by(), behavior: reducedMotion() ? "auto" : "smooth" });
  document.getElementById("photos-prev").onclick = () => go(-1);
  document.getElementById("photos-next").onclick = () => go(1);
  const sync = () => {
    document.getElementById("photos-prev").disabled = row.scrollLeft < 8;
    document.getElementById("photos-next").disabled = row.scrollLeft + row.clientWidth > row.scrollWidth - 8;
  };
  row.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();

  let down = null, moved = false;
  row.addEventListener("pointerdown", (e) => {
    if(e.pointerType !== "mouse" || e.button !== 0) return;
    down = { x: e.clientX, left: row.scrollLeft }; moved = false;
  });
  window.addEventListener("pointermove", (e) => {
    if(!down) return;
    const dx = e.clientX - down.x;
    if(Math.abs(dx) > 6){ moved = true; row.classList.add("is-dragging"); }
    if(moved) row.scrollLeft = down.left - dx;
  });
  window.addEventListener("pointerup", () => {
    down = null;
    setTimeout(() => row.classList.remove("is-dragging"), 0);
  });
  // a drag should not also open the album it ended on
  row.addEventListener("click", (e) => { if(moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
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
  document.getElementById("modal-title").innerHTML = titleHTML(item);
  document.getElementById("modal-meta").textContent = `${labelFor(item.category)} · ${item.role} · ${item.year}`;
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
    startAlbum(item.images, item.captions);
  } else if(igSrc){
    embedWrap.style.display = "block";
    document.getElementById("ig-frame").innerHTML =
      `<iframe src="${esc(igSrc)}" title="${esc(item.title)}" scrolling="no" allowtransparency="true" allowfullscreen></iframe>`;
  } else {
    singleWrap.style.display = "block";
    const thumb = document.getElementById("modal-thumb");
    const videoSrc = resolveVideo(item.video);
    thumb.innerHTML = "";
    if(videoSrc && isVideoFile(videoSrc)){
      // a video file hosted with the site plays in the browser's own player
      thumb.innerHTML = `<video src="${esc(videoSrc)}" controls playsinline preload="metadata"${item.image ? ` poster="${esc(item.image)}"` : ""}></video>`;
    } else if(videoSrc){
      thumb.innerHTML = `<iframe src="${esc(videoSrc)}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" title="${esc(item.title)}"></iframe>`;
    } else {
      thumb.appendChild(pictureFor(item, 1600, 900, item.title));
    }
  }

  const link = document.getElementById("modal-link");
  const href = item.link || item.instagram || null;
  if(href){
    link.href = href;
    link.textContent = item.link ? "View project" : "Open on Instagram";
    link.style.display = "inline-flex";
  } else {
    link.style.display = "none";
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.getElementById("modal-close").focus();
}

function closeModal(){
  const modal = document.getElementById("modal");
  if(!modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  stopAlbum();
  // an iframe keeps playing (audio included) even when just hidden with CSS —
  // clearing it out is what actually stops playback
  document.getElementById("modal-thumb").innerHTML = "";
  document.getElementById("ig-frame").innerHTML = "";
  document.getElementById("album-main").innerHTML = "";
  if(lastFocused && lastFocused.focus) lastFocused.focus();
}

/* keep Tab inside the open dialog */
function trapFocus(e){
  const modal = document.getElementById("modal");
  if(e.key !== "Tab" || !modal.classList.contains("open")) return;
  const focusable = [...modal.querySelectorAll("button, a[href], iframe, img[data-thumb]")]
    .filter(n => n.offsetParent !== null);
  if(!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}

/* ---------- ALBUM SLIDESHOW ---------- */
function startAlbum(images, captions){
  album.images = images;
  album.captions = captions || [];
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
    if(album.paused){ album.startedAt = now; setBar(0); album.raf = requestAnimationFrame(step); return; }
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
  const cap = (album.captions || [])[album.index] || "";
  img.alt = cap || `Photo ${album.index + 1} of ${album.images.length}`;
  document.getElementById("album-caption").textContent = cap;
  // crossfade: the outgoing frame fades while the new one fades in on top
  const prev = main.querySelector("img:not(.is-out)");
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
    img.alt = `Show photo ${i + 1}`;
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("data-thumb", "");
    img.addEventListener("click", () => goAlbum(i, true));
    img.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); goAlbum(i, true); }
    });
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

/* ---------- ABOUT ---------- */
function renderAbout(){
  const paras = CONTENT.about.paragraphs || [];
  document.getElementById("about-lead").textContent = paras[0] || "";
  document.getElementById("about-more").innerHTML = paras.slice(1).map(p => `<p>${esc(p)}</p>`).join("");

  document.getElementById("kit").innerHTML =
    (CONTENT.about.kit || []).map(k => `<li>${esc(k)}</li>`).join("");

  // the portrait (a cut-out on a transparent ground) is drawn by particles.js
  window.TK_PORTRAIT = CONTENT.about.portrait || null;
  const wrap = document.querySelector(".portrait-wrap");
  if(!window.TK_PORTRAIT){
    // no portrait: the story takes the whole width, in two columns
    wrap.hidden = true;
    document.getElementById("about").classList.add("no-portrait");
  }
  else document.getElementById("portrait-stage").setAttribute("aria-label", `${CONTENT.name}. Click to scatter the portrait`);
}

/* ---------- STATS ---------- */
function renderStats(){
  const wrap = document.getElementById("stats");
  const stats = CONTENT.stats || [];
  if(!stats.length){ wrap.style.display = "none"; return; }
  wrap.innerHTML = stats.map(s => {
    const match = String(s.value).match(/^(\d+)(.*)$/); // split "10+" into 10 and "+"
    const attrs = match ? ` data-target="${match[1]}" data-suffix="${esc(match[2])}"` : "";
    return `<div><dt${attrs}>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`;
  }).join("");
}

function initStatsCountUp(){
  const section = document.getElementById("stats");
  const values = section.querySelectorAll("dt[data-target]");
  if(!values.length || reducedMotion()) return;
  values.forEach(v => { v.textContent = "0" + v.dataset.suffix; });
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      values.forEach(v => {
        const target = parseInt(v.dataset.target, 10);
        const suffix = v.dataset.suffix;
        const start = performance.now();
        function tick(now){
          const p = Math.min((now - start) / 900, 1);
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

/* ---------- ROLES ---------- */
function renderHistory(){
  const wrap = document.getElementById("timeline");
  wrap.innerHTML = "";
  CONTENT.history.forEach((h, i) => {
    // a role with a description opens and closes; one without is a plain row
    const hasBody = !!(h.body && h.body.trim());
    const item = el(hasBody ? "details" : "div", "credit rv" + (hasBody ? "" : " credit-static"));
    item.style.setProperty("--d", `${i * 70}ms`);
    if(i === 0) item.open = true;
    item.innerHTML = `
      <${hasBody ? "summary" : "div"} class="credit-row">
        <span class="credit-time">${esc(h.time)}</span>
        <span class="credit-role"><span class="credit-title">${esc(h.title)}</span>${h.org ? `<span class="credit-org">${esc(h.org)}</span>` : ""}</span>
        ${hasBody ? `<span class="plus" aria-hidden="true"></span>` : ""}
      </${hasBody ? "summary" : "div"}>
      ${hasBody ? `<p class="credit-body">${esc(h.body)}</p>` : ""}`;
    wrap.appendChild(item);
  });
}

function fitCreditsWord(){
  const h2 = document.getElementById("credits-title");
  fitLines(h2, [document.getElementById("credits-word")]);
}

/* ---------- CONTACT ---------- */
function renderContact(){
  const email = CONTENT.contact.email || "";
  const a = document.getElementById("contact-email");
  a.href = `mailto:${email}`;
  a.setAttribute("aria-label", `Email ${email}`);
  // long addresses break after the @ onto a second line
  const at = email.indexOf("@");
  const split = at > 0 && (email.length > 26 || isNarrow());
  a.innerHTML = split
    ? `<span aria-hidden="true">${esc(email.slice(0, at + 1))}</span><span aria-hidden="true">${esc(email.slice(at + 1))}</span>`
    : `<span aria-hidden="true">${esc(email)}</span>`;

  const slate = (CONTENT.hero && CONTENT.hero.slate) || [];
  const based = slate.find(r => /based|city|location/i.test(r.label));
  const status = slate.find(r => /status/i.test(r.label));
  document.getElementById("contact-where").textContent =
    [status && status.value, based && based.value].filter(Boolean).join(" · ");

  document.getElementById("socials").innerHTML = (CONTENT.contact.socials || []).map(s =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join("");
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("fine-name").textContent = CONTENT.name;
}

function fitEmail(){
  const a = document.getElementById("contact-email");
  fitLines(a, [...a.querySelectorAll("span")], window.innerHeight * 0.3);
}

/* ---------- TOP BAR: steps aside while reading down, returns on the way up ---------- */
function initBar(){
  const bar = document.querySelector(".bar");
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const down = y > lastY && y > window.innerHeight * 0.6;
    bar.classList.toggle("is-hidden", down && !document.getElementById("modal").classList.contains("open"));
    lastY = y;
  }, { passive: true });
  bar.addEventListener("focusin", () => bar.classList.remove("is-hidden"));
}

/* ---------- ENTRANCES ---------- */
function initReveal(){
  const targets = document.querySelectorAll(".rv:not(.in)");
  if(!("IntersectionObserver" in window)){
    targets.forEach(t => t.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  targets.forEach(t => io.observe(t));
}

/* ---------- FIT EVERYTHING, AND AGAIN ON RESIZE ---------- */
function fitAll(){
  fitName();
  fitCreditsWord();
  fitEmail();
}

let wasNarrow = isNarrow();
function onResize(){
  const narrow = isNarrow();
  if(narrow !== wasNarrow){
    // the name and the email change their line breaks at the phone width
    wasNarrow = narrow;
    renderName();
    renderContact();
    document.documentElement.classList.add("is-ready");
  }
  fitAll();
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.title = `${CONTENT.name} — ${CONTENT.role}`;
  normalizeAlbums();
  renderHero();
  renderTabs();
  renderWork();
  renderPhotos();
  renderAbout();
  renderStats();
  renderHistory();
  renderContact();
  startTimecode();
  initBar();
  initAlbumControls();
  initStatsCountUp();

  fitAll();
  // fonts change the measurements, so fit again once they have arrived
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    fitAll();
    requestAnimationFrame(() => document.documentElement.classList.add("is-ready"));
    initReveal();
  });
  // a face that finishes loading late changes the widths again
  if(document.fonts) document.fonts.addEventListener("loadingdone", fitAll);
  window.addEventListener("load", fitAll);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 120);
  });

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if(e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    trapFocus(e);
    if(e.key === "Escape") closeModal();
    const modalOpen = document.getElementById("modal").classList.contains("open");
    if(modalOpen && album.images.length){
      if(e.key === "ArrowLeft") goAlbum(album.index - 1, true);
      if(e.key === "ArrowRight") goAlbum(album.index + 1, true);
    }
  });
});
