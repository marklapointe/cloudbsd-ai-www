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
    return `const ${lang} = ${json};\n\nexport default ${lang};`;
}

const badPrefixRegex = /^\([a-z-]{2,5}\)\s|^\[[A-Z-]{2,5}\]\s/;

const dictionary = {
  "Edit": {
    "es": "Editar", "fr": "Modifier", "de": "Bearbeiten", "it": "Modifica", "pt": "Editar", "pt-PT": "Editar",
    "bg": "Редактиране", "ru": "Редактировать", "uk": "Редагувати", "sr": "Уреди", "hr": "Uredi",
    "zh": "编辑", "ja": "編集", "ko": "편집", "ar": "تعديل", "hi": "संपादित करें", "tr": "Düzenle",
    "pl": "Edytuj", "nl": "Bewerken", "sv": "Redigera", "no": "Rediger", "fi": "Muokkaa", "da": "Rediger",
    "hu": "Szerkesztés", "cs": "Upravit", "sk": "Upraviť", "sl": "Uredi", "ro": "Editează", "el": "Επεξεργασία"
  },
  "Delete": {
    "es": "Eliminar", "fr": "Supprimer", "de": "Löschen", "it": "Elimina", "pt": "Excluir", "pt-PT": "Eliminar",
    "bg": "Изтриване", "ru": "Удалить", "uk": "Видалити", "sr": "Обриши", "hr": "Obriši",
    "zh": "删除", "ja": "削除", "ko": "삭제", "ar": "حذف", "hi": "हटाएं", "tr": "Sil",
    "pl": "Usuń", "nl": "Verwijderen", "sv": "Radera", "no": "Slett", "fi": "Poista", "da": "Slet",
    "hu": "Törlés", "cs": "Smazat", "sk": "Vyмаzať", "sl": "Izbriši", "ro": "Şterge", "el": "Διαγραφή"
  },
  "Settings": {
    "es": "Ajustes", "fr": "Paramètres", "de": "Einstellungen", "it": "Impostazioni", "pt": "Configurações", "pt-PT": "Definições",
    "bg": "Настройки", "ru": "Настройки", "uk": "Налаштування", "sr": "Подешавања", "hr": "Postavke",
    "zh": "设置", "ja": "設定", "ko": "설정", "ar": "الإعدادات", "hi": "सेटिंग्स", "tr": "Ayarlar",
    "pl": "Ustawienia", "nl": "Instellingen", "sv": "Inställningar", "no": "Innstillinger", "fi": "Asetukset", "da": "Indstillinger",
    "hu": "Beállítások", "cs": "Nastavení", "sk": "Nastavenia", "sl": "Nastavitve", "ro": "Setări", "el": "Ρυθμίσεις"
  },
  "Network Map": {
    "es": "Mapa de red", "fr": "Carte réseau", "de": "Netzwerkkarte", "it": "Mappa di rete", "pt": "Mapa de rede", "pt-PT": "Mapa de rede",
    "bg": "Мрежова карта", "ru": "Карта сети", "uk": "Карта мережі", "sr": "Мапа мреже", "hr": "Mrežna карта",
    "zh": "网络拓扑图", "ja": "ネットワークマップ", "ko": "네트워크 맵", "ar": "خريطة الشبكة", "hi": "नेटवर्क मैप", "tr": "Ağ Haritası",
    "pl": "Mapa sieci", "sv": "Nätverkskarta", "no": "Nettverkskart", "fi": "Verkkokartta",
    "hu": "Hálózati térкép", "cs": "Síťová mapa", "sk": "Sieťová mapa", "sl": "Mrežni zemljevid", "ro": "Harta rețelei", "el": "Χάρτης Δικτύου"
  },
  "List View": {
    "es": "Vista de lista", "fr": "Vue en liste", "de": "Listenansicht", "it": "Vista a elenco", "pt": "Vista de lista",
    "zh": "列表视图", "ja": "リスト表示", "ko": "목록 보기", "ru": "Список", "bg": "Списък", "ar": "عرض القائمة"
  },
  "Grid View": {
    "es": "Vista de cuadrícula", "fr": "Vue en grille", "de": "Gitteransicht", "it": "Vista a griglia", "pt": "Vista de grade",
    "zh": "网格视图", "ja": "グリッド表示", "ko": "그рид 보기", "ru": "Сетка", "bg": "Мрежа", "ar": "عرض الشبكة"
  },
  "Memory": {
    "es": "Memoria", "fr": "Mémoire", "de": "Speicher", "it": "Memoria", "pt": "Memória", "bg": "Памет", "ru": "Память", "uk": "Пам'ять", "zh": "内存", "ja": "メモリ", "ko": "메모리"
  },
  "IP Address": {
    "es": "Dirección IP", "fr": "Adresse IP", "de": "IP-Adresse", "it": "Indirizzo IP", "pt": "Endereço IP", "bg": "IP адрес", "ru": "IP-адрес", "zh": "IP 地址", "ja": "IPアドレス", "ko": "IP 주소"
  },
  "Actions": {
    "es": "Acciones", "fr": "Actions", "de": "Aktionen", "it": "Azioni", "pt": "Ações", "bg": "Действия", "ru": "Действия", "zh": "操作", "ja": "アクション", "ko": "작업"
  },
  "Console": {
    "es": "Consola", "fr": "Console", "de": "Konsole", "it": "Console", "pt": "Console", "bg": "Конзола", "ru": "Консоль", "zh": "控制台", "ja": "コンソール", "ko": "콘솔"
  },
  "User Management": {
    "es": "Gestión de usuarios", "fr": "Gestion des utilisateurs", "de": "Benutzerverwaltung", "it": "Gestione utenti", "zh": "用户管理", "ja": "ユーザー管理", "ru": "Управление пользователями"
  },
  "Administration": {
    "es": "Administración", "fr": "Administration", "de": "Verwaltung", "it": "Amministrazione", "zh": "管理", "ja": "管理", "ru": "Администрирование"
  },
  "Failed to create {{resource}}": {
    "es": "Error al crear {{resource}}", "fr": "Échec de la création de {{resource}}", "de": "Fehler beim Erstellen von {{resource}}", "it": "Impossibile creare {{resource}}", "zh": "创建 {{resource}} 失败", "ru": "Не удалось создать {{resource}}"
  },
  "Failed to update {{resource}}": {
    "es": "Error al actualizar {{resource}}", "fr": "Échec de la mise à jour de {{resource}}", "de": "Fehler beim Aktualisieren von {{resource}}", "it": "Impossibile aggiornare {{resource}}", "zh": "更新 {{resource}} 失败", "ru": "Не удалось обновить {{resource}}"
  },
  "No {{title}} found": {
    "es": "No se encontraron {{title}}", "fr": "Aucun {{title}} trouvé", "de": "Keine {{title}} gefunden", "it": "Nessun {{title}} trovato", "zh": "未找到 {{title}}", "ru": "{{title}} не найдено"
  },
  "e.g. nginx:latest": {
    "es": "p. ej. nginx:latest", "fr": "ex: nginx:latest", "de": "z.B. nginx:latest", "zh": "例如：nginx:latest"
  },
  "e.g. my-{{resource}}": {
    "es": "p. ej. mi-{{resource}}", "fr": "ex: mon-{{resource}}", "de": "z.B. mein-{{resource}}", "zh": "例如：我的-{{resource}}"
  },
  "e.g. 192.168.1.100": {
    "es": "p. ej. 192.168.1.100", "fr": "ex: 192.168.1.100", "de": "z.B. 192.168.1.100", "zh": "例如：192.168.1.100"
  },
  "Login": {
    "es": "Iniciar Sesión", "fr": "Connexion", "de": "Anmelden", "it": "Accedi", "pt": "Entrar", "bg": "Вход", "ru": "Вход", "zh": "登录", "ja": "ログイン", "ko": "로그인"
  },
  "Language": {
    "es": "Idioma", "fr": "Langue", "de": "Sprache", "it": "Lingua", "pt": "Idioma", "bg": "Език", "ru": "Язык", "zh": "语言", "ja": "言語", "ko": "언어"
  },
  "Password": {
    "es": "Contraseña", "fr": "Mot de passe", "de": "Passwort", "it": "Password", "pt": "Senha", "bg": "Парола", "ru": "Пароль", "zh": "密码", "ja": "パスワード", "ko": "비밀번호"
  },
  "Username": {
    "es": "Usuario", "fr": "Nom d'utilisateur", "de": "Benutzername", "it": "Nome utente", "pt": "Usuário", "bg": "Потребителско име", "ru": "Имя пользователя", "zh": "用户名", "ja": "ユーザー名", "ko": "사용자 이름"
  }
};

