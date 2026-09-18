export const SUPPORTED_LOCALES = ["ar", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
};

interface Dictionary {
  siteName: string;
  tagline: string;
  homeLabel: string;
  noArticlesYet: string;
  otherLocaleLabel: string;
  legal: {
    mentions: string;
    privacy: string;
    corrections: string;
    contact: string;
  };
}

const DICTIONARIES: Record<Locale, Dictionary> = {
  ar: {
    siteName: "Atlas Depeche",
    tagline: "منصة إخبارية مغربية — الدقة أولاً",
    homeLabel: "الرئيسية",
    noArticlesYet: "لا توجد مقالات منشورة بعد.",
    otherLocaleLabel: "Français",
    legal: {
      mentions: "الإشعار القانوني",
      privacy: "سياسة الخصوصية",
      corrections: "سياسة التصحيحات",
      contact: "اتصل بنا",
    },
  },
  fr: {
    siteName: "Atlas Depeche",
    tagline: "Média marocain — la précision d'abord",
    homeLabel: "Accueil",
    noArticlesYet: "Aucun article publié pour le moment.",
    otherLocaleLabel: "العربية",
    legal: {
      mentions: "Mentions légales",
      privacy: "Politique de confidentialité",
      corrections: "Politique de correction",
      contact: "Contact",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
