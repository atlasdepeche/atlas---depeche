import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

/**
 * Legal notice — MASTER_PROMPT section 36. Director of publication is real
 * (confirmed by the user 2026-09-18: Hicham Jikh Cheddad). 2026-09-18,
 * later: user confirmed there is no registered company — he is publishing
 * as a natural person ("yo soy el responsable de todo... no soy banco ni
 * ministerio"), so "Éditeur" is his own name, not a fabricated business
 * entity. His street/postal address was never given — never invent one,
 * so that line stays marked. Hosting: Railway Corporation (railway.com),
 * a real, verified company — but its exact registered address wasn't
 * confirmed from their public legal pages, so that detail stays marked
 * too rather than guessed. Both remaining placeholders should be filled
 * before any real public launch — Moroccan press law requires them.
 */
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
    <div>
      <h1>{title}</h1>
      {body.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