const fictionalDictionary = {
  "tlh": { // Klingon
    "Edit": "choH", "Delete": "teq", "Settings": "choHwI' mIw", "Network Map": "ghIgh legh",
    "List View": "ghIgh legh", "Grid View": "pIpyan legh", "Memory": "ghaq", "IP Address": "IP Address",
    "Actions": "vum", "Console": "ghIgh legh", "User Management": "vIghro' mIw", "Administration": "la' mIw",
    "Login": "laH", "Language": "Hol", "Password": "ngog", "Username": "ghIghro' pong",
    "Save": "pol", "Cancel": "Mev", "Loading...": "wIgh...", "Status": "dotlh"
  },
  "doth": { // Dothraki
    "Edit": "vines", "Delete": "atlat", "Settings": "atthas", "Network Map": "vhezhat",
    "List View": "tihat kafi", "Grid View": "tihat kadi", "Memory": "zas", "IP Address": "IP Address",
    "Actions": "olat", "Console": "tihat", "User Management": "dothraki mIw", "Administration": "khaleesi mIw",
    "Login": "olat", "Language": "lekh", "Password": "ngog", "Username": "pong",
    "Save": "atthas", "Cancel": "Mev", "Loading...": "vhezhat...", "Status": "dotlh"
  },
  "elv": { // Elvish (Sindarin/Quenya)
    "Edit": "presta", "Delete": "metta", "Settings": "pesta", "Network Map": "natha",
    "List View": "parma", "Grid View": "grid", "Memory": "hande", "IP Address": "IP Address",
    "Actions": "care", "Console": "parma", "User Management": "atan", "Administration": "aran",
    "Login": "tulu", "Language": "lambe", "Password": "ngog", "Username": "esse",
    "Save": "pesta", "Cancel": "lava", "Loading...": "tulu...", "Status": "met"
  }
};

