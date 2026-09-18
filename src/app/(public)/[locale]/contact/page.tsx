import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Contact",
    body: [
      "Adresse e-mail : [À COMPLÉTER]",
      "Pour un droit de réponse ou une demande de correction, merci d'indiquer le lien de l'article concerné et le point contesté.",
    ],
  },
  ar: {
    title: "اتصل بنا",
    body: [
      "البريد الإلكتروني: [يجب استكمال]",
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
    <div>
      <h1>{title}</h1>
      {body.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
