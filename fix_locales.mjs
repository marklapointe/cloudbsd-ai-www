import * as fs from 'fs';
import * as path from 'path';

const localesDir = path.resolve('src/locales');
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'en.ts' && f !== 'fr.ts' && f !== 'hr.ts' && f !== 'ar.ts' && f !== 'hi.ts' && f !== 'ro.ts' && f !== 'zh.ts' && f !== 'no.ts' && f !== 'ca.ts' && f !== 'eo.ts' && f !== 'tr.ts');

const fictional = ['atl.ts', 'qav.ts', 'qvy.ts', 'doth.ts', 'elv.ts', 'tlh.ts'];

const translations = {
  "common": {
    "save": { "es": "Guardar", "it": "Salva", "pt": "Salvar", "de": "Speichern", "ru": "Сохранить" },
    "cancel": { "es": "Cancelar", "it": "Annulla", "pt": "Cancelar", "de": "Abbrechen", "ru": "Отмена" },
    "loading": { "es": "Cargando...", "it": "Caricamento...", "pt": "Carregando...", "de": "Laden...", "ru": "Загрузка..." },
    "actions": { "es": "Acciones", "it": "Azioni", "pt": "Ações", "de": "Aktionen", "ru": "Действия" },
    "search": { "es": "Buscar", "it": "Cerca", "pt": "Buscar", "de": "Suchen", "ru": "Поиск" },
    "status": { "es": "Estado", "it": "Stato", "pt": "Estado", "de": "Status", "ru": "Статус" },
    "name": { "es": "Nombre", "it": "Nome", "pt": "Nome", "de": "Name", "ru": "Имя" },
    "type": { "es": "Tipo", "it": "Tipo", "pt": "Tipo", "de": "Typ", "ru": "Тиپ" },
    "info": { "es": "Información", "it": "Informazioni", "pt": "Informação", "de": "Information", "ru": "Информация" },
    "settings": { "es": "Ajustes", "it": "Impostazioni", "pt": "Configurações", "de": "Einstellungen", "ru": "Настройки" },
    "logout": { "es": "Cerrar sesión", "it": "Disconnetti", "pt": "Sair", "de": "Abmelden", "ru": "Выход" },
    "dashboard": { "es": "Tablero", "it": "Pannello", "pt": "Painel", "de": "Dashboard", "ru": "Панель управления" }
  },
  "login": {
    "sign_in": { "es": "Iniciar sesión", "it": "Accedi", "pt": "Entrar", "de": "Anmelden", "ru": "Войти" }
  }
};

localeFiles.forEach(file => {
  if (fictional.includes(file)) return;
  const lang = file.split('.')[0];
  let content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
  
  // Very crude replacement for common keys to show we are trying
  Object.keys(translations.common).forEach(key => {
    const val = translations.common[key][lang] || translations.common[key][lang.split('-')[0]];
    if (val) {
      const regex = new RegExp(`"${key}": "English Value"`, 'g'); // This won't work because I don't know the exact value
      // Instead, let's just use a marker like [T] if it's identical to English and not fictional
    }
  });
});

console.log("This script is just a placeholder, I will use a better approach.");
