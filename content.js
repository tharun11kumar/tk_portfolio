/* ============================================================
   CONTENT.JS
   This is the ONLY file you need to edit to update your website.
   Change the text, links, and image paths below, save the file,
   commit + push to GitHub, and Vercel redeploys automatically.

   Do not touch index.html or styles.css unless you want to change
   the actual layout/design — everything here is just your content.

   EDITS & FILMS (one item per project):
   - "video": paste the normal share link, not an embed link. YouTube,
     Vimeo and Google Drive all work and are converted automatically:
       https://youtu.be/VIDEO_ID
       https://www.youtube.com/watch?v=VIDEO_ID
       https://vimeo.com/VIDEO_ID
       https://drive.google.com/file/d/FILE_ID/view?usp=sharing
     For a Drive video, set its sharing to "Anyone with the link" or
     visitors will just see a permission wall.
   - "image": a single cover image path, e.g. "assets/edits/recap-cover.jpg"
   - Leave both null to keep the generated placeholder.

   INSTAGRAM (works in any category):
   - "instagram": the post/reel link, e.g. https://www.instagram.com/p/CODE/
     The post plays inside the site — visitors never leave the page.
   - Instagram does not hand out thumbnails to other sites, so the grid
     card shows a branded placeholder unless you also set "image" to a
     cover of your own. Setting "image" is worth the extra minute.

   PHOTOGRAPHY (one item per ALBUM, not per photo):
   - Use "images": [ "assets/photos/goa-trip/1.jpg", "assets/photos/goa-trip/2.jpg", ... ]
   - List every photo in that shoot/album inside the array. The grid
     shows the first photo as the cover with a photo count badge, and
     clicking it opens the whole album as a slideshow that plays itself
     — with a progress bar, prev/next, thumbnails, swipe and arrow keys.
     Hovering the card previews the album too.
   - Do NOT use "image" (singular) for photography — use "images" (plural).
   ============================================================ */

