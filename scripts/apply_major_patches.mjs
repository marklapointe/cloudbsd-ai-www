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

function updateValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

const patches = {
  "es": {
    "translation.resource_list.view_list": "Vista de lista",
    "translation.resource_list.view_grid": "Vista de cuadrícula",
    "translation.resource_list.no_resources": "No se encontraron {{title}}",
    "translation.resource_modal.create_failed": "Error al crear {{resource}}",
    "translation.resource_modal.update_failed": "Error al actualizar {{resource}}",
    "translation.resource_modal.name_placeholder": "p. ej. mi-{{resource}}",
    "translation.resource_modal.image_placeholder": "p. ej. nginx:latest",
    "translation.resource_modal.ip_placeholder": "p. ej. 192.168.1.100",
    "translation.notifications.title": "Notificaciones",
    "translation.notifications.empty": "No hay notificaciones nuevas",
    "translation.notifications.mark_read": "Marcar todas como leídas",
    "translation.notifications.view_all": "Ver todas las notificaciones",
    "translation.layout.logo_text": "CloudBSD Admin",
    "translation.common.error": "Error"
  },
  "fr": {
    "translation.resource_list.view_list": "Vue en liste",
    "translation.resource_list.view_grid": "Vue en grille",
    "translation.resource_list.no_resources": "Aucun {{title}} trouvé",
    "translation.resource_modal.create_failed": "Échec de la création de {{resource}}",
    "translation.resource_modal.update_failed": "Échec de la mise à jour de {{resource}}",
    "translation.resource_modal.name_placeholder": "ex: mon-{{resource}}",
    "translation.resource_modal.image_placeholder": "ex: nginx:latest",
    "translation.resource_modal.ip_placeholder": "ex: 192.168.1.100",
    "translation.notifications.title": "Notifications",
    "translation.notifications.empty": "Aucune nouvelle notification",
    "translation.notifications.mark_read": "Tout marquer comme lu",
    "translation.notifications.view_all": "Voir toutes les notifications",
    "translation.layout.logo_text": "CloudBSD Admin",
    "translation.common.error": "Erreur"
  },
  "de": {
    "translation.resource_list.view_list": "Listenansicht",
    "translation.resource_list.view_grid": "Gitteransicht",
    "translation.resource_list.no_resources": "Keine {{title}} gefunden",
    "translation.resource_modal.create_failed": "Fehler beim Erstellen von {{resource}}",
    "translation.resource_modal.update_failed": "Fehler beim Aktualisieren von {{resource}}",
    "translation.resource_modal.name_placeholder": "z.B. mein-{{resource}}",
    "translation.resource_modal.image_placeholder": "z.B. nginx:latest",
    "translation.resource_modal.ip_placeholder": "z.B. 192.168.1.100",
    "translation.notifications.title": "Benachrichtigungen",
    "translation.notifications.empty": "Keine neuen Benachrichtigungen",
    "translation.notifications.mark_read": "Alle als gelesen markieren",
    "translation.notifications.view_all": "Alle Benachrichtigungen anzeigen",
    "translation.layout.logo_text": "CloudBSD Admin",
    "translation.common.error": "Fehler"
  },
  "it": {
    "translation.resource_list.view_list": "Vista a elenco",
    "translation.resource_list.view_grid": "Vista a griglia",
    "translation.resource_list.no_resources": "Nessun {{title}} trovato",
    "translation.resource_modal.create_failed": "Impossibile creare {{resource}}",
    "translation.resource_modal.update_failed": "Impossibile aggiornare {{resource}}",
    "translation.resource_modal.name_placeholder": "es. mio-{{resource}}",
    "translation.resource_modal.image_placeholder": "es. nginx:latest",
    "translation.resource_modal.ip_placeholder": "es. 192.168.1.100",
    "translation.notifications.title": "Notifiche",
    "translation.notifications.empty": "Nessuna nuova notifica",
    "translation.notifications.mark_read": "Segna tutte come lette",
    "translation.notifications.view_all": "Visualizza tutte le notifiche",
    "translation.layout.logo_text": "CloudBSD Admin",
    "translation.common.error": "Errore"
  },
  "pt": {
    "translation.resource_list.view_list": "Vista de lista",
    "translation.resource_list.view_grid": "Vista de grade",
    "translation.resource_list.no_resources": "Nenhum {{title}} encontrado",
    "translation.resource_modal.create_failed": "Falha ao criar {{resource}}",
    "translation.resource_modal.update_failed": "Falha ao atualizar {{resource}}",
    "translation.resource_modal.name_placeholder": "ex: meu-{{resource}}",
    "translation.resource_modal.image_placeholder": "ex: nginx:latest",
    "translation.resource_modal.ip_placeholder": "ex: 192.168.1.100",
    "translation.notifications.title": "Notificações",
    "translation.notifications.empty": "Sem novas notificações",
    "translation.notifications.mark_read": "Marcar todas como lidas",
    "translation.notifications.view_all": "Ver todas as notificações",
    "translation.layout.logo_text": "CloudBSD Admin",
    "translation.common.error": "Erro"
  },
  "zh": {
    "translation.resource_list.view_list": "列表视图",
    "translation.resource_list.view_grid": "网格视图",
    "translation.resource_list.no_resources": "未找到 {{title}}",
    "translation.resource_modal.create_failed": "创建 {{resource}} 失败",
    "translation.resource_modal.update_failed": "更新 {{resource}} 失败",
    "translation.resource_modal.name_placeholder": "例如：我的-{{resource}}",
    "translation.resource_modal.image_placeholder": "例如：nginx:latest",
    "translation.resource_modal.ip_placeholder": "例如：192.168.1.100",
    "translation.notifications.title": "通知",
    "translation.notifications.empty": "暂无新通知",
    "translation.notifications.mark_read": "全部标记为已读",
    "translation.notifications.view_all": "查看所有通知",
    "translation.layout.logo_text": "CloudBSD 管理员",
    "translation.common.error": "错误"
  }
};

for (const lang in patches) {
    const filePath = path.join('src/locales', `${lang}.ts`);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const obj = extractObject(content);
    if (!obj) continue;
    
    const patch = patches[lang];
    for (let keyPath in patch) {
        updateValue(obj, keyPath, patch[lang][keyPath]);
    }
    
    fs.writeFileSync(filePath, stringifyLocale(obj, lang));
    console.log(`Updated ${filePath}`);
}
