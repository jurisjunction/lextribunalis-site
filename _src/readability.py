#!/usr/bin/env python3
"""
How hard each page is to read, by counting: words, sentence length, and the
Flesch scores. A reading ease of 60 to 70 is plain English; the grade is the
year of schooling the page asks for. Long sentences are listed.

  python3 _src/readability.py
"""
import html, pathlib, re

DOCS = pathlib.Path(__file__).parent.parent / "docs"


def syllables(word):
    word = re.sub(r"[^a-z]", "", word.lower())
    if not word:
        return 0
    count = len(re.findall(r"[aeiouy]+", word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and count > 1:
        count -= 1
    return max(count, 1)


def text_of(page):
    main = re.search(r"(?s)<main[^>]*>(.*)</main>", page).group(1)
    main = re.sub(r"(?s)<(figcaption|form|script|style)\b.*?</\1>", " ", main)
    main = re.sub(r"</(p|h1|h2|h3|li|dt|dd)>", ". ", main)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", main)))


total = 0
print(f"{'page':22s} {'words':>6s} {'ease':>6s} {'grade':>6s} {'words/sentence':>15s}")
for path in sorted(DOCS.glob("**/index.html")):
    text = text_of(path.read_text())
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.split()) > 1]
    words = [w for s in sentences for w in re.findall(r"[A-Za-z][A-Za-z'’-]*", s)]
    syl = sum(syllables(w) for w in words)
    per_sentence = len(words) / len(sentences)
    ease = 206.835 - 1.015 * per_sentence - 84.6 * syl / len(words)
    grade = 0.39 * per_sentence + 11.8 * syl / len(words) - 15.59
    name = "/" + str(path.parent.relative_to(DOCS)).replace(".", "")
    print(f"{name:22s} {len(words):6d} {ease:6.0f} {grade:6.1f} {per_sentence:15.1f}")
    total += len(words)
    for s in sentences:
        if len(s.split()) > 42:
            print(f"    {len(s.split())} words: {s[:110]}...")
print(f"{'all pages':22s} {total:6d}")
