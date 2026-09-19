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
  searchLabel: string;
  searchPlaceholder: string;
  searchResults: string;
  searchNoResults: string;
  noArticlesYet: string;
  noItemsYet: string;
  otherLocaleLabel: string;
  pagination: {
    previous: string;
    next: string;
    pageOf: (page: number, totalPages: number) => string;
  };
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
    searchLabel: "بحث",
    searchPlaceholder: "ابحث عن أخبار...",
    searchResults: "نتائج البحث",
    searchNoResults: "لا توجد نتائج مطابقة.",
    noArticlesYet: "لا توجد مقالات منشورة بعد.",
    noItemsYet: "لا توجد عناصر بعد.",
    otherLocaleLabel: "Français",
    pagination: {
      previous: "السابق",
      next: "التالي",
      pageOf: (page, totalPages) => `صفحة ${page} من ${totalPages}`,
    },
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
    searchLabel: "Recherche",
    searchPlaceholder: "Rechercher des actualités...",
    searchResults: "Résultats de recherche",
    searchNoResults: "Aucun résultat correspondant.",
    noArticlesYet: "Aucun article publié pour le moment.",
    noItemsYet: "Aucun élément pour le moment.",
    otherLocaleLabel: "العربية",
    pagination: {
      previous: "Précédent",
      next: "Suivant",
      pageOf: (page, totalPages) => `Page ${page} sur ${totalPages}`,
    },
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
