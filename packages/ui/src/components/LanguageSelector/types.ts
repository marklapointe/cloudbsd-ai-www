export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export interface LanguageSelectorProps {
  className?: string;
  variant?: 'cloudbsd' | 'revy';
  onLanguageChange?: (code: string) => void;
}
