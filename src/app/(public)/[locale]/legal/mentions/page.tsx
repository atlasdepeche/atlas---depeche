import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Mentions légales",
    body: [
      "Responsable du site : la personne légalement désignée comme responsable du site et de son contenu.",
      "Hébergement : le site est hébergé chez un prestataire d'hébergement externe.",
      "Pour toute question ou demande de contact, merci de consulter la page Contact.",
    ],
  },
  ar: {
    title: "الإشعار القانوني",
    body: [
      "المسؤول عن الموقع: المسؤول المعيّن قانونيًا عن الموقع ومحتواه.",
      "الاستضافة: يتم استضافة الموقع لدى مزود خدمات استضافة خارجي.",
      "لأي استفسار أو تواصل، يرجى مراجعة صفحة اتصل بنا.",
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
