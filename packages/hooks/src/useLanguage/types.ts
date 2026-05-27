export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface UseLanguageReturn {
  currentLanguage: LanguageOption | null;
  changeLanguage: (code: string) => Promise<void>;
  languages: LanguageOption[];
}