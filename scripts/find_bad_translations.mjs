import fs from 'fs';
import path from 'path';

function extractObject(content) {
    try {
        let cleaned = content.replace(/^(export\s+)?const\s+\w+\s*=\s*/, '');
        cleaned = cleaned.replace(/;\s*export\s+default\s+\w+;\s*$/, '');
        cleaned = cleaned.replace(/;\s*$/, '');
        return new Function(`return ${cleaned}`)();
    } catch (e) {
        return null;
    }
}

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

const localesDir = 'src/locales';
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'en.ts' && f !== 'index.ts');

const badPrefixRegex = /^\([a-z-]{2,5}\)\s|^\[[A-Z-]{2,5}\]\s/;

const allBad = {};

localeFiles.forEach(file => {
    const filePath = path.join(localesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const obj = extractObject(content);
    if (!obj) return;
    const flat = flattenObject(obj);
    
    const badInFile = {};
    for (let key in flat) {
        if (typeof flat[key] === 'string' && badPrefixRegex.test(flat[key])) {
            badInFile[key] = flat[key];
        }
    }
    
    if (Object.keys(badInFile).length > 0) {
        allBad[file] = badInFile;
    }
});

console.log(JSON.stringify(allBad, null, 2));
