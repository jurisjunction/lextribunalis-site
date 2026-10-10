# lextribunalis.com

The website for LexTribunalis, case management for diocesan marriage tribunals.

```bash
python3 build.py
```

reads the page bodies in `_src/pages/`, wraps each in the shared layout, and
writes the finished site into `docs/`, which GitHub Pages serves. It stops if
a link or picture leads nowhere. There are no dependencies beyond Python 3.

To add a page, add a file to `_src/pages/` and, if it belongs in the header,
a line to `NAV` in `build.py`.

The pictures of the application are taken from the application itself,
running with invented data, by `_src/shots.cjs`. `_src/review.cjs` takes a
picture of every page of the built site at desktop and telephone width, for
reading it over before publishing.

The typefaces are EB Garamond and Geist, each under the SIL Open Font License
(`docs/assets/fonts/`).
