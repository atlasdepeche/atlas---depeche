import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

/**
 * Placeholder legal notice — MASTER_PROMPT section 36 requires this page
 * but explicitly says "user must fill real identity". Nothing here is
 * invented; every identity field is a marked placeholder until the real
 * publisher/host/director information is supplied.
 */
export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Mentions légales",
    body: [
      "Directeur de la publication : [À COMPLÉTER — nom légal]",
      "Éditeur : [À COMPLÉTER — raison sociale, forme juridique, siège social]",
      "Hébergeur : [À COMPLÉTER]",
      "Contact : voir la page Contact.",
      "Cette page est un placeholder — aucune identité n'a été inventée. Elle doit être complétée avec les informations réelles avant toute publication publique du site.",
    ],
  },
  ar: {
    title: "الإشعار القانوني",
    body: [
      "مدير النشر: [يجب استكمال — الاسم القانوني]",
      "الناشر: [يجب استكمال — التسمية الاجتماعية، الشكل القانوني، المقر الاجتماعي]",
      "المستضيف: [يجب استكمال]",
      "للتواصل: راجع صفحة اتصل بنا.",
      "هذه الصفحة عبارة عن نموذج أولي — لم يتم اختلاق أي هوية. يجب استكمالها بالمعلومات الحقيقية قبل أي نشر عمومي للموقع.",
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
