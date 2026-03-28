import { expect, it, describe } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Define a function to flatten the nested translation object for easier comparison
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  return Object.keys(obj).reduce((acc: any, k: string) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
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

  // List of locales that are expected to be identical to English (e.g. dummy/placeholder/test locales)
  const allowedIdenticalLocales = ['atl.ts', 'qav.ts', 'qvy.ts', 'doth.ts'];

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
        else if (file === 'tlh.ts') module = await import('../../src/locales/tlh.ts');
        else if (file === 'tr.ts') module = await import('../../src/locales/tr.ts');
        else if (file === 'uk.ts') module = await import('../../src/locales/uk.ts');
        else if (file === 'ur.ts') module = await import('../../src/locales/ur.ts');
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
        else if (file === 'tlh.ts') module = await import('../../src/locales/tlh.ts');
        else if (file === 'tr.ts') module = await import('../../src/locales/tr.ts');
        else if (file === 'uk.ts') module = await import('../../src/locales/uk.ts');
        else if (file === 'ur.ts') module = await import('../../src/locales/ur.ts');
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
        else if (file === 'tlh.ts') module = await import('../../src/locales/tlh.ts');
        else if (file === 'tr.ts') module = await import('../../src/locales/tr.ts');
        else if (file === 'uk.ts') module = await import('../../src/locales/uk.ts');
        else if (file === 'ur.ts') module = await import('../../src/locales/ur.ts');
        else if (file === 'yo.ts') module = await import('../../src/locales/yo.ts');
        else if (file === 'zh.ts') module = await import('../../src/locales/zh.ts');
        
        const translations = flattenObject(module.default.translation);
        
        const identicalValues: string[] = [];
        enKeys.forEach(key => {
          // Skip technical terms, resource_list, logs actions/details, and manual sections for identical value check
          // as they are often untranslated or identical across languages.
          if (
            key.startsWith('resource_list.') || 
            key.startsWith('logs.action_') || 
            key.startsWith('logs.details_') || 
            key.startsWith('manual.') ||
            key.startsWith('settings.feature_') ||
            key.includes('vcpus') ||
            key.includes('vcpu') ||
            key.includes('ip_address')
          ) {
            return;
          }
          
          if (translations[key] === enTranslations[key]) {
            // Only report identical values if they are longer than 25 characters
            // to avoid flagging technical terms and short untranslated strings.
            if (enTranslations[key].length > 25) {
              // Further ignore common strings that might be identical even if > 25 chars
              if (['login.password_placeholder', 'cluster.placeholder_ip', 'console_modal.vnc_placeholder'].includes(key)) return;
              
              identicalValues.push(key);
            }
          }
        });
        
        expect(identicalValues, `Identical values to English in ${file} for keys: ${identicalValues.join(', ')}`).toHaveLength(0);
      });
    });
  });
});
