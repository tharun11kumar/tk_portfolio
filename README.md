# Tharun Kumar — Portfolio

A dark single-page portfolio built like a title card: your name set huge
across the first screen in a warm moving gradient, your photos rebuilt out of
particles that scatter away from the cursor (and, if a visitor switches it
on, react to sound), then your work as big names passing a held frame, an
about section, your roles on a gradient field, and your email as the
closing line.

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

**A video file kept with the site** (an `.mp4` under `assets/films/`) plays
in the browser's own player; point `video` at its path and `image` at a cover
frame. Keep these files under about 50 MB; GitHub refuses anything over
100 MB, so put longer films on Drive or YouTube instead.

**For Google Drive, set the file's sharing to "Anyone with the link"** —
otherwise visitors hit a permission wall instead of your video. Drive also
doesn't hand out thumbnails, so set `image` to a cover frame if you want
something better than the drawn placeholder in the work frame.

### 2. Adding a film (same as edits)
Identical to above, just set `category: "films"` instead.

Give any piece a `preview` (a short, silent `.mp4` under `assets/films/`) and
it loops on the big screen in the Work section while the full video stays
wherever it is (Drive, YouTube…). A video kept with the site previews itself.

Give a film a `type` to file it under a heading, e.g. `type: "Glimpses"`,
`type: "Promo"` or `type: "Vlog"`. In the Work section, picking "Films" opens
a row with one filter per type. Edits and films each get their own grid, in
the order you list them here.

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

**Giving a photo its own title:** write that photo as `{ src, caption }`
instead of just its path. The caption shows under the photo in the
slideshow; photos without one show no caption.
```js
images: [
  { src: "assets/photos/black-and-white/curves-beyond-lightroom.jpg", caption: "Curves beyond Lightroom" },
  "assets/photos/black-and-white/2.jpg",   // no caption
],
```

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

### 7. Your portrait
The About section prints `about.portrait` as warm halftone dots, like a
magazine page. A lens follows the cursor and shows the real photo through it,
slightly magnified; with no cursor it drifts around your face, and a click
pulls focus. Any photo works (it is cropped to 4:5), e.g. `assets/portrait.jpg`:
```js
about: {
  portrait: "assets/portrait.jpg",
  portraitCredit: "Photo by ...",
  ...
}
```
If you swap the photo, the lens rests at `FACE` near the top of `portrait.js`
(a share of the width and height); move it to where the face is.
Set `portrait` to `null` to hide the portrait.

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
| `particles.js` | The particle photo, the drifting points and the sound mode |
| `assets/photos/` | Your photography, ready for the web |
| `content.js` | **Your content — the only file you edit** |

Put your own media anywhere you like under `assets/` — e.g.
`assets/photos/<album>/`, `assets/edits/`, `assets/portrait.jpg`.

## Notes
- **The opening animation** (`intro.js`) plays the camera turning on: a
  viewfinder with REC and a running timecode, your name pulling into focus,
  then a shutter flash and an iris opening onto the page. A click, a key or a
  scroll skips it; visitors with "reduce motion" on never see it.
- **The cursor is a small camera** (`cursor.js`) on computers with a mouse:
  its lens zooms and focus brackets close in over anything clickable, a REC
  light blinks over the photo stages, and a click fires a shutter flash.
  Phones and tablets keep their normal touch behaviour.
- **The first screen can show video too.** In `hero.photos`, list photos as
  `{ src, title }` and silent previews as `{ video, title }`; they play in turn.
- **The particle photo on the first screen.** It builds the photos listed in
  `hero.photos` in `content.js` out of particles, one after another, every
  six seconds (or when a visitor clicks it). Moving the cursor or a finger
  over it scatters the particles; they drift back. Bright subjects on dark
  grounds read best. Leave `hero.photos` empty to use every album photo.
- **"React to sound".** The button under the particle photo asks the visitor
  for their microphone. Once they allow it, the volume pushes the particles
  outward and swells the background glow. Nothing is recorded or sent
  anywhere, and it stops when they click the button again.
- **The drifting points and the glow** behind the whole page also move out of
  the cursor's way. All of this lives in `particles.js`.
- **Until a piece has a real still, it gets a drawn cover**: a timeline for
  edits, a sun-and-horizon view for photography, a letterboxed shot for
  films. Add an `image` (or `images` for an album) and the drawing is
  replaced.
- **Photography has its own section.** Every `photography` album shows as a
  stack of prints in a row you can scroll, swipe or drag sideways. Pointing
  at a stack fans the prints out and leafs through the album; clicking opens
  the slideshow. The Work list above it covers edits and films.
- **Movie edits** can carry `fandom: true`, which puts "(FANDOM EDIT)" next
  to the title on the card, the screen and the player.
- **The Work screen plays every preview in turn**: when one ends the next
  piece takes over, through the films and then the edits.
- **Your photography** lives in `assets/photos/`, exported at up to 2560px
  on the long side. Add more by dropping files in a folder there and listing
  them in an album's `images`.
- Your name, the "Roles" word and your email are sized automatically to
  fill the width. Set `wordmark` if you'd rather the first screen show
  something shorter.
- **Everything respects "reduce motion".** With it switched on, the particle
  photo becomes a still photo, the glow and points stop, the name doesn't
  rise in, and the album slideshow doesn't autoplay. The content is all
  still there.
- No animation library: everything runs on plain CSS and a little
  JavaScript (a canvas for the particles).
- Fonts: Anton (the big condensed capitals) and Work Sans (everything
  else), loaded from Google Fonts.
