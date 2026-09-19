import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Politique de correction et droit de réponse",
    body: [
      "Chaque article publié conserve un historique de versions. Toute erreur signalée est corrigée dans le texte, et l'article passe au statut « corrigé » avec un horodatage visible — rien n'est corrigé silencieusement.",
      "Toute personne citée ou concernée par un article dispose d'un droit de réponse.",
      <>
        Pour demander un droit de réponse ou une correction, merci de nous contacter par e-mail :{" "}
        <a href="mailto:atlasdepeche@gmail.com">atlasdepeche@gmail.com</a>
      </>,
      "Merci d'indiquer le lien de l'article concerné et le point contesté.",
      "Une correction factuelle vérifiée est traitée en priorité et publiée dès que la vérification est faite, et non selon un calendrier fixe.",
    ],
  },
  ar: {
    title: "سياسة التصحيح والحق في الرد",
    body: [
      "يحتفظ كل مقال منشور بسجل للنسخ. يتم تصحيح أي خطأ يُبلَّغ عنه في النص، وينتقل المقال إلى حالة «تم تصحيحه» مع طابع زمني ظاهر، ولا يتم تصحيح أي شيء بشكل صامت.",
      "لكل شخص مذكور أو معني بمقال الحق في الرد.",
      <>
        لطلب حق الرد أو تصحيح، يرجى التواصل عبر البريد الإلكتروني:{" "}
        <a href="mailto:atlasdepeche@gmail.com">atlasdepeche@gmail.com</a>
      </>,
      "يرجى تحديد رابط المقال المعني والنقطة موضوع النزاع.",
      "يُعالَج التصحيح الوقائعي المتحقق منه بالأولوية ويُنشر فور إتمام التحقق، وليس وفق جدول زمني ثابت.",
    ],
  },
};

export default async function CorrectionsPage({
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
