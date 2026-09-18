import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Contact",
    body: [
      "Adresse e-mail : atlasdepeche@gmail.com",
      "Pour un droit de réponse ou une demande de correction, merci d'indiquer le lien de l'article concerné et le point contesté.",
    ],
  },
  ar: {
    title: "اتصل بنا",
    body: [
      "البريد الإلكتروني: atlasdepeche@gmail.com",
      "لطلب حق الرد أو تصحيح، يرجى تحديد رابط المقال المعني والنقطة موضوع النزاع.",
    ],
  },
};

export default async function ContactPage({
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
