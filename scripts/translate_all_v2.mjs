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

const dictionary = {
  "Edit": { "es": "Editar", "fr": "Modifier", "de": "Bearbeiten", "it": "Modifica", "pt": "Editar", "pt-PT": "Editar", "bg": "Редактиране", "ru": "Редактировать", "uk": "Редагувати", "sr": "Уреди", "hr": "Uredi", "zh": "编辑", "ja": "編集", "ko": "편집", "ar": "تعديل", "hi": "संपादित करें", "tr": "Düzenle", "pl": "Edytuj", "sv": "Redigera", "no": "Rediger", "fi": "Muokkaa" },
  "Delete": { "es": "Eliminar", "fr": "Supprimer", "de": "Löschen", "it": "Elimina", "pt": "Excluir", "pt-PT": "Eliminar", "bg": "Изтриване", "ru": "Удалить", "uk": "Видалити", "zh": "删除", "ja": "削除", "ko": "삭제", "ar": "حذف", "hi": "हटाएं", "tr": "Sil", "pl": "Usuń", "sv": "Radera", "no": "Slett", "fi": "Poista" },
  "Settings": { "es": "Ajustes", "fr": "Paramètres", "de": "Einstellungen", "it": "Impostazioni", "pt": "Configurações", "pt-PT": "Definições", "bg": "Настройки", "ru": "Настройки", "uk": "Налаштування", "zh": "设置", "ja": "設定", "ko": "설정", "ar": "الإعدادات", "hi": "सेटिंग्स", "tr": "Ayarlar", "pl": "Ustawienia", "sv": "Inställningar", "no": "Innstillinger", "fi": "Asetukset" },
  "Network Map": { "es": "Mapa de red", "fr": "Carte réseau", "de": "Netzwerkkarte", "it": "Mappa di rete", "pt": "Mapa de rede", "pt-PT": "Mapa de rede", "bg": "Мрежова карта", "ru": "Карта сети", "uk": "Карта мережі", "zh": "网络拓扑图", "ja": "ネットワークマップ", "ko": "네트워크 맵", "ar": "خريطة الشبكة", "tr": "Ağ Haritası", "pl": "Mapa sieci", "sv": "Nätverkskarta", "no": "Nettverkskart", "fi": "Verkkokartta" },
  "List View": { "es": "Vista de lista", "fr": "Vue en liste", "de": "Listenansicht", "it": "Vista a elenco", "pt": "Vista de lista", "zh": "列表视图", "ja": "リスト表示", "ko": "목록 보기", "ru": "Список", "bg": "Списък", "ar": "عرض القائمة", "hi": "सूची दृश्य", "tr": "Liste Görünümü" },
  "Grid View": { "es": "Vista de cuadrícula", "fr": "Vue en grille", "de": "Gitteransicht", "it": "Vista a griglia", "pt": "Vista de grade", "zh": "网格视图", "ja": "グリッド表示", "ko": "그рид 보기", "ru": "Сетка", "bg": "Мрежа", "ar": "عرض الشبكة", "hi": "ग्रिड दृश्य", "tr": "Izgara Görünümü" },
  "Memory": { "es": "Memoria", "fr": "Mémoire", "de": "Speicher", "it": "Memoria", "pt": "Memória", "bg": "Памет", "ru": "Память", "uk": "Пам'ять", "zh": "内存", "ja": "メモリ", "ko": "메모리", "ar": "الذاكرة", "hi": "मेमोरी", "tr": "Bellek" },
  "IP Address": { "es": "Dirección IP", "fr": "Adresse IP", "de": "IP-Adresse", "it": "Indirizzo IP", "pt": "Endereço IP", "bg": "IP адрес", "ru": "IP-адрес", "zh": "IP 地址", "ja": "IPアドレス", "ko": "IP 주소", "ar": "عنوان IP", "hi": "आईपी पता", "tr": "IP Adresi" },
  "Actions": { "es": "Acciones", "fr": "Actions", "de": "Aktionen", "it": "Azioni", "pt": "Ações", "bg": "Действия", "ru": "Действия", "zh": "操作", "ja": "アクション", "ko": "작업", "ar": "الإجراءات", "hi": "कार्रवाई", "tr": "İşlemler" },
  "Console": { "es": "Consola", "fr": "Console", "de": "Konsole", "it": "Console", "pt": "Console", "bg": "Конзола", "ru": "Консоль", "zh": "控制台", "ja": "コンソール", "ko": "콘솔", "ar": "وحدة التحكم", "hi": "कंसोल", "tr": "Konsol" },
  "User Management": { "es": "Gestión de usuarios", "fr": "Gestion des utilisateurs", "de": "Benutzerverwaltung", "it": "Gestione utenti", "zh": "用户管理", "ja": "ユーザー管理", "ru": "Управление пользователями", "ar": "إدارة المستخدمين" },
  "Administration": { "es": "Administración", "fr": "Administration", "de": "Verwaltung", "it": "Amministrazione", "zh": "管理", "ja": "管理", "ru": "Администрирование", "ar": "الإدارة" },
  "Save": { "es": "Guardar", "fr": "Enregistrer", "de": "Speichern", "it": "Salva", "pt": "Salvar", "bg": "Запазване", "ru": "Сохранить", "uk": "Зберегти", "zh": "保存", "ja": "保存", "ko": "저장", "ar": "حفظ", "hi": "सहेजें", "tr": "Kaydet", "pl": "Zapisz" },
  "Cancel": { "es": "Cancelar", "fr": "Annuler", "de": "Abbrechen", "it": "Annulla", "pt": "Cancelar", "bg": "Отказ", "ru": "Отмена", "uk": "Скасувати", "zh": "取消", "ja": "キャンセル", "ko": "취소", "ar": "إلغاء", "hi": "रद्द करें", "tr": "İptal", "pl": "Anuluj" },
  "Loading...": { "es": "Cargando...", "fr": "Chargement...", "de": "Laden...", "it": "Caricamento...", "pt": "Carregando...", "bg": "Зареждане...", "ru": "Загрузка...", "uk": "Завантаження...", "zh": "加载中...", "ja": "読み込み中...", "ko": "로딩 중...", "ar": "جارٍ التحميل...", "hi": "लोड हो रहा है...", "tr": "Yükleniyor...", "pl": "Ładowanie..." },
  "Search": { "es": "Buscar", "fr": "Rechercher", "de": "Suchen", "it": "Cerca", "pt": "Buscar", "bg": "Търсене", "ru": "Поиск", "uk": "Пошук", "zh": "搜索", "ja": "検索", "ko": "검색", "ar": "بحث", "hi": "खोजें", "tr": "Ara", "pl": "Szukaj" },
  "Status": { "es": "Estado", "fr": "État", "de": "Status", "it": "Stato", "pt": "Status", "bg": "Статус", "ru": "Статус", "zh": "状态", "ja": "ステータス", "ko": "상태", "ar": "الحالة", "tr": "Durum" },
  "Name": { "es": "Nombre", "fr": "Nom", "de": "Name", "it": "Nome", "pt": "Nome", "bg": "Име", "ru": "Имя", "zh": "名称", "ja": "名前", "ko": "이름", "ar": "الاسم", "tr": "İsim" },
  "Type": { "es": "Tipo", "fr": "Type", "de": "Typ", "it": "Tipo", "pt": "Tipo", "bg": "Тип", "ru": "Тип", "zh": "类型", "ja": "タイプ", "ko": "유형", "ar": "النوع", "tr": "Tip" },
  "Information": { "es": "Información", "fr": "Informations", "de": "Informationen", "it": "Informazioni", "pt": "Informação", "bg": "Информация", "ru": "Информация", "zh": "信息", "ja": "情報", "ko": "정보", "ar": "معلومات", "tr": "Bilgi" },
  "Host": { "es": "Host", "fr": "Hôte", "de": "Host", "it": "Host", "pt": "Host", "bg": "Хост", "ru": "Хост", "zh": "主机", "ja": "ホスト", "ko": "호스트", "ar": "المضيف", "tr": "Anamakine" },
  "Logout": { "es": "Cerrar sesión", "fr": "Déconnexion", "de": "Abmelden", "it": "Esci", "pt": "Sair", "bg": "Изход", "ru": "Выход", "uk": "Вийти", "zh": "注销", "ja": "ログアウト", "ko": "로그아웃", "ar": "تسجيل الخروج", "hi": "लॉगआउट", "tr": "Çıkış Yap", "pl": "Wyloguj" },
  "Dashboard": { "es": "Panel", "fr": "Tableau de bord", "de": "Dashboard", "it": "Dashboard", "pt": "Dashboard", "bg": "Табло", "ru": "Дашборд", "zh": "仪表板", "ja": "ダッシュボード", "ko": "대시보드", "ar": "لوحة القيادة", "tr": "Panel" },
  "VMs": { "es": "VMs", "fr": "VMs", "de": "VMs", "it": "VM", "pt": "VMs", "bg": "ВМ", "ru": "ВМ", "zh": "虚拟机", "ja": "仮想マシン", "ko": "가상 머신", "ar": "الأجهزة الافتراضية", "tr": "Sanal Makineler" },
  "Containers": { "es": "Contenedores", "fr": "Conteneurs", "de": "Container", "it": "Contenitori", "pt": "Contêineres", "bg": "Контейнери", "ru": "Контейнеры", "zh": "容器", "ja": "コンテナ", "ko": "컨테이너", "ar": "الحاويات", "tr": "Konteynerler" },
  "Jails": { "es": "Jails", "fr": "Jails", "de": "Jails", "it": "Jail", "pt": "Jails", "bg": "Jails", "ru": "Jails", "zh": "Jails", "ja": "Jails", "ko": "Jails", "ar": "Jails", "tr": "Jails" },
  "Cluster": { "es": "Clúster", "fr": "Grappe", "de": "Cluster", "it": "Cluster", "pt": "Cluster", "bg": "Клъстер", "ru": "Кластер", "zh": "集群", "ja": "クラスター", "ko": "클러스터", "ar": "العنقود", "tr": "Küme" },
  "Users": { "es": "Usuarios", "fr": "Utilisateurs", "de": "Benutzer", "it": "Utenti", "pt": "Usuários", "bg": "Потребители", "ru": "Пользователи", "zh": "用户", "ja": "ユーザー", "ko": "사용자", "ar": "المستخدمون", "tr": "Kullanıcılar" },
  "Logs": { "es": "Registros", "fr": "Journaux", "de": "Protokolle", "it": "Log", "pt": "Logs", "bg": "Дневници", "ru": "Логи", "zh": "日志", "ja": "ログ", "ko": "로그", "ar": "السجلات", "tr": "Günlükler" },
  "License": { "es": "Licencia", "fr": "Licence", "de": "Lizenz", "it": "Licenza", "pt": "Licença", "bg": "Лиценз", "ru": "Лицензия", "zh": "许可证", "ja": "ライセンス", "ko": "라이선스", "ar": "الترخيص", "tr": "Lisans" },
  "Apply": { "es": "Aplicar", "fr": "Appliquer", "de": "Anwenden", "it": "Applica", "pt": "Aplicar", "bg": "Приложи", "ru": "Применить", "zh": "应用", "ja": "適用", "ko": "적용", "ar": "تطبيق", "tr": "Uygula" },
  "Confirm": { "es": "Confirmar", "fr": "Confirm", "de": "Bestätigen", "it": "Conferma", "pt": "Confirmar", "bg": "Потвърди", "ru": "Подтвердить", "zh": "确认", "ja": "確認", "ko": "확인", "ar": "تأكيد", "tr": "Onayla" },
  "Error": { "es": "Error", "fr": "Erreur", "de": "Fehler", "it": "Errore", "pt": "Erro", "bg": "Грешка", "ru": "Ошибка", "zh": "错误", "ja": "エラー", "ko": "오류", "ar": "خطأ", "tr": "Hata" },
  "Success": { "es": "Éxito", "fr": "Succès", "de": "Erfolg", "it": "Successo", "pt": "Sucesso", "bg": "Успех", "ru": "Успех", "zh": "成功", "ja": "成功", "ko": "성공", "ar": "نجاح", "tr": "Başarı" },
  "Warning": { "es": "Advertencia", "fr": "Avertissement", "de": "Warnung", "it": "Avviso", "pt": "Aviso", "bg": "Предупреждение", "ru": "Предупреждение", "zh": "警告", "ja": "警告", "ko": "경고", "ar": "تحذير", "tr": "Uyarı" },
  "Online": { "es": "En línea", "fr": "En ligne", "de": "Online", "it": "Online", "pt": "Online", "bg": "Онлайн", "ru": "В сети", "zh": "在线", "ja": "オンライン", "ko": "온라인", "ar": "متصل", "tr": "Çevrimiçi" },
  "Offline": { "es": "Desconectado", "fr": "Hors ligne", "de": "Offline", "it": "Offline", "pt": "Offline", "bg": "Офлайн", "ru": "Не в сети", "zh": "离线", "ja": "オフライン", "ko": "오프라인", "ar": "غير متصل", "tr": "Çevrimdışı" },
  "Running": { "es": "En ejecución", "fr": "En cours", "de": "Läuft", "it": "In esecuzione", "pt": "Executando", "bg": "Работещ", "ru": "Запущено", "zh": "运行中", "ja": "実行中", "ko": "실행 중", "ar": "قيد التشغيل", "tr": "Çalışıyor" },
  "Stopped": { "es": "Detenido", "fr": "Arrêté", "de": "Gestoppt", "it": "Fermato", "pt": "Parado", "bg": "Спрян", "ru": "Остановлено", "zh": "已停止", "ja": "停止中", "ko": "중지됨", "ar": "متوقف", "tr": "Durduruldu" },
  "Failed to create {{resource}}": { "es": "Error al crear {{resource}}", "fr": "Échec de la création de {{resource}}", "de": "Fehler beim Erstellen von {{resource}}", "it": "Impossibile creare {{resource}}", "zh": "创建 {{resource}} 失败", "ru": "Не удалось создать {{resource}}" },
  "Failed to update {{resource}}": { "es": "Error al actualizar {{resource}}", "fr": "Échec de la mise à jour de {{resource}}", "de": "Fehler beim Aktualisieren von {{resource}}", "it": "Impossibile aggiornare {{resource}}", "zh": "更新 {{resource}} 失败", "ru": "Не удалось обновить {{resource}}" },
  "No {{title}} found": { "es": "No se encontraron {{title}}", "fr": "Aucun {{title}} trouvé", "de": "Keine {{title}} gefunden", "it": "Nessun {{title}} trovato", "zh": "未找到 {{title}}", "ru": "{{title}} не найдено" }
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
            } else if (typeof o[k] === 'string') {
                // Now we check if the value is in English and in our dictionary
                // We'll also check if it's the same as English reference
                const englishVal = o[k];
                if (dictionary[englishVal] && dictionary[englishVal][lang]) {
                    o[k] = dictionary[englishVal][lang];
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
