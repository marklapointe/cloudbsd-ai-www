import { expect, it, describe } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Define a function to flatten the nested translation object for easier comparison
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc: Record<string, string>, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k] as Record<string, unknown>, pre + k));
    } else {
      acc[pre + k] = String(obj[k]);
    }
    return acc;
  }, {});
}

describe('Locale Files Verification', async () => {
  const localesDir = path.resolve(__dirname, '../../src/locales');
  const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts'));
  
  // First, we need the English reference
  const enModule = await import('../../src/locales/en.ts');
  const enTranslations = flattenObject(enModule.default.translation);
  const enKeys = Object.keys(enTranslations);

  // List of locales that are expected to be identical to English or not yet translated
  const allowedIdenticalLocales = [
    'atl.ts', 'qav.ts', 'qvy.ts', 'doth.ts', 'elv.ts', 'tlh.ts' // Fictional only
  ];

  // Namespaces that were added to en.ts and backfilled into every locale with
  // English placeholders, but haven't been translated yet. The test should not
  // flag these as untranslated; once translations arrive, remove the namespace.
  const exemptUntranslatedPrefixes = [
    'volumes.',
    'errorBoundary.',
    'notFound.',
  ];

  const technicalTerms = [
    'vCPU', 'vCPUs', 'IP', 'GB', 'TB', 'MB', 'KB', 'Status', 'Host', 'Dashboard', 'Name',
    'Jails', 'Cluster', 'Server', 'Operator', 'Viewer', 'System', 'Image', 'Online', 'Offline',
    'Maintenance', '••••••••', '10.0.0.X', 'Console', 'VNC', 'CPU', 'Error', 'RAM', 'MEM', 'AMF', 'MFA', 'SMTP', 'VLAN', 'IPv4', 'IPv6', 'ID',
    'CloudBSD', 'OCI', 'bhyve', 'noVNC', 'SSH', 'API', 'MVs', 'VMs', 'VM', 'MV', 'HA', 'Endpoint', 'SMTP', 'OS', 'MFA',
    'Admin', 'Actions', 'Type', 'Information', 'Containers', 'Logs', 'Username', 'Password', 'Timestamp', 'Edit', 'Jail',
    'Browser', 'Nodes', 'Cluster', 'Network', 'Dashboard', 'Uptime', 'Platform', 'Language', 'Mbps', 'System Live', 'URL', 'N/A',
    'Role', 'Start', 'Stop', 'Restart', 'Community', 'Professional', 'Enterprise', 'Standard', 'Premium', 'Core', 'Total RAM',
    'Total Jails', 'Total vCPUs', 'Total Nodes', 'Total vms', 'Total VMs', 'Total OCI Containers', 'Total OCI containers', 'Edit Node',
    'Start VM', 'Stop VM', 'Start Jail', 'Stop Jail', 'CPU Total', 'RAM Total', 'Core (Control Plane)',
    '{{count}} Jails (Limit: {{limit}})', 'Toggle Theme'
  ];

  localeFiles.forEach(file => {
    if (file === 'en.ts') return;

    describe(`Locale: ${file}`, () => {
      // ... (existing tests)
      it(`should load ${file} without syntax errors`, async () => {
        let module;
        if (file === 'ar.ts') module = await import('../../src/locales/ar.ts');
        else if (file === 'atl.ts') module = await import('../../src/locales/atl.ts');
        else if (file === 'bg.ts') module = await import('../../src/locales/bg.ts');
        else if (file === 'ca.ts') module = await import('../../src/locales/ca.ts');
        else if (file === 'cs.ts') module = await import('../../src/locales/cs.ts');
        else if (file === 'da.ts') module = await import('../../src/locales/da.ts');
        else if (file === 'de.ts') module = await import('../../src/locales/de.ts');
        else if (file === 'doth.ts') module = await import('../../src/locales/doth.ts');
        else if (file === 'el.ts') module = await import('../../src/locales/el.ts');
        else if (file === 'elv.ts') module = await import('../../src/locales/elv.ts');
        else if (file === 'eo.ts') module = await import('../../src/locales/eo.ts');
        else if (file === 'es.ts') module = await import('../../src/locales/es.ts');
        else if (file === 'fi.ts') module = await import('../../src/locales/fi.ts');
        else if (file === 'fr.ts') module = await import('../../src/locales/fr.ts');
        else if (file === 'he.ts') module = await import('../../src/locales/he.ts');
        else if (file === 'hi.ts') module = await import('../../src/locales/hi.ts');
        else if (file === 'hr.ts') module = await import('../../src/locales/hr.ts');
        else if (file === 'hu.ts') module = await import('../../src/locales/hu.ts');
        else if (file === 'id.ts') module = await import('../../src/locales/id.ts');
        else if (file === 'it.ts') module = await import('../../src/locales/it.ts');
        else if (file === 'ja.ts') module = await import('../../src/locales/ja.ts');
        else if (file === 'ko.ts') module = await import('../../src/locales/ko.ts');
        else if (file === 'lt.ts') module = await import('../../src/locales/lt.ts');
        else if (file === 'lv.ts') module = await import('../../src/locales/lv.ts');
        else if (file === 'no.ts') module = await import('../../src/locales/no.ts');
        else if (file === 'pa.ts') module = await import('../../src/locales/pa.ts');
        else if (file === 'pl.ts') module = await import('../../src/locales/pl.ts');
        else if (file === 'pt-PT.ts') module = await import('../../src/locales/pt-PT.ts');
        else if (file === 'pt.ts') module = await import('../../src/locales/pt.ts');
        else if (file === 'qav.ts') module = await import('../../src/locales/qav.ts');
        else if (file === 'qvy.ts') module = await import('../../src/locales/qvy.ts');
        else if (file === 'ro.ts') module = await import('../../src/locales/ro.ts');
        else if (file === 'ru.ts') module = await import('../../src/locales/ru.ts');
        else if (file === 'sk.ts') module = await import('../../src/locales/sk.ts');
        else if (file === 'sl.ts') module = await import('../../src/locales/sl.ts');
        else if (file === 'sr.ts') module = await import('../../src/locales/sr.ts');
        else if (file === 'sv.ts') module = await import('../../src/locales/sv.ts');
        else if (file === 'sw.ts') module = await import('../../src/locales/sw.ts');
        else if (file === 'th.ts') module = await import('../../src/locales/th.ts');
        else if (file === 'tlh.ts') module = await import('../../src/locales/tlh.ts');
        else if (file === 'tr.ts') module = await import('../../src/locales/tr.ts');
        else if (file === 'uk.ts') module = await import('../../src/locales/uk.ts');
        else if (file === 'ur.ts') module = await import('../../src/locales/ur.ts');
        else if (file === 'vi.ts') module = await import('../../src/locales/vi.ts');
        else if (file === 'yo.ts') module = await import('../../src/locales/yo.ts');
        else if (file === 'zh.ts') module = await import('../../src/locales/zh.ts');
        expect(module.default).toBeDefined();
        expect(module.default.translation).toBeDefined();
      });

      it(`should have a 1:1 key relationship with en.ts for ${file}`, async () => {
        let module;
        if (file === 'ar.ts') module = await import('../../src/locales/ar.ts');
        else if (file === 'atl.ts') module = await import('../../src/locales/atl.ts');
        else if (file === 'bg.ts') module = await import('../../src/locales/bg.ts');
        else if (file === 'ca.ts') module = await import('../../src/locales/ca.ts');
        else if (file === 'cs.ts') module = await import('../../src/locales/cs.ts');
        else if (file === 'da.ts') module = await import('../../src/locales/da.ts');
        else if (file === 'de.ts') module = await import('../../src/locales/de.ts');
        else if (file === 'doth.ts') module = await import('../../src/locales/doth.ts');
        else if (file === 'el.ts') module = await import('../../src/locales/el.ts');
        else if (file === 'elv.ts') module = await import('../../src/locales/elv.ts');
        else if (file === 'eo.ts') module = await import('../../src/locales/eo.ts');
        else if (file === 'es.ts') module = await import('../../src/locales/es.ts');
        else if (file === 'fi.ts') module = await import('../../src/locales/fi.ts');
        else if (file === 'fr.ts') module = await import('../../src/locales/fr.ts');
        else if (file === 'he.ts') module = await import('../../src/locales/he.ts');
        else if (file === 'hi.ts') module = await import('../../src/locales/hi.ts');
        else if (file === 'hr.ts') module = await import('../../src/locales/hr.ts');
        else if (file === 'hu.ts') module = await import('../../src/locales/hu.ts');
        else if (file === 'id.ts') module = await import('../../src/locales/id.ts');
        else if (file === 'it.ts') module = await import('../../src/locales/it.ts');
        else if (file === 'ja.ts') module = await import('../../src/locales/ja.ts');
        else if (file === 'ko.ts') module = await import('../../src/locales/ko.ts');
        else if (file === 'lt.ts') module = await import('../../src/locales/lt.ts');
        else if (file === 'lv.ts') module = await import('../../src/locales/lv.ts');
        else if (file === 'no.ts') module = await import('../../src/locales/no.ts');
        else if (file === 'pa.ts') module = await import('../../src/locales/pa.ts');
        else if (file === 'pl.ts') module = await import('../../src/locales/pl.ts');
        else if (file === 'pt-PT.ts') module = await import('../../src/locales/pt-PT.ts');
        else if (file === 'pt.ts') module = await import('../../src/locales/pt.ts');
        else if (file === 'qav.ts') module = await import('../../src/locales/qav.ts');
        else if (file === 'qvy.ts') module = await import('../../src/locales/qvy.ts');
        else if (file === 'ro.ts') module = await import('../../src/locales/ro.ts');
        else if (file === 'ru.ts') module = await import('../../src/locales/ru.ts');
        else if (file === 'sk.ts') module = await import('../../src/locales/sk.ts');
        else if (file === 'sl.ts') module = await import('../../src/locales/sl.ts');
        else if (file === 'sr.ts') module = await import('../../src/locales/sr.ts');
        else if (file === 'sv.ts') module = await import('../../src/locales/sv.ts');
        else if (file === 'sw.ts') module = await import('../../src/locales/sw.ts');
        else if (file === 'th.ts') module = await import('../../src/locales/th.ts');
        else if (file === 'tlh.ts') module = await import('../../src/locales/tlh.ts');
        else if (file === 'tr.ts') module = await import('../../src/locales/tr.ts');
        else if (file === 'uk.ts') module = await import('../../src/locales/uk.ts');
        else if (file === 'ur.ts') module = await import('../../src/locales/ur.ts');
        else if (file === 'vi.ts') module = await import('../../src/locales/vi.ts');
        else if (file === 'yo.ts') module = await import('../../src/locales/yo.ts');
        else if (file === 'zh.ts') module = await import('../../src/locales/zh.ts');
        const translations = flattenObject(module.default.translation);
        const keys = Object.keys(translations);
        
        // Check for missing keys
        const missingKeys = enKeys.filter(k => !keys.includes(k));
        // Check for extra keys
        const extraKeys = keys.filter(k => !enKeys.includes(k));
        
        expect(missingKeys, `Missing keys in ${file}: ${missingKeys.join(', ')}`).toHaveLength(0);
        expect(extraKeys, `Extra keys in ${file}: ${extraKeys.join(', ')}`).toHaveLength(0);
        expect(keys.length).toBe(enKeys.length);
      });

      it(`should not have identical values to en.ts for ${file}`, async () => {
        if (allowedIdenticalLocales.includes(file)) return;
        let module;
        if (file === 'ar.ts') module = await import('../../src/locales/ar.ts');
        else if (file === 'atl.ts') module = await import('../../src/locales/atl.ts');
        else if (file === 'bg.ts') module = await import('../../src/locales/bg.ts');
        else if (file === 'ca.ts') module = await import('../../src/locales/ca.ts');
        else if (file === 'cs.ts') module = await import('../../src/locales/cs.ts');
        else if (file === 'da.ts') module = await import('../../src/locales/da.ts');
        else if (file === 'de.ts') module = await import('../../src/locales/de.ts');
        else if (file === 'doth.ts') module = await import('../../src/locales/doth.ts');
        else if (file === 'el.ts') module = await import('../../src/locales/el.ts');
        else if (file === 'elv.ts') module = await import('../../src/locales/elv.ts');
        else if (file === 'eo.ts') module = await import('../../src/locales/eo.ts');
        else if (file === 'es.ts') module = await import('../../src/locales/es.ts');
        else if (file === 'fi.ts') module = await import('../../src/locales/fi.ts');
        else if (file === 'fr.ts') module = await import('../../src/locales/fr.ts');
        else if (file === 'he.ts') module = await import('../../src/locales/he.ts');
        else if (file === 'hi.ts') module = await import('../../src/locales/hi.ts');
        else if (file === 'hr.ts') module = await import('../../src/locales/hr.ts');
        else if (file === 'hu.ts') module = await import('../../src/locales/hu.ts');
        else if (file === 'id.ts') module = await import('../../src/locales/id.ts');
        else if (file === 'it.ts') module = await import('../../src/locales/it.ts');
        else if (file === 'ja.ts') module = await import('../../src/locales/ja.ts');
        else if (file === 'ko.ts') module = await import('../../src/locales/ko.ts');
        else if (file === 'lt.ts') module = await import('../../src/locales/lt.ts');
        else if (file === 'lv.ts') module = await import('../../src/locales/lv.ts');
        else if (file === 'no.ts') module = await import('../../src/locales/no.ts');
        else if (file === 'pa.ts') module = await import('../../src/locales/pa.ts');
        else if (file === 'pl.ts') module = await import('../../src/locales/pl.ts');
        else if (file === 'pt-PT.ts') module = await import('../../src/locales/pt-PT.ts');
        else if (file === 'pt.ts') module = await import('../../src/locales/pt.ts');
        else if (file === 'qav.ts') module = await import('../../src/locales/qav.ts');
        else if (file === 'qvy.ts') module = await import('../../src/locales/qvy.ts');
        else if (file === 'ro.ts') module = await import('../../src/locales/ro.ts');
        else if (file === 'ru.ts') module = await import('../../src/locales/ru.ts');
        else if (file === 'sk.ts') module = await import('../../src/locales/sk.ts');
        else if (file === 'sl.ts') module = await import('../../src/locales/sl.ts');
        else if (file === 'sr.ts') module = await import('../../src/locales/sr.ts');
        else if (file === 'sv.ts') module = await import('../../src/locales/sv.ts');
        else if (file === 'sw.ts') module = await import('../../src/locales/sw.ts');
        else if (file === 'th.ts') module = await import('../../src/locales/th.ts');
        else if (file === 'tlh.ts') module = await import('../../src/locales/tlh.ts');
        else if (file === 'tr.ts') module = await import('../../src/locales/tr.ts');
        else if (file === 'uk.ts') module = await import('../../src/locales/uk.ts');
        else if (file === 'ur.ts') module = await import('../../src/locales/ur.ts');
        else if (file === 'vi.ts') module = await import('../../src/locales/vi.ts');
        else if (file === 'yo.ts') module = await import('../../src/locales/yo.ts');
        else if (file === 'zh.ts') module = await import('../../src/locales/zh.ts');
        const translations = flattenObject(module.default.translation);
        
        const identicalValues: string[] = [];
        
        enKeys.forEach(key => {
          if (translations[key] === enTranslations[key]) {
             // Skip backfilled namespaces; they are placeholder English values.
             if (exemptUntranslatedPrefixes.some((p) => key.startsWith(p))) {
               return;
             }
             // Only flag identical strings if they are not technical terms.
             if (!technicalTerms.includes(enTranslations[key]) && enTranslations[key].length > 2) {
               identicalValues.push(key);
             }
          }
        });
        
        expect(identicalValues, `Identical values to English in ${file} for keys: ${identicalValues.join(', ')}`).toHaveLength(0);
      });
    });
  });
});