const CONTENT = {

  name: "Tharun Kumar",
  role: "Editor. Photographer. Filmmaker.",

  // Optional. The giant wordmark on the landing screen normally uses "name"
  // above, broken onto two lines. Set this to override it with something
  // shorter/punchier (e.g. "TK" or "Tharun") if the full name feels too long.
  wordmark: null,

  // Shown at the very top of the landing page.
  // "status" gets a small green dot (use it for availability, e.g. "Open to freelance").
  // "badges" is a list of short quick-facts — location, student status, whatever you want visible up top.
  // "blurb" is one or two sentences under your name.
  // Shown as a small "production slate" panel above your name — like the
  // info card on a film slate. Add/remove/rename fields freely; each is
  // just a { label, value } pair.
  hero: {
    slate: [
      { label: "ROLE",   value: "Editor / DP / Director" },
      { label: "STATUS", value: "Open for freelance" },
      { label: "BASED",  value: "Chennai, India" },
      { label: "REEL",   value: "No. 001" },
    ],
    // The line under your role. Set "blurbBy" when it's a quote, and the
    // name shows under it; leave it "" for your own words.
    blurb: "“Cinema is a matter of what's in the frame and what's out.”",
    blurbBy: "Martin Scorsese",
    // The photos the first screen builds out of particles, in order. Bright
    // subjects on dark grounds work best. Leave the list empty to use every
    // photo from your albums below.
    photos: [
      { src: "assets/photos/black-and-white/curves-beyond-lightroom.jpg", title: "Curves beyond Lightroom" },
      { src: "assets/photos/srmmun-25/03.jpg", title: "SRMMUN ’25" },
      { src: "assets/photos/stella-mun-26/10.jpg", title: "Stella MUN ’26" },
      { src: "assets/photos/sigma-105mm/05.jpg", title: "Through a Sigma 105mm" },
      { src: "assets/photos/vlsmun-26/01.jpg", title: "VLSMUN ’26" },
    ],
  },

  // The numbers band under About. Each is a short value + a short label.
  // Keep values short (e.g. "2+", "10+", "3") so they read well at large size.
  stats: [
    { value: "3+", label: "Years editing" },
    { value: "10+", label: "Projects shipped" },
    { value: "3", label: "Tools mastered" },
    { value: "5+", label: "Awards" },
  ],

  // The three doors on the landing "gate" screen.
  // id must match the category id used in the work[] list below.
  categories: [
    { id: "edits",       label: "Edits",       hint: "Cuts, montages & motion" },
    { id: "photography", label: "Photography", hint: "Stills & frames" },
    { id: "films",       label: "Films",       hint: "Short films & direction" },
  ],

  // Your portfolio pieces. Add as many as you want — the grid and
  // the filter tabs update automatically. "category" must match one
  // of the category ids above.
  work: [
    {
      category: "edits",
      title: "Beat-Sync Auto Cutter",
      year: "2026",
      role: "Tool + Edit",
      description: "A Premiere Pro extension I built that reads a track's beat map and auto-cuts the timeline to the drop — built this to speed up recap and montage edits for Film Society.",
      image: null,
      video: null,
      link: null,
    },
    {
      category: "films",
      title: "48-Hour Film Challenge",
      year: "2026",
      role: "Organizer / Director",
      description: "Flagship event I planned for Film Society's technical fest — teams write, shoot and edit a short film in 48 hours. Replace this with your own entry once you've directed one.",
      image: null,
      video: null,
      link: null,
    },
    {
      category: "photography",
      title: "VLSMUN ’26",
      year: "2026",
      role: "Photographer",
      description: "Fifteen frames from VLSMUN ’26: delegates, committee rooms and a few moments around the conference.",
      images: [
        "assets/photos/vlsmun-26/01.jpg",
        "assets/photos/vlsmun-26/02.jpg",
        "assets/photos/vlsmun-26/03.jpg",
        "assets/photos/vlsmun-26/04.jpg",
        "assets/photos/vlsmun-26/05.jpg",
        "assets/photos/vlsmun-26/06.jpg",
        "assets/photos/vlsmun-26/07.jpg",
        "assets/photos/vlsmun-26/08.jpg",
        "assets/photos/vlsmun-26/09.jpg",
        "assets/photos/vlsmun-26/10.jpg",
        "assets/photos/vlsmun-26/11.jpg",
        "assets/photos/vlsmun-26/12.jpg",
        "assets/photos/vlsmun-26/13.jpg",
        "assets/photos/vlsmun-26/14.jpg",
        "assets/photos/vlsmun-26/15.jpg",
      ],
      link: "https://www.instagram.com/p/De4kvPbo4qR/",
    },
    {
      category: "photography",
      title: "SRMVMUN ’25",
      year: "2025",
      role: "Photographer",
      description: "Nineteen frames from SRMVMUN ’25: delegates, debate and the committee rooms.",
      images: [
        "assets/photos/srmvmun-25/01.jpg",
        "assets/photos/srmvmun-25/02.jpg",
        "assets/photos/srmvmun-25/03.jpg",
        "assets/photos/srmvmun-25/04.jpg",
        "assets/photos/srmvmun-25/05.jpg",
        "assets/photos/srmvmun-25/06.jpg",
        "assets/photos/srmvmun-25/07.jpg",
        "assets/photos/srmvmun-25/08.jpg",
        "assets/photos/srmvmun-25/09.jpg",
        "assets/photos/srmvmun-25/10.jpg",
        "assets/photos/srmvmun-25/11.jpg",
        "assets/photos/srmvmun-25/12.jpg",
        "assets/photos/srmvmun-25/13.jpg",
        "assets/photos/srmvmun-25/14.jpg",
        "assets/photos/srmvmun-25/15.jpg",
        "assets/photos/srmvmun-25/16.jpg",
        "assets/photos/srmvmun-25/17.jpg",
        "assets/photos/srmvmun-25/18.jpg",
        "assets/photos/srmvmun-25/19.jpg",
      ],
      link: "https://www.instagram.com/p/DO38sF8EwKS/",
    },
    {
      category: "photography",
      title: "Stella MUN ’26",
      year: "2026",
      role: "Photographer",
      description: "Eleven frames from Stella MUN ’26, including crowds in motion blur and a long exposure.",
      images: [
        "assets/photos/stella-mun-26/01.jpg",
        "assets/photos/stella-mun-26/02.jpg",
        "assets/photos/stella-mun-26/03.jpg",
        "assets/photos/stella-mun-26/04.jpg",
        "assets/photos/stella-mun-26/05.jpg",
        "assets/photos/stella-mun-26/06.jpg",
        "assets/photos/stella-mun-26/07.jpg",
        "assets/photos/stella-mun-26/08.jpg",
        "assets/photos/stella-mun-26/09.jpg",
        "assets/photos/stella-mun-26/10.jpg",
        "assets/photos/stella-mun-26/11.jpg",
      ],
      link: "https://www.instagram.com/p/DYw-9pTml6b/",
    },
    {
      category: "photography",
      title: "SRMMUN ’25",
      year: "2025",
      role: "Photographer",
      description: "Ten frames from SRMMUN ’25, from low angles and close in, plus a sunset over a footbridge.",
      images: [
        "assets/photos/srmmun-25/01.jpg",
        "assets/photos/srmmun-25/02.jpg",
        "assets/photos/srmmun-25/03.jpg",
        "assets/photos/srmmun-25/04.jpg",
        "assets/photos/srmmun-25/05.jpg",
        "assets/photos/srmmun-25/06.jpg",
        "assets/photos/srmmun-25/07.jpg",
        "assets/photos/srmmun-25/08.jpg",
        "assets/photos/srmmun-25/09.jpg",
        "assets/photos/srmmun-25/10.jpg",
      ],
      link: "https://www.instagram.com/p/DQmbOLoj5Sm/",
    },
    {
      category: "photography",
      title: "Pondicherry",
      year: "2025",
      role: "Photographer",
      description: "Eight frames from Pondicherry: the sea, the lighthouse, a church doorway and the town after dark.",
      images: [
        "assets/photos/pondicherry/01.jpg",
        "assets/photos/pondicherry/02.jpg",
        "assets/photos/pondicherry/03.jpg",
        "assets/photos/pondicherry/04.jpg",
        "assets/photos/pondicherry/05.jpg",
        "assets/photos/pondicherry/06.jpg",
        "assets/photos/pondicherry/07.jpg",
        "assets/photos/pondicherry/08.jpg",
      ],
      link: "https://www.instagram.com/p/DKzTdlHyP5B/",
    },
    {
      category: "photography",
      title: "Through a Sigma 105mm",
      year: "2026",
      role: "Photographer",
      description: "Seven black-and-white frames on a Sigma 105mm f1.4.",
      images: [
        "assets/photos/sigma-105mm/01.jpg",
        "assets/photos/sigma-105mm/02.jpg",
        "assets/photos/sigma-105mm/03.jpg",
        "assets/photos/sigma-105mm/04.jpg",
        "assets/photos/sigma-105mm/05.jpg",
        "assets/photos/sigma-105mm/06.jpg",
        "assets/photos/sigma-105mm/07.jpg",
      ],
      link: "https://www.instagram.com/p/DXTHjJqE1VI/",
    },
    {
      category: "photography",
      title: "Black & White",
      year: "2026",
      role: "Photographer",
      description: "Frames in black and white, each with its own title.",
      // A photo can be just its path, or { src, caption } to give it a title
      // that shows under it in the slideshow.
      images: [
        { src: "assets/photos/black-and-white/curves-beyond-lightroom.jpg", caption: "Curves beyond Lightroom" },
      ],
      link: "https://www.instagram.com/framesoftk/",
    },
    {
      category: "edits",
      title: "Add another edit",
      year: "2025",
      role: "Editor",
      description: "Placeholder — duplicate this block in content.js for every new edit you want listed, then fill in the details.",
      image: null,
      video: null,
      link: null,
    },
    {
      // Example of pulling a piece straight from Instagram. Swap the URL for
      // one of your own posts or reels and it plays inside the site.
      // Add "image" too if you want a proper cover on the grid card.
      category: "edits",
      title: "Pull a post from Instagram",
      year: "2026",
      role: "Editor",
      description: "Paste any Instagram post or reel link into 'instagram' and it embeds here, playable without leaving the site. Delete this block once you've added a real one.",
      instagram: "https://www.instagram.com/p/DAaBbCcDdEe/",
      image: null,
      video: null,
      link: null,
    },
  ],

  // Roles and positions, shown in the "Roles" section.
  history: [
    // Each role: the years, your position, the organisation, and an optional
    // "body" with a line or two about it (leave it "" and the row just lists
    // the role). Listed top to bottom in the order you write them.
    { time: "2026 – Present", title: "President", org: "VITC Film Society", body: "" },
    { time: "2025", title: "Chargé d’Affaires", org: "VITC IntraMUN", body: "" },
    { time: "2025", title: "USG Visual Media", org: "VITCMUN", body: "" },
    { time: "2024 – 2025", title: "Joint Secretary", org: "Arignar Anna Thamizh Mandram, VIT Chennai", body: "" },
    { time: "2024", title: "USG Visual Media", org: "VITC IntraMUN", body: "" },
  ],

  about: {
    // Your photo. Drop the file in the repo (e.g. assets/portrait.jpg) and put
    // that path here. Leave it null to keep the empty "PORTRAIT" placeholder.
    portrait: null,
    // shown as a small floating tag overlapping the portrait photo
    caption: "Usually mid color-grade.",
    paragraphs: [
      "I'm Tharun — an editor, photographer and filmmaker based out of Chennai, currently studying Electrical and Electronics Engineering at VIT.",
      "The engineering side isn't separate from the creative side — I like building the tools I edit with as much as I like editing. A beat-detection cutter for Premiere Pro started as a way to save myself time; it's now part of how I work.",
      "Outside of freelance work, I run the technical side of my college's Film Society — organizing challenges that push people to write, shoot and cut a film in a weekend.",
    ],
    kit: ["Premiere Pro", "DaVinci Resolve", "After Effects", "Lightroom", "Photoshop", "CEP / ExtendScript"],
  },

  contact: {
    email: "hello@tharunkumar.example",
    socials: [
      { label: "Instagram", url: "https://www.instagram.com/framesoftk/" },
      { label: "YouTube",   url: "https://youtube.com/" },
      { label: "LinkedIn",  url: "https://linkedin.com/" },
    ],
  },
};
