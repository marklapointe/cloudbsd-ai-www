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

function stringifyLocale(obj, lang) {
    const json = JSON.stringify(obj, null, 2);
    // Convert JSON to the expected TS format
    return `const ${lang} = ${json};\n\nexport default ${lang};`;
}

function updateValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

const args = process.argv.slice(2);
const localeFile = args[0];
const patchFile = args[1];

if (!localeFile || !patchFile) {
    console.error('Usage: node update_locale.mjs <locale_file> <patch_json_file>');
    process.exit(1);
}

const lang = path.basename(localeFile, '.ts');
const content = fs.readFileSync(localeFile, 'utf8');
const obj = extractObject(content);
const patch = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

for (let keyPath in patch) {
    // keyPath might be "translation.common.save"
    // but the object we extract is the whole thing, starting with translation: { ... }
    updateValue(obj, keyPath, patch[keyPath]);
}

fs.writeFileSync(localeFile, stringifyLocale(obj, lang));
console.log(`Updated ${localeFile}`);
