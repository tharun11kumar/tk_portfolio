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
function renderGate(){
  const wrap = document.getElementById("reel-select");
  wrap.innerHTML = "";
  CONTENT.categories.forEach(cat => {
    const btn = el("button", "reel");
    btn.innerHTML = `<span>${cat.label}</span><span class="reel-hint">${cat.hint}</span>`;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      renderTabs();
      renderGrid();
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
      activeCategory = cat.id;
      renderTabs();
      renderGrid();
    });
    wrap.appendChild(btn);
  });
}

/* ---------- WORK GRID ---------- */
function thumbHTML(item){
  if(item.image){
    return `<img src="${item.image}" alt="${item.title}">`;
  }
  const showPlay = !!item.video;
  return `<div class="ph"></div>${showPlay ? '<div class="play"></div>' : ""}`;
}

function renderGrid(){
  const grid = document.getElementById("work-grid");
  grid.innerHTML = "";
  const items = CONTENT.work.filter(w => w.category === activeCategory);
  if(items.length === 0){
    grid.appendChild(el("p", null, "No projects in this category yet — add one in content.js."));
    return;
  }
  items.forEach(item => {
    const card = el("div", "card");
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
function openModal(item){
  const modal = document.getElementById("modal");
  document.getElementById("modal-cat").textContent = labelFor(item.category);
  document.getElementById("modal-title").textContent = item.title;
  document.getElementById("modal-meta").textContent = `${item.role} · ${item.year}`;
  document.getElementById("modal-desc").textContent = item.description || "";
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
  const link = document.getElementById("modal-link");
  if(item.link){ link.href = item.link; link.style.display = "inline-block"; }
  else { link.style.display = "none"; }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal(){
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

/* ---------- HISTORY ---------- */
function renderHistory(){
  const wrap = document.getElementById("timeline");
  wrap.innerHTML = "";
  CONTENT.history.forEach(h => {
    const item = el("div", "tl-item");
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
  const chips = document.getElementById("kit-chips");
  chips.innerHTML = "";
  CONTENT.about.kit.forEach(k => chips.appendChild(el("span", "chip", k)));
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

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderGate();
  renderTabs();
  renderGrid();
  renderHistory();
  renderAbout();
  renderContact();
  startTimecode();

  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if(e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeModal();
  });
});
