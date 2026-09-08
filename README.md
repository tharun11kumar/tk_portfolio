# Tharun Kumar — Portfolio

A dark, cinematic single-page portfolio. Landing screen asks visitors what
kind of work they want to see (Edits / Photography / Films), then shows
filtered work, a work-history timeline, and an about section.

No build step — plain HTML/CSS/JS. That means **anyone can edit it in a
text box on GitHub** and Vercel redeploys automatically.

## Updating your site (do this part yourself, anytime)

Everything lives in **`content.js`**. Open it on GitHub (click the file →
pencil/edit icon), make your change, and click "Commit changes" at the
bottom — Vercel redeploys automatically within seconds. You never need to
touch `index.html`, `styles.css`, or `script.js` for normal updates.

### 1. Adding an edited video (discrete upload)
Edits and films each get **one entry per project**. Add a block to the
`work` array:
```js
{
  category: "edits",
  title: "Wedding Recap — Aditi & Rohan",
  year: "2026",
  role: "Editor",
  description: "A 3-minute same-day edit cut to the couple's first-dance track.",
  video: "https://www.youtube.com/embed/YOUR_VIDEO_ID",
  image: null,
  link: null,
},
```
To get the embed ID: open your YouTube video → Share → Embed, and copy the
`VIDEO_ID` out of the `src="...youtube.com/embed/VIDEO_ID"` it gives you.
Same process for a Vimeo link (`https://player.vimeo.com/video/VIDEO_ID`).

### 2. Adding a film (same as edits — discrete)
Identical to above, just set `category: "films"` instead.

### 3. Adding photography — as an ALBUM, not one-by-one
Photography works differently on purpose: **one entry = one whole
shoot/album**, holding every photo from that shoot in an `images` array
(plural), not a single `image`:
```js
{
  category: "photography",
  title: "Marina Beach at Dawn",
  year: "2026",
  role: "Photographer",
  description: "A quiet morning shoot along the shore.",
  images: [
    "assets/photos/marina-dawn/1.jpg",
    "assets/photos/marina-dawn/2.jpg",
    "assets/photos/marina-dawn/3.jpg",
  ],
  link: null,
},
```
The work grid shows the **first photo as the cover** with a small
"N photos" badge. Clicking it opens the whole set as a gallery visitors
can click through or navigate with the arrow keys — nothing is shown as
separate individual cards.

**To upload the actual photo files:** in your GitHub repo, create a
folder path like `assets/photos/marina-dawn/` (GitHub lets you create
folders by naming a file `assets/photos/marina-dawn/1.jpg` during
upload), drag all the photos from that shoot in together, commit, then
list those exact paths in the `images` array above.

### 4. Editing existing text
Every visible word on the site is plain text inside `content.js` — your
name, tagline, the "About" paragraphs, the kit/tools list, and the
work-history timeline entries. Find the line, change the text between
the quotes, commit. Nothing else needs to change.

### 5. Linking your social accounts
Scroll to the `contact` block near the bottom of `content.js`:
```js
contact: {
  email: "you@example.com",
  socials: [
    { label: "Instagram", url: "https://instagram.com/your_handle" },
    { label: "YouTube",   url: "https://youtube.com/@your_channel" },
    { label: "LinkedIn",  url: "https://linkedin.com/in/your_profile" },
  ],
},
```
Replace the `url` values with your real profile links (and the `email`
with your real address). Add or remove `{ label, url }` lines for any
other platform — each one shows up automatically in the footer.

### 6. Editing the top badges and the numbers band
Near the top of `content.js`:
```js
hero: {
  status: "Open to freelance",              // gets a green dot
  badges: ["EEE Student · VIT Chennai", "Chennai, India"],
  blurb: "One or two sentences under your name.",
},
stats: [
  { value: "2+", label: "Years editing" },
  { value: "10+", label: "Projects shipped" },
],
```
`badges` and `stats` can each have as many or as few entries as you want
— the layout adjusts automatically. Numbers in `stats` count up
automatically the first time a visitor scrolls to that section.

## Deploying to Vercel

**Option A — no coding tools, all in the browser:**
1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new repository (e.g. `tk-portfolio`) and upload these files
   (`index.html`, `styles.css`, `script.js`, `content.js`, this README) via
   "Add file → Upload files" on the repo page.
3. Go to [vercel.com](https://vercel.com), sign up/log in with GitHub.
4. Click **Add New → Project**, select your `tk-portfolio` repo, and click
   **Deploy**. No settings need to change — Vercel serves static files
   automatically. You'll get a live `.vercel.app` URL in under a minute.
5. To update the site later: edit `content.js` on GitHub (pencil icon on
   the file → edit → commit). Vercel redeploys automatically within
   seconds of the commit.

**Option B — using a terminal:**
```bash
npm install -g vercel     # one-time
cd tk-portfolio
vercel                    # first deploy, follow the prompts
vercel --prod             # promote to your production URL
```
After the first deploy, running `vercel --prod` again from this folder
redeploys your latest changes. Or connect the folder to a GitHub repo and
every `git push` will auto-deploy, same as Option A.

### Custom domain
In the Vercel dashboard → your project → **Settings → Domains**, add your
own domain (e.g. `tharunkumar.com`) and follow the DNS instructions Vercel
gives you.

## Notes
- The little running timecode in the top-right is cosmetic (a nod to
  editing timelines) — it turns itself off automatically for visitors
  who have "reduce motion" enabled on their device.
- Placeholder thumbnails use a grain-textured gradient so the site never
  looks broken before you add real images — swap them in whenever you're
  ready, no rush.
