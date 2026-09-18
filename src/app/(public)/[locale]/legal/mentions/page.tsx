import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

/**
 * Legal notice — MASTER_PROMPT section 36. Director of publication is real
 * (confirmed by the user 2026-09-18: Hicham Jikh Cheddad). The publisher
 * legal entity and hosting provider fields are still placeholders — those
 * are a different question (registered business form, actual host) that
 * hasn't been answered yet, so they stay marked rather than guessed.
 */
export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Mentions légales",
    body: [
      "Directeur de la publication : Hicham Jikh Cheddad",
      "Éditeur : [À COMPLÉTER — raison sociale, forme juridique, siège social]",
      "Hébergeur : [À COMPLÉTER]",
      "Contact : voir la page Contact.",
      "L'éditeur et l'hébergeur restent à compléter avec les informations réelles avant toute publication publique du site.",
    ],
  },
  ar: {
    title: "الإشعار القانوني",
    body: [
      "مدير النشر: Hicham Jikh شداد",
      "الناشر: [يجب استكمال — التسمية الاجتماعية، الشكل القانوني، المقر الاجتماعي]",
      "المستضيف: [يجب استكمال]",
      "للتواصل: راجع صفحة اتصل بنا.",
      "يجب استكمال معلومات الناشر والمستضيف بالمعلومات الحقيقية قبل أي نشر عمومي للموقع.",
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
