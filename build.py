#!/usr/bin/env python3
"""
Builds the static site for lextribunalis.com.

  python3 build.py

Reads page bodies from _src/pages/*.html, wraps each in the shared layout
(header, footer, meta tags) and writes the finished pages into docs/, which
is what GitHub Pages serves. Site-wide settings are in CONFIG and NAV below.
No dependencies beyond Python 3.

Each page begins with a comment of "key: value" lines: path, title,
description, and nav (which link in the header it belongs under).

To add a page for a new part of LexTribunalis, add a file to _src/pages and,
if it should be in the header, a line to NAV.
"""
import datetime, html, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "_src" / "pages"
OUT = ROOT / "docs"

CONFIG = {
    "domain": "https://lextribunalis.com",
    "name": "LexTribunalis",
    "email": "richard@lextribunalis.com",
    # The contact form posts to FormSubmit, which emails the address above.
    "form_endpoint": "https://formsubmit.co/richard@lextribunalis.com",
}

NAV = [
    ("what-it-does", "/what-it-does/", "What it does"),
    ("yours-to-change", "/yours-to-change/", "Yours to change"),
    ("planned", "/planned/", "Planned"),
    ("for-it", "/for-it/", "For IT"),
    ("about", "/about/", "About"),
    ("contact", "/contact/", "Contact"),
]

# Wording the site is meant to do without. The build stops if any appears.
UNWANTED = ["—", "seamless", "streamline", "empower", "leverage", "cutting-edge", "game-chang", "revolution", "unlock"]


def header(active):
    links = []
    for key, href, label in NAV:
        current = ' aria-current="page"' if key == active else ""
        links.append(f'<a href="{href}"{current}>{label}</a>')
    return f"""<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/">LexTribunalis</a>
    <nav class="nav" aria-label="Main">{''.join(links)}</nav>
  </div>
</header>"""


def footer():
    year = datetime.date.today().year
    return f"""<footer class="site-footer">
  <div class="wrap footer-inner">
    <div>
      <p class="brand">LexTribunalis</p>
      <p>Case management for diocesan marriage tribunals.</p>
    </div>
    <div>
      <p><a href="mailto:{CONFIG['email']}">{CONFIG['email']}</a></p>
      <p>Toronto, Ontario</p>
    </div>
    <div class="small">
      <p>Every name, cause and document shown on this site is invented.</p>
      <p>This site sets no cookies and does no tracking.</p>
      <p>&copy; {year} Richard Verver</p>
    </div>
  </div>
</footer>"""


def layout(meta, body):
    title = meta["title"]
    full_title = title if meta["path"] == "/" else f"{title} | LexTribunalis"
    description = meta["description"]
    url = CONFIG["domain"] + meta["path"]
    robots = '<meta name="robots" content="noindex">\n' if meta.get("noindex") else ""
    return f"""<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(full_title)}</title>
<meta name="description" content="{html.escape(description)}">
<link rel="canonical" href="{url}">
{robots}<meta property="og:type" content="website">
<meta property="og:site_name" content="LexTribunalis">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="{html.escape(full_title)}">
<meta property="og:description" content="{html.escape(description)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{CONFIG['domain']}/assets/img/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/eb-garamond-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<meta name="theme-color" content="#5c1a24">
</head>
<body>
{header(meta.get('nav'))}
<main id="main">
{body}
</main>
{footer()}
</body>
</html>
"""


def parse(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    meta = {}
    for line in m.group(1).strip().splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    body = text[m.end():]
    for key, value in CONFIG.items():
        body = body.replace("{{" + key + "}}", value)
    return meta, body


def check(pages):
    """Stops the build on a link or image that leads nowhere, or on wording the site avoids."""
    problems = []
    for dest, page in pages:
        for target in re.findall(r'(?:href|src)="(/[^"#?]*)', page):
            found = OUT / target.lstrip("/")
            if not (found.is_file() or (found / "index.html").is_file()):
                problems.append(f"{dest.relative_to(ROOT)}: nothing at {target}")
        lowered = page.lower()
        for word in UNWANTED:
            if word in lowered:
                problems.append(f"{dest.relative_to(ROOT)}: contains {word!r}")
    return problems


def main():
    pages, listed = [], []
    for source in sorted(SRC.glob("*.html")):
        meta, body = parse(source)
        path = meta["path"]
        dest = OUT / ("404.html" if path == "/404" else "index.html" if path == "/" else path.strip("/") + "/index.html")
        dest.parent.mkdir(parents=True, exist_ok=True)
        page = layout(meta, body)
        dest.write_text(page, encoding="utf-8")
        pages.append((dest, page))
        if not meta.get("noindex"):
            listed.append(path)
        print("built", dest.relative_to(ROOT))
    today = datetime.date.today().isoformat()
    urls = "".join(f"<url><loc>{CONFIG['domain']}{p}</loc><lastmod>{today}</lastmod></url>" for p in listed)
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n')
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {CONFIG['domain']}/sitemap.xml\n")
    (OUT / "CNAME").write_text("lextribunalis.com\n")
    (OUT / ".nojekyll").write_text("")
    problems = check(pages)
    for problem in problems:
        print("PROBLEM", problem, file=sys.stderr)
    if problems:
        sys.exit(1)


if __name__ == "__main__":
    main()
