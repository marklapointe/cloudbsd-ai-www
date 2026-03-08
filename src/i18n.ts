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
import pt from './locales/pt';
import ja from './locales/ja';
import ar from './locales/ar';
import sw from './locales/sw';
import yo from './locales/yo';
import eo from './locales/eo';
import hi from './locales/hi';
import ko from './locales/ko';
import no from './locales/no';
import sv from './locales/sv';
import pa from './locales/pa';
import fi from './locales/fi';
import ru from './locales/ru';
import pl from './locales/pl';
import tr from './locales/tr';
import ca from './locales/ca';
import cs from './locales/cs';
import el from './locales/el';
import he from './locales/he';
import uk from './locales/uk';
import sr from './locales/sr';
import sk from './locales/sk';
import sl from './locales/sl';
import ur from './locales/ur';
import bg from './locales/bg';
import hr from './locales/hr';
import hu from './locales/hu';
import lt from './locales/lt';
import lv from './locales/lv';
import id from './locales/id';
import ro from './locales/ro';
import pt_PT from './locales/pt-PT';
import elv from './locales/elv';
import doth from './locales/doth';
import qvy from './locales/qvy';
import qav from './locales/qav';
import atl from './locales/atl';

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
      pt,
      ja,
      ar,
      sw,
      yo,
      eo,
      hi,
      ko,
      no,
      sv,
      pa,
      fi,
      ru,
      pl,
      tr,
      ca,
      cs,
      el,
      he,
      uk,
      sr,
      sk,
      sl,
      ur,
      bg,
      hr,
      hu,
      lt,
      lv,
      id,
      ro,
      'pt-PT': pt_PT,
      elv,
      doth,
      qvy,
      qav,
      atl,
    },
  });

export default i18n;