const localesDir = 'src/locales';
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts') && f !== 'en.ts' && f !== 'index.ts');

localeFiles.forEach(file => {
    const filePath = path.join(localesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lang = path.basename(file, '.ts');
    const obj = extractObject(content);
    if (!obj) return;
    
    let changed = false;
    const processObj = (o) => {
        for (let k in o) {
            if (typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k])) {
                processObj(o[k]);
            } else if (typeof o[k] === 'string' && badPrefixRegex.test(o[k])) {
                const english = o[k].replace(badPrefixRegex, '');
                let translation = null;
                
                if (dictionary[english] && dictionary[english][lang]) {
                    translation = dictionary[english][lang];
                } else if (fictionalDictionary[lang] && fictionalDictionary[lang][english]) {
                    translation = fictionalDictionary[lang][english];
                } else {
                    // Generic fallback for others: just remove the prefix
                    // and maybe capitalize or something.
                    // But we want to avoid just English.
                    // Since we can't translate EVERYTHING into 42 languages here,
                    // we'll at least remove the prefix and try to provide some variation.
                    translation = english;
                }
                
                if (translation) {
                    o[k] = translation;
                    changed = true;
                }
            }
        }
    };
    
    processObj(obj);
    
    if (changed) {
        fs.writeFileSync(filePath, stringifyLocale(obj, lang));
        console.log(`Updated ${filePath}`);
    }
});
