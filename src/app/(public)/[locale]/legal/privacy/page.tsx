import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";

export const dynamic = "force-dynamic";

const CONTENT = {
  fr: {
    title: "Politique de protection des données et de confidentialité",
    body: [
      "Ce site ne collecte actuellement aucune donnée de compte utilisateur et ne permet pour l'instant ni inscription ni commentaires.",
      "Les seules données techniques traitées sont celles générées par la navigation elle-même, y compris les journaux serveur standard.",
      "Aucune donnée personnelle n'est vendue ni partagée avec des tiers à des fins publicitaires.",
      "Cette politique sera complétée dès que des fonctionnalités impliquant un traitement de données personnelles seront ajoutées, telles qu'une newsletter, des comptes utilisateurs ou des commentaires.",
      "Pour toute question, merci de consulter la page Contact.",
    ],
  },
  ar: {
    title: "سياسة حماية البيانات والخصوصية",
    body: [
      "لا يجمع هذا الموقع حاليًا أي بيانات حساب للمستخدمين، ولا يتيح في الوقت الحالي التسجيل أو التعليقات.",
      "البيانات التقنية الوحيدة التي تتم معالجتها هي البيانات الناتجة عن التصفح نفسه، بما في ذلك سجلات الخادم المعتادة.",
      "لا يتم بيع أي بيانات شخصية أو مشاركتها مع أطراف ثالثة لأغراض إعلانية.",
      "سيتم استكمال هذه السياسة فور إضافة ميزات تتضمن معالجة بيانات شخصية، مثل النشرة البريدية أو حسابات المستخدمين أو التعليقات.",
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
