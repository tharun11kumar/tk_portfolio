# Tharun Kumar — Portfolio

A dark, cinematic single-page portfolio. Landing screen asks visitors what
kind of work they want to see (Edits / Photography / Films), then shows
filtered work, a work-history timeline, and an about section.

No build step — plain HTML/CSS/JS. That means **anyone can edit it in a
text box on GitHub** and Vercel redeploys automatically.

## Updating your site (do this part yourself, anytime)

Everything you'll want to change lives in **`content.js`**:

- your name / tagline
- the three "reel" categories on the landing screen
- every project in the work grid (title, year, description, image, video, link)
- your work-history timeline
- your about text and tool list
- your email and social links

Open `content.js`, edit the text between the quotes, save, and push to
GitHub (or edit the file directly on github.com — see below). You never
need to touch `index.html`, `styles.css`, or `script.js` for normal
content updates.

### Adding real images
1. Create a folder called `assets/` in the project (e.g. `assets/photos/`, `assets/edits/`).
2. Drop your image files in there.
3. In `content.js`, set `image: "assets/photos/your-file.jpg"` on that project.

### Adding a video
Set `video:` on a project to a YouTube/Vimeo **embed** URL, e.g.
`https://www.youtube.com/embed/VIDEO_ID`.

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
