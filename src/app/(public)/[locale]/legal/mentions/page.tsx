import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Mentions légales",
    body: [
      "Directeur de la publication : Hicham Jikh Cheddad",
      "Éditeur : Hicham Jikh Cheddad, personne physique (pas de société enregistrée). Adresse : [À COMPLÉTER].",
      "Hébergeur : Railway Corporation (railway.com). Adresse enregistrée exacte : [À COMPLÉTER].",
      "Contact : voir la page Contact.",
      "L'adresse de l'éditeur et l'adresse exacte de l'hébergeur restent à compléter avant toute publication publique du site.",
    ],
  },
  ar: {
    title: "الإشعار القانوني",
    body: [
      "مدير النشر: Hicham Jikh شداد",
      "الناشر: Hicham Jikh شداد، شخص طبيعي (لا توجد شركة مسجلة). العنوان: [يجب استكمال].",
      "المستضيف: Railway Corporation (railway.com). العنوان القانوني الدقيق: [يجب استكمال].",
      "للتواصل: راجع صفحة اتصل بنا.",
      "يجب استكمال عنوان الناشر والعنوان القانوني الدقيق للمستضيف قبل أي نشر عمومي للموقع.",
    ],
  },
};

export default async function MentionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { title, body } = CONTENT[locale];

  return (
    <div style={{ maxInlineSize: "var(--max-width-content)", marginInline: "auto" }}>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-3xl)", marginBlockEnd: "var(--space-6)" }}>
        {title}
      </h1>
      {body.map((line, i) => (
        <p key={i} style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-base)", lineHeight: 1.8, marginBlockEnd: "var(--space-4)" }}>
          {line}
        </p>
      ))}
    </div>
  );
}
