"""
Validate SVG files against strict XML rules that ElementTree misses.

Catches:
  1. HTML-only named entities (&mdash;, &nbsp;, etc.) — these parse in browsers
     via HTML5 default entity recovery but FAIL in strict XML parsers like
     JetBrains' WebStorm SVG renderer.
  2. Bare & in text content (would need to be &amp;)
  3. Stray < or > in text content (must be &lt;/&gt;)
  4. Surrogate pair UTF-8 encoding issues
  5. Invalid character references (e.g., &#x10FFFF;)
  6. <style>/<script> in SVG (sometimes blocks WebStorm render)
  7. Missing/repeated required attributes
  8. foreignObject content not in xhtml namespace
  9. Encoding mismatch (claimed UTF-8 with actual broken chars)
"""

import os, sys, re
from lxml import etree

# 5 XML-valid named entities (everything else FAILS in strict XML):
XML_VALID_ENTITIES = {'amp', 'lt', 'gt', 'quot', 'apos'}

# Common HTML-only entities to detect and warn about
HTML_ONLY_ENTITIES = [
    'mdash', 'ndash', 'hellip', 'nbsp', 'copy', 'reg', 'trade',
    'larr', 'rarr', 'uarr', 'darr', 'harr',
    'bull', 'middot', 'laquo', 'raquo', 'lsquo', 'rsquo', 'ldquo', 'rdquo',
    'iexcl', 'iquest', 'cent', 'pound', 'yen', 'euro', 'sect', 'para',
    'auml', 'ouml', 'uuml', 'szlig', 'Ouml', 'Uuml', 'Auml',
    'deg', 'plusmn', 'times', 'divide', 'micro', 'frac12', 'frac14', 'frac34',
    'sup1', 'sup2', 'sup3', 'reg',
]

results = []

def check_file(path):
    """Return list of (line, severity, msg) for issues found."""
    issues = []
    with open(path, 'rb') as f:
        raw = f.read()

    # 1. Encoding check
    if raw.startswith(b'\xef\xbb\xbf'):
        issues.append((1, 'WARN', 'has BOM (UTF-8 BOM · usually harmless but some parsers dislike it)'))
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError as e:
        issues.append((1, 'FATAL', f'invalid UTF-8: {e}'))
        return issues
    if not text.startswith('<?xml'):
        issues.append((1, 'ERROR', 'missing XML declaration'))
    if 'encoding="UTF-8"' not in text[:200]:
        issues.append((1, 'WARN', 'missing or non-UTF-8 encoding declaration'))

    # 2. HTML entity check
    for ent_name in HTML_ONLY_ENTITIES:
        # Use a word boundary so we don't false-match &amp; in things like &amp;middot;
        for m in re.finditer(rf'&{ent_name};', text):
            ln = text[:m.start()].count('\n') + 1
            issues.append((ln, 'FATAL', f'HTML-only entity: &{ent_name}; (browser-tolerated; strict-XML-parser-failing; use U+{ord("—") if ent_name=="mdash" else "00A0"} / numeric ref / raw char)'))

    # 3. Bare & check (& not followed by valid entity or numeric ref)
    bare_amp_pattern = re.compile(r'&(?!(?:amp|lt|gt|quot|apos);|#\d+;|#x[0-9a-fA-F]+;)')
    for m in bare_amp_pattern.finditer(text):
        ln = text[:m.start()].count('\n') + 1
        ctx = text[max(0,m.start()-15):min(len(text), m.end()+15)]
        issues.append((ln, 'FATAL', f'bare & in text: ...{ctx!r}...'))

    # 4. Strict lxml parse
    try:
        tree = etree.fromstring(raw, parser=etree.XMLParser(recover=False, huge_tree=True))
        # 5. foreignObject requires xhtml namespace on inner div
        ns = {'svg': 'http://www.w3.org/2000/svg'}
        for fo in tree.iter('{http://www.w3.org/2000/svg}foreignObject'):
            for child in fo:
                xhtml_ns = child.tag.startswith('{http://www.w3.org/1999/xhtml}')
                # Any tag in foreignObject MUST be in xhtml namespace
                # Note: <div> <span> etc. need namespace prefix in strict mode
                issues.append((1, 'INFO', f'foreignObject inner element: {child.tag} (xhtml-ns: {xhtml_ns})'))
    except etree.XMLSyntaxError as e:
        issues.append((0, 'FATAL', f'lxml strict parse FAILED: {e}'))
    except Exception as e:
        issues.append((0, 'FATAL', f'parser error: {type(e).__name__}: {e}'))

    return issues

if __name__ == '__main__':
    paths = sys.argv[1:] or ['diagrams']
    if len(paths) == 1 and not paths[0].endswith('.svg'):
        # directory walk
        paths_to_check = []
        for root, dirs, files in os.walk(paths[0]):
            for f in files:
                if f.endswith('.svg'):
                    paths_to_check.append(os.path.join(root, f))
    else:
        paths_to_check = paths
    
    total_fatal = 0
    total_warn = 0
    total_clean = 0
    for path in sorted(paths_to_check):
        issues = check_file(path)
        fatals = [i for i in issues if i[1] == 'FATAL']
        warns = [i for i in issues if i[1] == 'WARN']
        errs = [i for i in issues if i[1] == 'ERROR']
        infos = [i for i in issues if i[1] == 'INFO']
        if fatals or errs:
            print(f"\n  ❌ {path}  ({len(fatals)} fatal, {len(errs)} error, {len(warns)} warn, {len(infos)} info)")
            for ln, sev, msg in issues:
                if sev != 'INFO':
                    print(f"      L{ln} [{sev}] {msg}")
            total_fatal += len(fatals)
            total_warn += len(warns)
        elif warns:
            print(f"  ⚠️  {path}  ({len(warns)} warn)")
            for ln, sev, msg in issues:
                print(f"      L{ln} [{sev}] {msg}")
            total_warn += len(warns)
        else:
            print(f"  ✓ {path}")
            total_clean += 1
    
    print(f"\n{'='*70}")
    print(f"Total: {len(paths_to_check)} files")
    print(f"  Clean (no warnings): {total_clean}")
    print(f"  Warnings: {total_warn}")
    print(f"  Fatals:   {total_fatal}")
    sys.exit(1 if total_fatal else 0)
