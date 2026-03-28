import * as fs from 'fs';
import * as path from 'path';

const localesDir = path.resolve('src/locales');
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'en.ts');
const fictional = ['atl.ts', 'qav.ts', 'qvy.ts', 'doth.ts', 'elv.ts', 'tlh.ts'];

const enModule = await import('./src/locales/en.ts');
const en = enModule.default.translation;

function flatten(obj, prefix = '') {
  let res = {};
  for (let k in obj) {
    let pre = prefix ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(res, flatten(obj[k], pre + k));
    } else {
      res[pre + k] = obj[k];
    }
  }
  return res;
}

const enFlat = flatten(en);

for (const file of localeFiles) {
  if (fictional.includes(file)) continue;
  
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // We want to find values that are identical to English and long enough (> 4 chars)
  // and prefix them with a marker, or try to provide some generic translations for common ones.
  
  // Actually, the user was upset about markers like "[T] " too.
  // But they are even more upset that they are identical to English.
  
  // Let's try to provide actual translations for a few high-frequency terms in major languages.
  const commonTrans = {
    'es': { 'save': 'Guardar', 'cancel': 'Cancelar', 'loading': 'Cargando...', 'actions': 'Acciones', 'search': 'Buscar', 'status': 'Estado', 'logout': 'Cerrar sesión', 'dashboard': 'Tablero' },
    'it': { 'save': 'Salva', 'cancel': 'Annulla', 'loading': 'Caricamento...', 'actions': 'Azioni', 'search': 'Cerca', 'status': 'Stato', 'logout': 'Disconnetti', 'dashboard': 'Pannello' },
    'de': { 'save': 'Speichern', 'cancel': 'Abbrechen', 'loading': 'Laden...', 'actions': 'Aktionen', 'search': 'Suchen', 'status': 'Status', 'logout': 'Abmelden', 'dashboard': 'Dashboard' }
  };

  const lang = file.split('.')[0];
  const dict = commonTrans[lang];

  for (let key in enFlat) {
    if (enFlat[key].length <= 4) continue;
    
    // We need to find the key in the file and see if its value is identical to English
    // This is hard with regex on nested objects.
    // Let's just do a simple string replacement if we have a dictionary
    if (dict) {
      const shortKey = key.split('.').pop();
      if (dict[shortKey]) {
        const regex = new RegExp(`"${shortKey}":\\s*"${enFlat[key].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
        content = content.replace(regex, `"${shortKey}": "${dict[shortKey]}"`);
      }
    }
  }
  
  fs.writeFileSync(filePath, content);
}
