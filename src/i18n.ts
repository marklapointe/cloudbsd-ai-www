import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en';
import fr from './locales/fr';
import es from './locales/es';
import zh from './locales/zh';
import tlh from './locales/tlh';
import it from './locales/it';
import de from './locales/de';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en,
      fr,
      es,
      zh,
      tlh,
      it,
      de,
    },
  });

export default i18n;
