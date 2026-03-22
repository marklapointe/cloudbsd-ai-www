export interface Language {
  code: string;
  name: string;
}

export const supportedLanguages: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'it', name: 'Italiano' },
  { code: 'no', name: 'Norsk' },
  { code: 'sv', name: 'Svenska' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ' },
  { code: 'tlh', name: 'tlhIngan Hol' },
  { code: 'elv', name: 'Quenya' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'yo', name: 'Yorùbá' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ko', name: '한국어' },
  { code: 'fi', name: 'Suomi' },
  { code: 'ru', name: 'Русский' },
  { code: 'pl', name: 'Polski' },
  { code: 'doth', name: 'Lekh Dothraki' },
  { code: 'qvy', name: 'Valyrio' },
  { code: 'qav', name: 'Lìʼfya leNaʼvi' },
  { code: 'atl', name: 'Dig Adlantis' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ca', name: 'Català' },
  { code: 'cs', name: 'Čeština' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'he', name: 'עברית' },
  { code: 'uk', name: 'Українська' },
  { code: 'sr', name: 'Српски' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'sl', name: 'Slovenščina' },
  { code: 'ur', name: 'اردو' },
  { code: 'bg', name: 'Български' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'hu', name: 'Magyar' },
  { code: 'lt', name: 'Lietuvių' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'pt', name: 'Português (Brasil)' },
  { code: 'pt-PT', name: 'Português (Portugal)' },
  { code: 'ro', name: 'Română' },
];

export const getSortedLanguages = (): Language[] => {
  return [...supportedLanguages].sort((a, b) => {
    if (a.code === 'en') return -1;
    if (b.code === 'en') return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
};
