const CONTENT = {

  name: "Tharun Kumar",
  role: "Editor. Photographer. Filmmaker.",

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
      image: "https://drive.google.com/file/d/1k1bcL9WyOAwU0VJ0lR29o30n6R0jXOv8/view?usp=sharing",
      video: "https://drive.google.com/file/d/1z8mLwFnMt0f1Z5dY0HT2vqWK2JUexljw/preview",
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
      title: "Add your photo album",
      year: "2026",
      role: "Photographer",
      description: "Placeholder album — replace 'images' below with the real photos from a shoot. List every photo from that shoot in the array; it becomes one clickable album with all of them inside.",
      images: [], // e.g. ["assets/photos/album-name/1.jpg", "assets/photos/album-name/2.jpg"]
      link: null,
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
  ],

  // Career / experience timeline. Sorted top to bottom as you list them.
  history: [
    {
      time: "2026",
      title: "Core Team, Film Society — VIT Chennai",
      body: "Leading the technical side of the club: planning a two-day event built around a 48-hour film challenge, running recruitment, and mentoring newer editors.",
    },
    {
      time: "2026",
      title: "Built a beat-detection auto-cut extension",
      body: "Wrote a Premiere Pro (CEP) extension that analyses a track's beat and automatically slices the timeline — a small tool that grew out of editing too many recap videos by hand.",
    },
    {
      time: "—",
      title: "Add your next chapter",
      body: "Duplicate this block for every gig, internship, or project worth listing — freelance edits, client shoots, film credits.",
    },
  ],

  about: {
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
      { label: "Instagram", url: "https://instagram.com/" },
      { label: "YouTube",   url: "https://youtube.com/" },
      { label: "LinkedIn",  url: "https://linkedin.com/" },
    ],
  },
};
