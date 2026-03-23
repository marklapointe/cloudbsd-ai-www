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
  const localesDir = path.resolve(__dirname, '../locales');
  const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts'));
  
  // First, we need the English reference
  const enModule = await import('../locales/en.ts');
  const enTranslations = flattenObject(enModule.default.translation);
  const enKeys = Object.keys(enTranslations);

  // List of locales that are expected to be identical to English (e.g. dummy/placeholder/test locales)
  const allowedIdenticalLocales = ['atl.ts', 'qav.ts', 'qvy.ts'];

  localeFiles.forEach(file => {
    if (file === 'en.ts') return;

    describe(`Locale: ${file}`, () => {
      // ... (existing tests)
      it(`should load ${file} without syntax errors`, async () => {
        const module = await import(`../locales/${file}`);
        expect(module.default).toBeDefined();
        expect(module.default.translation).toBeDefined();
      });

      it(`should have a 1:1 key relationship with en.ts for ${file}`, async () => {
        const module = await import(`../locales/${file}`);
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
        
        const module = await import(`../locales/${file}`);
        const translations = flattenObject(module.default.translation);
        
        const identicalValues: string[] = [];
        enKeys.forEach(key => {
          if (translations[key] === enTranslations[key]) {
            identicalValues.push(key);
          }
        });
        
        expect(identicalValues, `Identical values to English in ${file} for keys: ${identicalValues.join(', ')}`).toHaveLength(0);
      });
    });
  });
});
