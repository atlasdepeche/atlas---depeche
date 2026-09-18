import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Politique de confidentialité",
    body: [
      "Responsable du traitement : Hicham Jikh Cheddad (voir Mentions légales).",
      "Ce site ne collecte, à ce stade, aucune donnée de compte utilisateur (pas d'inscription, pas de commentaires). Les seules données techniques traitées sont celles générées par la navigation elle-même (journaux serveur standard).",
      "Aucune donnée personnelle n'est vendue ni partagée avec des tiers à des fins publicitaires.",
      "Cette politique sera complétée dès que des fonctionnalités impliquant des données personnelles (newsletter, compte, commentaires) seront mises en place.",
      "Pour toute question, voir la page Contact.",
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    body: [
      "المسؤول عن المعالجة: Hicham Jikh شداد (راجع الإشعار القانوني).",
      "لا يجمع هذا الموقع حاليًا أي بيانات حساب للمستخدمين (لا تسجيل، لا تعليقات). البيانات التقنية الوحيدة المعالجة هي تلك الناتجة عن التصفح نفسه (سجلات الخادم المعتادة).",
      "لا يتم بيع أي بيانات شخصية أو مشاركتها مع أطراف ثالثة لأغراض إعلانية.",
      "سيتم استكمال هذه السياسة فور إضافة ميزات تتضمن بيانات شخصية (نشرة إخبارية، حساب، تعليقات).",
      "لأي استفسار، يرجى مراجعة صفحة اتصل بنا.",
    ],
  },
};

export default async function PrivacyPage({
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
