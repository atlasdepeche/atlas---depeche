import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Politique de correction",
    body: [
      "Chaque article publié conserve un historique de versions. Une erreur signalée est corrigée dans le texte, et l'article passe au statut « corrigé » avec un horodatage visible — rien n'est corrigé silencieusement.",
      "Toute personne citée ou concernée par un article dispose d'un droit de réponse : contactez-nous via la page Contact en indiquant l'article concerné et le point contesté.",
      "Une correction factuelle vérifiée est traitée en priorité et publiée dès que la vérification est faite, pas selon un calendrier fixe.",
    ],
  },
  ar: {
    title: "سياسة التصحيحات",
    body: [
      "يحتفظ كل مقال منشور بسجل للنسخ. يتم تصحيح أي خطأ يُبلَّغ عنه في النص، وينتقل المقال إلى حالة «تم تصحيحه» مع طابع زمني ظاهر — لا يتم تصحيح أي شيء بشكل صامت.",
      "لكل شخص مذكور أو معني بمقال الحق في الرد: تواصلوا معنا عبر صفحة اتصل بنا مع تحديد المقال المعني والنقطة موضوع النزاع.",
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
    <div>
      <h1>{title}</h1>
      {body.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
