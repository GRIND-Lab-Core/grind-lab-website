"""Refresh the three member directories on the static Team page."""

import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH_GROUPS = {"Research Assistant": "research-assistants", "Research Mentee": "research-mentees"}
LINK_ICONS = {"GitHub": "fab fa-github", "LinkedIn": "fab fa-linkedin-in", "Google Scholar": "fas fa-graduation-cap"}


def profile_card(member, logos):
    name = escape(member["name"])
    role = " · ".join(filter(None, (member["role"], member.get("period") or member.get("year"))))
    school = member["affiliation"]
    if member.get("photo"):
        portrait = f'<img src="{escape(member["photo"])}" alt="" width="540" height="720" loading="lazy" decoding="async">'
    else:
        initials = escape("".join(part[0] for part in member["name"].split()))
        portrait = f'<span class="team-initials" aria-hidden="true">{initials}</span>'

    label = escape(member.get("affiliation_label", ""))
    school_name = f'<small>{label}</small>{escape(school)}' if label else escape(school)
    department = member.get("department")
    if department:
        school_name += f'<span class="school-department">{escape(department)}</span>'

    lines = [
        '        <article class="team-card member-profile">',
        '          <div class="team-card-photo">',
        f'            {portrait}',
    ]
    if member.get("bio"):
        lines.extend([
            '            <details class="team-bio" name="member-biography">',
            '              <summary class="bio-trigger">',
            f'                <span class="sr-only">Biography of {name}</span>',
            '                <i class="bio-indicator fas fa-circle-info" aria-hidden="true"></i>',
            '              </summary>',
            '              <div class="team-bio-bubble">',
            f'                <p tabindex="0">{escape(member["bio"], quote=False)}</p>',
            '              </div>',
            '            </details>',
        ])

    lines.extend([
        '          </div>',
        '          <div class="team-card-body">',
        f'            <p class="team-level">{escape(role)}</p>',
        f'            <h3>{name}</h3>',
        '            <div class="team-card-school">',
        f'              <img class="school-logo" src="{escape(logos[school])}" alt="" loading="lazy" decoding="async">',
        f'              <p>{school_name}</p>',
        '            </div>',
    ])
    if member.get("email"):
        email = escape(member["email"])
        lines.append(f'            <a class="team-card-email" href="mailto:{email}">{email}</a>')
    if member.get("tags"):
        tags = " ".join(f'<span class="member-tag">{escape(tag)}</span>' for tag in member["tags"])
        lines.append(f'            <div class="team-card-tags">{tags}</div>')
    if member.get("project"):
        lines.append(f'            <p class="team-card-research"><strong>Research project</strong>{escape(member["project"])}</p>')
    else:
        topic = member.get("topic") or member["research"]
        lines.append(f'            <p class="team-card-research">{escape(topic, quote=False)}</p>')
    if member.get("links"):
        lines.append('            <div class="team-card-links">')
        for service, url in member["links"].items():
            lines.append(
                f'              <a class="team-card-link" href="{escape(url)}" target="_blank" rel="noopener noreferrer" '
                f'aria-label="{name} on {escape(service)}" title="{escape(service)}">'
                f'<i class="{LINK_ICONS[service]}" aria-hidden="true"></i></a>'
            )
        lines.append('            </div>')
    lines.extend(['          </div>', '        </article>'])
    return "\n".join(lines)


def main():
    data = json.loads((ROOT / "data/team.json").read_text(encoding="utf-8"))
    groups = {"lab-members": data["phd_students"] + data["ms_students"], "research-assistants": [], "research-mentees": []}
    for member in data["research_profiles"]:
        groups[RESEARCH_GROUPS[member["role"]]].append(member)

    page = ROOT / "team.html"
    html = page.read_text(encoding="utf-8")
    for group, members in groups.items():
        start, end = f"<!-- {group} -->", f"<!-- /{group} -->"
        before, section = html.split(start, 1)
        _, after = section.split(end, 1)
        cards = "\n\n".join(profile_card(member, data["school_logos"]) for member in members)
        html = before + start + "\n" + cards + "\n        " + end + after
    page.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
