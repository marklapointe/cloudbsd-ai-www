import fs from 'fs';
import path from 'path';

/**
 * Script to compare English translations with other language files.
 * It detects missing keys and keys that are still in English.
 */

// Helper to extract the object from the .ts file content
function extractObject(content) {
    // This is a simple extractor that assumes the file starts with "const [lang] = {" or "export const [lang] = {"
    // and ends with "}; export default [lang];" or similar patterns.
    // For more robust parsing, we'd use a TS parser, but for this task, 
    // we'll try to clean it up and evaluate it as JS.
    
    try {
        // Remove "const ... =" part and "export default ...;" part
        let cleaned = content.replace(/^(export\s+)?const\s+\w+\s*=\s*/, '');
        cleaned = cleaned.replace(/;\s*export\s+default\s+\w+;\s*$/, '');
        cleaned = cleaned.replace(/;\s*$/, '');
        
        // Use Function to evaluate the object
        // Note: This works because the locale files are simple objects
        return new Function(`return ${cleaned}`)();
    } catch (e) {
        throw new Error(`Failed to parse locale content: ${e.message}`);
    }
}

// Helper to flatten nested object into dot notation keys
function flattenObject(obj, prefix = '') {
    let keys = {};
    for (let key in obj) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(keys, flattenObject(obj[key], fullPath));
        } else {
            keys[fullPath] = obj[key];
        }
    }
    return keys;
}

const localesDir = path.join(process.cwd(), 'src/locales');
const enFile = path.join(localesDir, 'en.ts');

if (!fs.existsSync(enFile)) {
    console.error('English locale file (en.ts) not found!');
    process.exit(1);
}

const enContent = fs.readFileSync(enFile, 'utf8');
const enObj = extractObject(enContent);
const enFlat = flattenObject(enObj);
const enKeys = Object.keys(enFlat);

const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'en.ts' && f !== 'index.ts');

console.log(`Analyzing ${localeFiles.length} locale files against English reference (${enKeys.length} keys)...\n`);

let totalMissing = 0;
let totalUntranslated = 0;

localeFiles.forEach(file => {
    const filePath = path.join(localesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    let obj;
    try {
        obj = extractObject(content);
    } catch (e) {
        console.error(`[FAIL] ${file}: ${e.message}`);
        return;
    }
    
    const technicalTerms = [
        'vCPU', 'vCPUs', 'IP', 'GB', 'TB', 'MB', 'KB', 'Status', 'Host', 'Dashboard', 'Name',
        'Jails', 'Cluster', 'Server', 'Operator', 'Viewer', 'System', 'Image', 'Online', 'Offline',
        'Maintenance', '••••••••', '10.0.0.X', 'Console', 'VNC'
    ];
    const flat = flattenObject(obj);
    const missingKeys = enKeys.filter(k => !(k in flat));
    const untranslatedKeys = enKeys.filter(k => {
        if (!(k in flat)) return false;
        // If it starts with [T], it's marked as untranslated (even if it's different from English)
        if (typeof flat[k] === 'string' && flat[k].startsWith('[T] ')) return true;
        if (flat[k] !== enFlat[k]) return false;
        if (technicalTerms.includes(enFlat[k])) return false;
        return enFlat[k].length > 3;
    });
    
    if (missingKeys.length > 0 || untranslatedKeys.length > 0) {
        console.log(`--- ${file} ---`);
        console.log(`Total keys: ${Object.keys(flat).length} / ${enKeys.length}`);
        
        if (missingKeys.length > 0) {
            console.log(`MISSING KEYS (${missingKeys.length}):`);
            missingKeys.forEach(k => console.log(`  - ${k}`));
            totalMissing += missingKeys.length;
        }
        
        if (untranslatedKeys.length > 0) {
            console.log(`UNTRANSLATED KEYS (Still in English) (${untranslatedKeys.length}):`);
            untranslatedKeys.forEach(k => console.log(`  - ${k} ("${enFlat[k]}")`));
            totalUntranslated += untranslatedKeys.length;
        }
        console.log('');
    } else {
        // console.log(`[OK] ${file} is fully translated and up to date.`);
    }
});

console.log('--- Summary ---');
console.log(`Total missing keys across all files: ${totalMissing}`);
console.log(`Total untranslated keys across all files: ${totalUntranslated}`);

if (totalMissing === 0 && totalUntranslated === 0) {
    console.log('All locales are in perfect sync with English!');
}
