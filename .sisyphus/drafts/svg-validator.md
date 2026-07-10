# SVG Validator — `.sisyphus/tools/svg_validate.py`

## Purpose
Catches SVG issues that `python3 -c "import xml.etree.ElementTree as ET; ET.parse(...)"` **misses** but WebStorm / IntelliJ SVG renderer (Batik-based), Apache Batik standalone, and any strict XSD validator **will fail on**.

## What it catches (FATAL)
1. **HTML-only named entities** — `&mdash;` `&nbsp;` `&hellip;` `&copy;` `&larr;` `&rarr;` etc.
   Browser auto-recovers these; strict parsers fail with `Entity 'name' not defined`.
2. **Bare `&` in text content** — `?page=1&limit=50` should be `?page=1&amp;limit=50`.
3. **Stray `<` or `>` in text content** — `5 < 10` should be `5 &lt; 10`. Triggers parse failure.
4. **lxml strict parse failure** — catches any of the above + encoding mismatches + DTD violations.

## What it warns (WARN)
5. **BOM at start of file** (harmless to browsers, disliked by some parsers).
6. **Missing XML declaration or non-UTF-8 encoding declaration**.

## What it does NOT catch (limitations)
- **Visual layout issues** — overlapping elements, clipped text, misaligned columns.
  Use headless Chrome screenshot + visual inspection for those.
- **SVG-spec violations** like foreignObject content not in xhtml namespace (browsers tolerate; Batik is permissive too).
- **Semantic accuracy** — wrong VM name, fake auth context, geolocation violations.
  These are caught by plan-vs-artifact audit (T-codes), not by validation.
- **Spec drift** — declared tabs in `<desc>` without corresponding content mockups.

## Usage
```bash
# Validate all SVGs in diagrams/
python3 .sisyphus/tools/svg_validate.py diagrams/

# Validate specific files
python3 .sisyphus/tools/svg_validate.py diagrams/screens/01-dashboard.svg

# Validate a directory of fixtures
python3 .sisyphus/tools/svg_validate.py /tmp/fixtures/
```

Exit code: 0 if all clean, 1 if any FATAL errors.

## Dependencies
```bash
pip install --user lxml
# requires: lxml >= 4.0 (any modern version)
```

If `lxml` not available, the validator can't be run. Standard-library-only fallback would be much weaker (ElementTree is too permissive about HTML entities).

## Tested on
- 112 production SVG files in this repo (all clean, 2026-07-09 audit).
- 3 fixture bad files (HTML entity / bare & / stray <) all detected correctly.
- 1 fixture clean file passes.

## Why WebStorm fails on some SVGs but lxml passes
- WebStorm bundles Apache Batik, which uses XML 1.0 strict entity resolution by default.
- lxml in default mode is similarly strict.
- Chromium and Firefox are permissive: they auto-recover HTML entities and ignore namespace issues inside `<foreignObject>`.
- Therefore: lxml+validator finds issues that BOTH WebStorm AND Firefox would reject (`&mdash;` etc.), but not issues that ONLY WebStorm rejects (like namespace confusion).

## Honcho lesson reference
See Honcho peer `prometheus` for the conclusion documenting this tool.
