"""Render the lab catalog and sync the publication tab in the sibling personal site."""

import json
import re
import shutil
from collections import Counter
from html import escape
from itertools import groupby
from pathlib import Path
from textwrap import indent
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
LAB_PUBLICATIONS = "https://grind-lab-core.github.io/grind-lab-website/publications.html"
TYPES = {
    "journal": ("Journal article", "Journal articles"),
    "conference": ("Conference paper", "Conference papers"),
    "chapter": ("Book chapter", "Book chapters"),
    "preprint": ("Preprint", "Preprints"),
    "abstract": ("Meeting abstract", "Meeting abstracts"),
    "thesis": ("Dissertation", "Dissertations"),
}


def publication_row(record):
    url = escape(record["url"], quote=True)
    title = escape(record["title"])
    kind = record["type"]
    alias = f' data-search-alias="{escape(record["alternateTitle"], quote=True)}"' if record.get("alternateTitle") else ""
    authors = escape(record["authors"]).replace("Zhou, B.", "<strong>Zhou, B.</strong>")
    links = "".join(
        f' <a class="version-link" href="{escape(link["url"], quote=True)}">{escape(link["label"])}</a>'
        for link in record.get("related", [])
    )
    return f"""          <li class="pub-record" data-type="{kind}"{alias}>
            <span class="pub-type">{TYPES[kind][0]}</span>
            <h3><a href="{url}">{title}</a></h3>
            <p class="pub-authors">{authors}</p>
            <p class="pub-venue"><cite>{escape(record["venue"])}</cite>{links}</p>
          </li>"""


def render_statistics(cv_records):
    counts = Counter(record["type"] for record in cv_records)
    short_names = {"journal": "Journ.", "conference": "Conf.", "chapter": "Ch.", "preprint": "Prepr."}
    return "\n".join(
        f'        <div><dt><span class="stat-name">{TYPES[kind][1]}</span>'
        f'<abbr class="stat-short" title="{TYPES[kind][1]}" aria-hidden="true">{short}</abbr></dt>'
        f'<dd>{counts[kind]}</dd></div>' for kind, short in short_names.items()
    )


def render_years(records, prefix):
    groups = []
    by_year = sorted(records, key=lambda r: -r["year"])
    for year, items in groupby(by_year, key=lambda r: r["year"]):
        rows = "\n".join(publication_row(item) for item in items)
        groups.append(f"""      <section class="pub-year" data-year="{year}" aria-labelledby="{prefix}-{year}">
        <h2 id="{prefix}-{year}">{year}</h2>
        <ul>
{rows}
        </ul>
      </section>""")
    return "\n".join(groups)


def render(cv_records, additional):
    records = cv_records + additional
    kinds = {record["type"] for record in records}
    type_options = ['<option value="">All types</option>'] + [
        f'<option value="{key}">{plural}</option>' for key, (_, plural) in TYPES.items() if key in kinds
    ]
    years = sorted({record["year"] for record in records}, reverse=True)
    year_options = ['<option value="">All years</option>'] + [f'<option>{year}</option>' for year in years]
    return "\n".join([
        '      <form class="pub-filters" id="pub-filters" role="search" aria-label="Filter publications" hidden>',
        f'        <label>Publication type<select id="pub-type">{"".join(type_options)}</select></label>',
        f'        <label>Year<select id="pub-year">{"".join(year_options)}</select></label>',
        '        <label class="pub-search">Search<input type="search" id="pub-query" placeholder="Title, author, or venue"></label>',
        '        <button type="reset" class="btn">Reset filters</button>',
        '      </form>',
        f'      <p class="pub-count" id="pub-count" role="status">{len(cv_records)} CV entries · {len(additional)} additional works</p>',
        render_years(cv_records, "year"),
        '      <details class="pub-additional" id="pub-additional">',
        f'        <summary>Additional works <span id="additional-count">({len(additional)})</span></summary>',
        render_years(additional, "additional-year"),
        '      </details>',
        '      <p class="pub-empty" id="pub-empty" hidden>No publications match these filters.</p>',
    ])


def replace_block(html, name, markup):
    start, end = f"<!-- {name} -->", f"<!-- /{name} -->"
    before, block = html.split(start, 1)
    _, after = block.split(end, 1)
    return before + start + "\n" + markup + "\n      " + end + after


def sync_personal_site(lab_html):
    personal = ROOT.parent / "bzbarrett.github.io"
    page = personal / "index.html"
    if not page.is_file():
        return

    personal_html = page.read_text(encoding="utf-8")
    if "<!-- lab publications -->" not in personal_html:
        return
    catalog = re.search(r"<main\b[^>]*>(.*?)</main>", lab_html, re.DOTALL).group(1).strip("\n").rstrip()
    # Local project links in the catalog still lead to the lab when viewed on the personal site.
    catalog = re.sub(r'(?<=href=")[^"]+', lambda link: urljoin(LAB_PUBLICATIONS, link[0]), catalog)
    html = replace_block(personal_html, "lab publications", indent(catalog, "  "))
    for asset in ("css/publications.css", "js/publications.js"):
        shutil.copyfile(ROOT / "assets" / asset, personal / asset)
    page.write_text(html, encoding="utf-8")


def main():
    records = json.loads((ROOT / "data/publications.json").read_text(encoding="utf-8"))
    if len({r["url"] for r in records}) != len(records):
        raise ValueError("Every record needs a distinct publication URL.")
    page = ROOT / "publications.html"
    cv_records = [r for r in records if not r.get("additional")]
    additional = [r for r in records if r.get("additional")]
    html = page.read_text(encoding="utf-8")
    for name, markup in [("statistics", render_statistics(cv_records)),
                         ("bibliography", render(cv_records, additional))]:
        html = replace_block(html, name, markup)
    page.write_text(html, encoding="utf-8")
    sync_personal_site(html)


if __name__ == "__main__":
    main()
