/* ============================================================
   make-art.js — regenerates the abstract SVG cards used in the
   hero collage (assets/art/01.svg … 09.svg).

   You do NOT need to run this. It exists so the artwork can be
   re-tinted if you ever change the palette in styles.css.
   Run with:  node scripts/make-art.js
   ============================================================ */

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets", "art");
const W = 600, H = 800;

// same accents as the CSS custom properties
const HUES = [
  { a: "#e4572e", b: "#7a2f18" }, // ember
  { a: "#3f8f8a", b: "#1b4a47" }, // teal
  { a: "#5b4b8a", b: "#2c2545" }, // violet
  { a: "#c9a227", b: "#6a5413" }, // brass
  { a: "#2f6f9e", b: "#17384f" }, // steel
];

const rnd = (seed) => {
  // small deterministic PRNG so re-running produces identical files
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

function wrap(inner, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
${defs}
</defs>
${inner}
<rect width="${W}" height="${H}" filter="url(#g)" opacity="0.16"/>
</svg>`;
}

function base(h) {
  return `<rect width="${W}" height="${H}" fill="#08090b"/>
<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
}
function bgDef(h, angle = 160) {
  return `<linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
<stop offset="0" stop-color="${h.a}" stop-opacity="0.9"/>
<stop offset="0.55" stop-color="${h.b}" stop-opacity="0.75"/>
<stop offset="1" stop-color="#08090b"/>
</linearGradient>`;
}

/* 1 — topographic contour lines */
function contours(h, seed) {
  const r = rnd(seed);
  let p = "";
  for (let i = 0; i < 26; i++) {
    const y = 60 + i * 27;
    const amp = 26 + r() * 46;
    const d = `M -20 ${y} C ${W * 0.25} ${y - amp}, ${W * 0.55} ${y + amp}, ${W + 20} ${y - amp * 0.4}`;
    p += `<path d="${d}" fill="none" stroke="#f0ede6" stroke-opacity="${0.10 + r() * 0.28}" stroke-width="${1 + r()}"/>`;
  }
  return wrap(base(h) + p, bgDef(h));
}

/* 2 — soft mesh-gradient blobs */
function mesh(h, seed) {
  const r = rnd(seed);
  let p = `<g filter="url(#soft)">`;
  for (let i = 0; i < 6; i++) {
    p += `<ellipse cx="${r() * W}" cy="${r() * H}" rx="${90 + r() * 200}" ry="${90 + r() * 200}"
      fill="${i % 2 ? h.a : "#f0ede6"}" opacity="${0.14 + r() * 0.3}"/>`;
  }
  p += `</g>`;
  const defs = bgDef(h) + `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="46"/></filter>`;
  return wrap(base(h) + p, defs);
}

/* 3 — concentric rings */
function rings(h, seed) {
  const r = rnd(seed);
  const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
  let p = "";
  for (let i = 22; i > 0; i--) {
    p += `<circle cx="${cx}" cy="${cy}" r="${i * 26}" fill="none" stroke="#f0ede6" stroke-opacity="${0.07 + (22 - i) * 0.012}" stroke-width="1.4"/>`;
  }
  return wrap(base(h) + p, bgDef(h));
}

/* 4 — vertical light streaks */
function streaks(h, seed) {
  const r = rnd(seed);
  let p = "";
  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    const w = 1 + r() * 7;
    const y = r() * H * 0.5;
    const hh = H * (0.3 + r() * 0.7);
    p += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#f0ede6" opacity="${0.05 + r() * 0.3}" rx="${w / 2}"/>`;
  }
  return wrap(base(h) + `<g filter="url(#bl)">${p}</g>`, bgDef(h) + `<filter id="bl"><feGaussianBlur stdDeviation="2.2"/></filter>`);
}

/* 5 — wave interference */
function waves(h, seed) {
  const r = rnd(seed);
  let p = "";
  for (let i = 0; i < 34; i++) {
    const y = i * 24;
    let d = `M 0 ${y}`;
    for (let x = 0; x <= W; x += 20) {
      d += ` L ${x} ${y + Math.sin((x / W) * Math.PI * (2 + (i % 4))) * (10 + i * 1.2)}`;
    }
    p += `<path d="${d}" fill="none" stroke="${i % 3 === 0 ? h.a : "#f0ede6"}" stroke-opacity="${0.1 + r() * 0.25}" stroke-width="1.2"/>`;
  }
  return wrap(base(h) + p, bgDef(h));
}

/* 6 — halftone dot field */
function halftone(h, seed) {
  const r = rnd(seed);
  let p = "";
  for (let y = 20; y < H; y += 28) {
    for (let x = 20; x < W; x += 28) {
      const t = y / H;
      const rad = 1.2 + t * 8 * (0.5 + r() * 0.8);
      p += `<circle cx="${x}" cy="${y}" r="${rad.toFixed(2)}" fill="#f0ede6" opacity="${(0.5 - t * 0.35).toFixed(3)}"/>`;
    }
  }
  return wrap(base(h) + p, bgDef(h));
}

/* 7 — diagonal shards */
function shards(h, seed) {
  const r = rnd(seed);
  let p = "";
  for (let i = 0; i < 16; i++) {
    const x = -100 + r() * (W + 200);
    const w = 20 + r() * 90;
    p += `<polygon points="${x},${H + 40} ${x + w},${H + 40} ${x + w + 220},-40 ${x + 220},-40"
      fill="${i % 3 === 0 ? h.a : "#f0ede6"}" opacity="${0.05 + r() * 0.16}"/>`;
  }
  return wrap(base(h) + p, bgDef(h));
}

/* 8 — radial burst */
function burst(h, seed) {
  const r = rnd(seed);
  const cx = W / 2, cy = H * 0.55;
  let p = "";
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    const len = 180 + r() * 420;
    p += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * len}" y2="${cy + Math.sin(a) * len}"
      stroke="#f0ede6" stroke-opacity="${0.06 + r() * 0.26}" stroke-width="${0.8 + r() * 1.8}"/>`;
  }
  return wrap(base(h) + p, bgDef(h));
}

/* 9 — stacked bars / film strip */
function bars(h, seed) {
  const r = rnd(seed);
  let p = "";
  let y = 0;
  while (y < H) {
    const hh = 10 + r() * 60;
    p += `<rect x="0" y="${y}" width="${W}" height="${hh}" fill="${r() > 0.72 ? h.a : "#f0ede6"}" opacity="${0.04 + r() * 0.2}"/>`;
    y += hh + 6;
  }
  return wrap(base(h) + p, bgDef(h));
}

const RECIPES = [contours, mesh, rings, streaks, waves, halftone, shards, burst, bars];

fs.mkdirSync(OUT, { recursive: true });
RECIPES.forEach((fn, i) => {
  const svg = fn(HUES[i % HUES.length], 1000 + i * 7919);
  const name = String(i + 1).padStart(2, "0") + ".svg";
  fs.writeFileSync(path.join(OUT, name), svg);
  console.log(`${name}  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB  (${fn.name})`);
});
