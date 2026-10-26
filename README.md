# Tharun Kumar — Portfolio

A single-page portfolio built like a title card: your name set huge across
the first screen, then your work as a list of big names that pass through a
held frame (each name shows its picture as it crosses), an about section,
your credits on a yellow field, and your email as the closing line.

No build step — plain HTML/CSS/JS. That means **anyone can edit it in a
text box on GitHub** and Vercel redeploys automatically.

## Updating your site (do this part yourself, anytime)

Everything lives in **`content.js`**. Open it on GitHub (click the file →
pencil/edit icon), make your change, and click "Commit changes" at the
bottom — Vercel redeploys automatically within seconds. You never need to
touch `index.html`, `styles.css`, or `script.js` for normal updates.

### 1. Adding an edited video (YouTube, Vimeo or Google Drive)
Edits and films each get **one entry per project**. Add a block to the
`work` array:
```js
{
  category: "edits",
  title: "Wedding Recap — Aditi & Rohan",
  year: "2026",
  role: "Editor",
  description: "A 3-minute same-day edit cut to the couple's first-dance track.",
  video: "https://youtu.be/YOUR_VIDEO_ID",
  image: null,
  link: null,
},
```
**Just paste the normal share link** — you don't need to hunt for an embed
URL any more. All of these work and get converted for you:

| Where the video lives | Paste this |
|---|---|
| YouTube | `https://youtu.be/ID` or `https://www.youtube.com/watch?v=ID` |
| Vimeo | `https://vimeo.com/ID` |
| Google Drive | `https://drive.google.com/file/d/ID/view?usp=sharing` |

**For Google Drive, set the file's sharing to "Anyone with the link"** —
otherwise visitors hit a permission wall instead of your video. Drive also
doesn't hand out thumbnails, so set `image` to a cover frame if you want
something better than the drawn placeholder in the work frame.

### 2. Adding a film (same as edits)
Identical to above, just set `category: "films"` instead.

### 2b. Pulling a piece straight from Instagram
If the work already lives on your Instagram, you don't need to re-upload it.
Add `instagram` with the post or reel link and it plays inside your site —
visitors never leave the page:
```js
{
  category: "edits",
  title: "Campus fest aftermovie",
  year: "2026",
  role: "Editor",
  description: "Cut the same night, posted the next morning.",
  instagram: "https://www.instagram.com/p/YOUR_POST_CODE/",
  image: "assets/edits/fest-cover.jpg",   // optional but worth it — see below
  link: null,
},
```
Post links (`/p/...`) and reel links (`/reel/...`) both work.

**One thing to know:** Instagram does not let other websites use its
thumbnails without an API token, so a card with only an `instagram` link
shows a drawn placeholder in the work frame. If you want a proper
cover frame there, export one still from the video and point `image` at it.
The embed itself is unaffected either way.

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
The work list uses the **first photo as the cover** in the frame, and says
how many photos the album holds. Clicking
it opens the album as a **slideshow that plays itself** — each photo holds
for about four seconds with a progress bar running underneath, then
cross-fades to the next.

Visitors can take over at any time: a pause button, arrows on either side of
the frame, a thumbnail strip, left/right arrow keys, and swipe on a phone.
Hovering the photo holds it so nothing slides away mid-look, and manual
navigation restarts the timer rather than cutting a photo short. Nothing is
ever shown as separate individual cards — one entry stays one album.

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

### 6. Editing the production slate and the numbers band
Near the top of `content.js`:
```js
hero: {
  slate: [
    { label: "ROLE",   value: "Editor / DP / Director" },
    { label: "STATUS", value: "Open for freelance" },
    { label: "BASED",  value: "Chennai, India" },
    { label: "REEL",   value: "No. 001" },
  ],
  blurb: "One or two sentences under your name.",
},
stats: [
  { value: "2+", label: "Years editing" },
  { value: "10+", label: "Projects shipped" },
],
```
The `slate` is the short list of facts beside your name on the first
screen (a "Status" row gets a small green dot, and "Status" and "Based"
also appear at the bottom of the contact section). Add, remove or rename rows freely; each one is
just a `{ label, value }` pair. `slate` and `stats` can each have as many or
as few entries as you want — the layout adjusts automatically. Numbers in
`stats` count up the first time a visitor scrolls to them.

### 7. Adding your portrait photo
Upload your photo to the repo (e.g. `assets/portrait.jpg`) the same way you
upload album photos, then point `about.portrait` at it:
```js
about: {
  portrait: "assets/portrait.jpg",
  caption: "Usually mid color-grade.",
  ...
}
```
Leave it `null` and the About section keeps its empty "PORTRAIT" frame. If
the path is wrong the frame stays as-is rather than showing a broken image.

### 8. Shortening the giant wordmark (optional)
The landing screen sets your `name` in huge type, broken onto two lines. If
your name is long and you'd rather it read as one short mark, set:
```js
wordmark: "TK",   // or "Tharun" — leave null to use your full name
```

## Deploying to Vercel

**Option A — no coding tools, all in the browser:**
1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new repository (e.g. `tk-portfolio`) and upload **everything in
   this folder** via "Add file → Upload files" on the repo page. Drag the
   `assets` and `scripts` folders in as well as the loose files — the site
   needs `assets/` to run. (GitHub's uploader accepts dragged folders and
   keeps the structure.)
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

## What's in the folder

You only ever edit `content.js`. For reference, everything else is:

| Path | What it is |
|---|---|
| `index.html` `styles.css` `script.js` | The site itself |
| `content.js` | **Your content — the only file you edit** |

Put your own media anywhere you like under `assets/` — e.g.
`assets/photos/<album>/`, `assets/edits/`, `assets/portrait.jpg`.

## Notes
- **The frame on the first screen builds itself from your work.** It cycles
  through album covers, custom `image` covers and YouTube stills from the
  `work` array, so the landing screen fills in with real frames as you add
  projects. You don't configure it; just add work.
- **Until a piece has a real still, it gets a drawn cover** in the site's
  colours: a timeline for edits, a sun-and-horizon view for photography, a
  letterboxed shot for films. Each title always gets the same drawing. Add
  an `image` (or `images` for an album) and the drawing is replaced.
- Your name, the "Credits" word and your email are sized automatically to
  fill the width, so a longer name or email still fits. Set `wordmark` if
  you'd rather the first screen show something shorter.
- The little running timecode under the frame is cosmetic (a nod to
  editing timelines). It turns itself off for visitors who have "reduce
  motion" enabled on their device.
- **Everything respects "reduce motion".** With it switched on, the name
  doesn't rise in, sections don't slide, the frame doesn't cycle and the
  album slideshow doesn't autoplay. The content is all still there.
- No animation library: everything runs on plain CSS and a little
  JavaScript, so there is nothing extra to load or break.
- Fonts: Anton (the big condensed capitals) and Work Sans (everything
  else), loaded from Google Fonts.
