import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageOption, UseLanguageReturn } from './types';

const defaultLanguages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

export const useLanguage = (): UseLanguageReturn => {
  const { i18n } = useTranslation();
  const [languages] = useState<LanguageOption[]>(defaultLanguages);

  const currentLanguage = languages.find(l =>
    l.code === i18n.language || i18n.language?.startsWith(l.code)
  ) || languages[0] || null;

  const changeLanguage = useCallback(async (code: string) => {
    await i18n.changeLanguage(code);
    const url = new URL(window.location.href);
    url.searchParams.set('lng', code);
    window.history.pushState({}, '', url.toString());
  }, [i18n]);

  return {
    currentLanguage,
    changeLanguage,
    languages,
  };
};