import "dotenv/config";
import { db } from "@/db/client";
import { articles, articleVersions, auditLogs, events } from "@/db/schema";
import { transitionEvent } from "@/lib/event-state-machine";
import { slugify } from "@/lib/slugify";

// One-off manual publish (HUMAN_ONLY, no AI) — same path as
// src/app/(admin)/admin/articles/actions.ts's createManualArticle, but for
// a brand-new external article that has no pre-existing radar-collected
// event yet, so the event row is created here first. Source: souss-actualites.com,
// syndicated with a visible backlink credit per Hicham's request 2026-09-21.

const SOURCE_URL =
  "https://souss-actualites.com/2026/09/21/%d9%83%d8%a7%d8%a8%d9%88%d8%b3-%d8%a7%d9%84%d8%b3%d8%a7%d8%b9%d8%a9-%d8%a7%d9%84%d9%85%d8%b6%d8%a7%d9%81%d8%a9-%d9%8a%d9%86%d8%aa%d9%87%d9%8a-%d8%a3%d8%ae%d9%8a%d8%b1%d8%a7-%d9%83%d9%8a%d9%81-%d8%a7/";
const IMAGE_URL =
  "https://souss-actualites.com/wp-content/uploads/2026/09/grok_1789989483707-1024x687.jpg";

const TITLE =
  'كابوس "الساعة المضافة" ينتهي أخيرا: كيف استرد المغاربة شمسهم وسكينتهم المسلوبة';

const BODY = [
  "تنفس المغرب الصعداء وسقط بقرار واحد جبل صامت كان يجثم على أنفاس الأسر المغربية طيلة سنوات، لم يكن الخبر مجرد تعديل تقني في عقارب الساعة، بل كان إعلان تحرير لروتين يومي طالما سرق السكينة وحول الأيام إلى معركة حامية الوطيس مع التوتر والقلق.",
  "لقد عشنا طيلة الفترة الماضية تجربة استثنائية أثبتت بالدليل القاطع شاسع الفرق، حيث استعدنا إيقاع الحياة العادي والطبيعي، وعادت إشراقة الصباح تتدفق بهدوء وسلاسة دون ذاك التوتر المستمر أو السباق المحموم مع الزمن. أدرك الجميع كيف يمكن لليوم أن يمر بسكينة وطمأنينة حين تنسجم ساعات العمل والتحصيل مع الساعة البيولوجية الفطرية للإنسان، بعيدا عن القلق الناجم عن اقتلاع الأطفال من أسرتهم في الظلمة الدامسة وإرهاق أجساد الشغيلة تحت وطأة إيقاع قسري لا يرحم.",
  "اليوم ينكسر القيد الزمني نهائيا، وتطوى واحدة من أكثر التجارب إثارة للجدل والإرهاق النفسي.",
  "إن العودة إلى التوقيت الطبيعي ليست مجرد ضبط للمواعيد، بل هي انتصار صارخ للراحة النفسية والأمن الاجتماعي، وإعادة للسكينة والتوازن التي غابت عن البيت المغربي لسنوات.",
  "لقد أثبتت التجربة أن الطمأنينة وصحة المواطن البدنية والنفسية هي الاستثمار الحقيقي الذي لا يقدر بثمن.",
  "تطوى اليوم صفحة العناء والتوتر الدائم، ليعود للشارع هدوؤه، وللبيت استقراره، ولتشرق الشمس أخيرا في موعدها الطبيعي.",
  `المصدر: سوس أكتواليتي — ${SOURCE_URL}`,
].join("\n\n");

async function main() {
  const [event] = await db
    .insert(events)
    .values({
      title: TITLE,
      category: "news",
      status: "candidate",
    })
    .returning({ id: events.id });
  if (!event) throw new Error("event insert failed");

  const slugBase = slugify(TITLE);
  const slug = `${slugBase || "article"}-${event.id.slice(0, 8)}`;

  const [article] = await db
    .insert(articles)
    .values({
      eventId: event.id,
      locale: "ar",
      status: "published",
      title: TITLE,
      slug,
      body: BODY,
      imageUrl: IMAGE_URL,
      publicationMode: "human_only",
      publishedAt: new Date(),
    })
    .returning({ id: articles.id });
  if (!article) throw new Error("article insert failed");

  await db.insert(articleVersions).values({
    articleId: article.id,
    version: 1,
    title: TITLE,
    body: BODY,
    editedBy: "human",
  });

  await db.insert(auditLogs).values({
    entityType: "article",
    entityId: article.id,
    action: "manual_publish",
    actorType: "human",
    details: { eventId: event.id, locale: "ar", sourceUrl: SOURCE_URL, syndicated: true },
  });

  const transition = await transitionEvent({
    db,
    eventId: event.id,
    from: "candidate",
    to: "published",
    actorType: "human",
    reason: "hand-written article published directly (HUMAN_ONLY, no AI) — syndicated from souss-actualites.com with source credit",
  });
  if (!transition.ok) throw new Error(transition.error);

  console.log("Published:", { eventId: event.id, articleId: article.id, slug, url: `/ar/${slug}` });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
