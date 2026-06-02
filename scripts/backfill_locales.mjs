#!/usr/bin/env node
/**
 * Backfills missing translation keys in src/locales/*.ts. Handles two cases:
 *
 * 1. MISSING TOP-LEVEL SECTIONS (e.g. `volumes`, `errorBoundary`, `notFound`).
 *    The full nested object is copied from en.ts and inserted before the
 *    closing `}` of the locale's translation block.
 *
 * 2. MISSING KEYS WITHIN EXISTING SECTIONS (e.g. `common.volumes`,
 *    `layout.collapse_sidebar`). The English value is inserted before the
 *    closing `}` of the corresponding section in the locale file.
 *
 * Idempotent: re-running is a no-op once the file is complete. Preserves the
 * file's existing formatting because insertion is line-based.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '..', 'src', 'locales');

const enSource = fs.readFileSync(path.join(localesDir, 'en.ts'), 'utf8');
const enSections = extractSections(enSource);

function extractSections(source) {
  // Returns Map<sectionName, { start, end, indent, text }> for each top-level
  // section under `translation: { ... }`.
  const out = new Map();
  const translationMatch = source.match(/^\s*"?translation"?:\s*\{/m);
  if (!translationMatch) throw new Error('Could not find translation: { in source');
  const translationStart = translationMatch.index + translationMatch[0].length;
  const sectionHeaderRe = /^(\s{4})("?)(\w+)\2:\s*\{/gm;
  let m;
  const headers = [];
  while ((m = sectionHeaderRe.exec(source)) !== null) {
    if (m.index < translationStart) continue;
    const name = m[3];
    const startOfName = m.index + m[1].length + m[2].length;
    headers.push({ name, start: m.index, contentStart: startOfName, indent: m[1] });
  }
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const end = findMatchingBrace(source, h.contentStart + h.name.length + 2);
    out.set(h.name, {
      start: h.start,
      end: end + 1,
      indent: h.indent,
      text: source.substring(h.start, end + 1),
    });
  }
  return out;
}

function findMatchingBrace(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const enObj = parseLocale(enSource);
const enKeysByTopSection = keysByTopSection(enObj.translation);

function parseLocale(source) {
  let cleaned = source.replace(/^(export\s+)?const\s+\w+\s*=\s*/, '');
  cleaned = cleaned.replace(/;\s*export\s+default\s+\w+;\s*$/, '');
  cleaned = cleaned.replace(/;\s*$/, '');
  return new Function(`return ${cleaned}`)();
}

function keysByTopSection(translation) {
  const out = new Map();
  for (const top of Object.keys(translation)) {
    const inner = translation[top];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      out.set(top, Object.keys(inner));
    } else {
      out.set(top, []);
    }
  }
  return out;
}

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.ts') && f !== 'en.ts');

let totalAdded = 0;
for (const file of files) {
  const filePath = path.join(localesDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  let updated = source;
  let added = 0;

  // (1) Missing top-level sections: insert the whole block.
  let parsed = parseLocale(updated);
  const missingTopSections = [...enSections.keys()].filter((k) => !(k in parsed.translation));
  for (const section of missingTopSections) {
    const block = enSections.get(section);
    updated = insertTopSection(updated, block);
    added++;
  }

  // Re-parse after top-level insertions so the existing-keys map reflects
  // the freshly-inserted sections.
  parsed = parseLocale(updated);
  const existing = keysByTopSection(parsed.translation);

  // (2) Missing keys inside existing top-level sections: insert the key.
  // We iterate the sections in REVERSE order so that earlier section indices
  // stay valid after each insertion.
  const topLevelNames = [...enKeysByTopSection.keys()];
  for (let idx = topLevelNames.length - 1; idx >= 0; idx--) {
    const top = topLevelNames[idx];
    const enInnerKeys = enKeysByTopSection.get(top);
    const existingKeys = new Set(existing.get(top) || []);
    const missingInSection = enInnerKeys.filter((k) => !existingKeys.has(k));
    if (missingInSection.length === 0) continue;
    // Re-extract on every iteration because the file has grown.
    const updatedSections = extractSections(updated);
    const localeSection = updatedSections.get(top);
    if (!localeSection) continue;
    const sectionLines = localeSection.text.split('\n');
    for (const key of missingInSection) {
      const enValue = enObj.translation[top][key];
      const enValueRepr = JSON.stringify(enValue);
      const newLine = `${localeSection.indent}  ${key}: ${enValueRepr},`;
      let insertAt = -1;
      for (let i = sectionLines.length - 1; i >= 0; i--) {
        const t = sectionLines[i].trim();
        if (!t) continue;
        if (t === '}') continue;
        if (t.endsWith(',')) { insertAt = i + 1; break; }
        if (t.endsWith('}') || /^\s*\w+:/.test(t)) {
          sectionLines[i] = sectionLines[i] + ',';
          insertAt = i + 1;
          break;
        }
      }
      if (insertAt === -1) {
        for (let i = sectionLines.length - 1; i >= 0; i--) {
          if (sectionLines[i].trim() === '}') { insertAt = i; break; }
        }
      }
      sectionLines.splice(insertAt, 0, newLine);
    }
    const newSectionText = sectionLines.join('\n');
    updated = updated.substring(0, localeSection.start) + newSectionText + updated.substring(localeSection.end);
    added += missingInSection.length;
  }

  if (added > 0) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[fix]  ${file}: added ${added} keys/sections`);
    totalAdded += added;
  }
}

console.log(`\nDone. ${totalAdded} keys/sections added across ${files.length} locales.`);

function insertTopSection(source, section) {
  const lines = source.split('\n');
  let translationClose = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i] === '  }') { translationClose = i; break; }
  }
  if (translationClose === -1) throw new Error('Could not find a `  }` line in target locale');
  const prev = lines[translationClose - 1];
  if (prev && /^\s{4}\}$/.test(prev)) {
    lines[translationClose - 1] = prev + ',';
  }
  const sectionLines = section.text.split('\n');
  const lastLine = sectionLines[sectionLines.length - 1];
  if (/^\s+}$/.test(lastLine)) {
    sectionLines[sectionLines.length - 1] = lastLine + ',';
  }
  const block = ['', ...sectionLines].join('\n');
  lines.splice(translationClose, 0, block);
  return lines.join('\n');
}
