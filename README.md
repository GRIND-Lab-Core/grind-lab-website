# GRIND Lab Website

**Geospatial Responsible AI for Nature-human Dynamics Laboratory**
Department of Geography & Sustainability, University of Tennessee, Knoxville

---

## Project Structure

```
grind_lab_website/
├── index.html            # Home page
├── news.html             # News & Announcements
├── projects.html         # Research Projects & Publications
├── team.html             # Team members
├── contact.html          # Contact & Join the Lab (FAQ)
├── apply.html            # Apply to GRIND Lab
│
├── assets/
│   ├── css/
│   │   ├── main.css      # Global styles: variables, navbar, footer, utilities
│   │   ├── home.css      # Home page specific styles
│   │   ├── news.css      # News page styles
│   │   ├── projects.css  # Projects page styles
│   │   ├── team.css      # Team page styles
│   │   └── contact.css   # Contact/Apply page styles
│   │
│   ├── js/
│   │   ├── main.js       # Global JS: navbar, animations, FAQ, filters
│   │   └── particles.js  # Hero canvas particle network animation
│   │
│   └── images/
│       ├── logo/
│       │   ├── logo.svg        # Full-color logo (use on light backgrounds)
│       │   └── logo-white.svg  # White logo (use on dark backgrounds)
│       ├── team/               # Team member photos → name-surname.jpg
│       ├── projects/           # Project images → project-id.jpg
│       └── news/               # News/post images → news-id.jpg
│
└── data/
    ├── news.json         # News items data
    ├── projects.json     # Research projects data
    ├── team.json         # Team members data
    └── publications.json # Publications list
```

---

## How to Update Content

### Adding a News Item
Edit `data/news.json` and add a new entry following the existing format. Then add a corresponding `<article class="news-card">` block in `news.html`.

### Adding a Project
Edit `data/projects.json` and add a project entry. Add a corresponding `.project-card` in `projects.html`.

### Adding a Team Member
1. Add their photo to `assets/images/team/firstname-lastname.jpg`
2. Edit `data/team.json` and add their entry under the appropriate section
3. Add a `.team-card` in `team.html` under the appropriate category section

### Adding a Publication
Edit `data/publications.json` and add the publication. Optionally add a display entry in `projects.html`.

### Replacing Placeholders
Search for `PLACEHOLDER` across all HTML files to find all placeholder text that needs to be filled in.

---

## Deployment

This is a static website that can be deployed to:
- **GitHub Pages** — Enable in repo Settings > Pages > Deploy from branch `main`
- **Netlify** — Drag and drop or connect to the GitHub repo
- **UTK Web Hosting** — Upload via FTP/SFTP

---

## Technologies

- **HTML5 / CSS3 / Vanilla JavaScript** — No frameworks, pure web standards
- **Google Fonts** — Inter typeface
- **Font Awesome 6** — Icons (via CDN)
- **Canvas API** — Hero particle network animation

---

## Contact

Dr. Bing Zhou · [bzhou@utk.edu](mailto:bzhou@utk.edu)
Department of Geography & Sustainability
University of Tennessee, Knoxville
