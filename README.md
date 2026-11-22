# GRIND Lab Website

**Geospatial Responsible AI for Nature-human Dynamics Laboratory**

Department of Geography & Sustainability  
University of Tennessee, Knoxville

---

## Project Structure

```text
grind-lab-website/

├── index.html              # Home page
├── news.html               # News & Announcements
├── research.html           # Four illustrated research directions and their projects
├── projects.html           # Redirect for the former research URL
├── publications.html       # Filterable publications catalog
├── geoprobe.html           # In-press GeoProbe record
├── resources.html          # Resource list in reverse chronological order
├── aag-2026-giser.html     # The 2026 AAG GISER Symposium program
├── team.html               # Team members and research mentees
├── contact.html            # Contact & Collaboration
├── apply.html              # Research Opportunities & Application Information
│
├── assets/
│   ├── css/
│   │   ├── main.css               # Global styles, navbar, page headers, footer, utilities
│   │   ├── home.css               # Home page styles
│   │   ├── news.css               # News page styles
│   │   ├── news-rows.css          # Shared homepage news and resource rows
│   │   ├── resources.css          # Resource list and conference program styles
│   │   ├── projects.css           # Research page styles
│   │   ├── publications.css       # Publication catalog and record styles
│   │   ├── team.css               # Team page styles
│   │   ├── contact.css            # Contact page styles
│   │   └── apply.css              # Application page styles
│   │
│   ├── js/
│   │   ├── main.js                # Navigation and return-to-top controls
│   │   ├── news.js                # Combined news category and text search
│   │   ├── resources.js           # Order dated resources before undated entries
│   │   ├── research.js            # Playback for the visible research illustrations
│   │   ├── team.js                # Interactive PI portrait
│   │   └── publications.js        # Publication search and filters
│   │
│   ├── research/                  # Homepage scene, direction illustrations and local Three.js
│   ├── fonts/                     # Locally served interface icons
│   │
│   └── images/
│       ├── logo/                   # GRIND Lab logos
│       ├── team/                   # Team member photos
│       ├── projects/               # Project and event images
│       ├── partners/               # Institutional logos
│       └── news/                   # News images and homepage thumbnails
│
├── data/
│   ├── publications.json           # Bibliographic records and stable per-work links
│   └── team.json                   # Team member data
└── scripts/
    ├── build_publications.py       # Refresh the static publication catalog
    ├── build_research_posters.mjs  # Regenerate static illustrations from the animated scene geometry
    ├── build_team.py               # Refresh all three member directories
    └── preview.py                  # Local preview of both sites
```

---

## Local preview

From the repository root, run `python3 scripts/preview.py` and open `http://127.0.0.1:5500/`. With the `bzbarrett.github.io` checkout beside this repository, the navigation portrait opens the personal site at `/personal/`. Both sites are static and need no build step.

The homepage cycles through Observe, Model, Understand, and Act in ten seconds. Choose a topic, drag the landscape to rotate, or use the pause and restart controls. With the landscape focused, the arrow keys select topics and Space toggles playback. Reduced-motion preferences pause autoplay. Three.js and the Canvas fallback are bundled in `assets/research/`.

## Updating publications

Edit `data/publications.json` and run `python3 scripts/build_publications.py` from the lab repository root. The script rebuilds the CV category totals and the searchable catalog. When the personal site is checked out alongside the lab, the same command refreshes its Publication tab, including the styles, filters, and dated Google Scholar figures. Records marked `"additional": true` appear under Additional works. Update the dated Google Scholar figures in `publications.html` when a new snapshot is available.

## Updating resources

Add resource rows to `resources.html` with an ISO date in `<time datetime="YYYY-MM-DD">`. Dated entries appear newest first, followed by undated placeholders.

## Updating team profiles

Edit `phd_students`, `ms_students`, or `research_profiles` in `data/team.json` and run `python3 scripts/build_team.py` to refresh the three directories on `team.html`. Match each affiliation to its image in `school_logos`. Store member photos in `assets/images/team/` and omit `photo` to display initials.

## Contact

**Dr. Bing Zhou**  
[bzhou11@utk.edu](mailto:bzhou11@utk.edu)

Department of Geography & Sustainability  
University of Tennessee, Knoxville
