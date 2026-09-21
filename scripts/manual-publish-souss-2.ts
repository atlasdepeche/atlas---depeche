import "dotenv/config";
import { db } from "@/db/client";
import { articles, articleVersions, auditLogs, events } from "@/db/schema";
import { transitionEvent } from "@/lib/event-state-machine";
import { slugify } from "@/lib/slugify";

// Second manual publish (HUMAN_ONLY, no AI) — same path as
// manual-publish-souss-1.ts. Source: souss-actualites.com, syndicated with
// a visible backlink credit per Hicham's original request 2026-09-21
// (the second of the two URLs he gave in that first message).

const SOURCE_URL =
  "https://souss-actualites.com/2026/09/21/%d8%ad%d9%8a%d9%86-%d9%8a%d8%b9%d8%b7%d9%84-%d8%a7%d9%84%d9%82%d8%a7%d9%86%d9%88%d9%86-%d8%a7%d8%ac%d8%b9%d9%84-%d8%b5%d9%88%d8%aa%d9%83-%d8%a7%d9%84%d8%a7%d9%86%d8%aa%d8%ae%d8%a7%d8%a8%d9%8a-%d9%85/";
const IMAGE_URL =
  "https://souss-actualites.com/wp-content/uploads/2026/09/grok_1789988712793-1024x687.jpg";

const TITLE = "حين يعطل القانون اجعل صوتك الانتخابي مقصلة للمحاسبة";

const BODY = [
  "حين يتأخر تفعيل مبدأ ربط المسؤولية بالمحاسبة، وتتراخى آليات الرقابة والمساءلة المؤسساتية في ردع العبث بالشأن العام، يجد المواطن نفسه أمام حقيقة ساطعة.",
  "إما الاستسلام لواقع التراجع، أو تحويل صوت الانتخابات إلى أداة حاسمة للتقييم والتطهير السياسي. إن صندوق الاقتراع ليس مجرد ورقة تودع في صندوق عابر، بل هو القضاء والقدر السياسي لكل مسؤول أخلف وعده أو استخف بتطلعات المجتمع او تغطرس عليهم وكشر أنيابه.",
  "إن غياب المحاسبة الفورية يغذي ثقافة الإفلات من العقاب، ويهدر طاقات التنمية المحلية، ويكرس تدبيرا هزيلا يفرغ الديمقراطية من محتواها الحقيقي.",
  "ومن هنا بالضبط تبرز الخطورة، وتتأكد الحاجة الملحة لانتفاضة وعي صامتة يوم الاستحقاق. فعندما يعجز القانون أحيانا عن إنصاف المواطن في الوقت المناسب، يمتلك الناخب القوة المطلقة ليعاقب بالصوت، ويرفض التجديد لمن أثبتوا عجزهم، ويقبر مشاريع الريع والاستهتار بالمال والزمن التنموي.",
  "إننا اليوم أمام مسؤولية تاريخية تحتم علينا مقاطعة الولاءات العمياء، ومحاكمة الحصيلة التدبيرية بميزان الصرامة لا بالعاطفة والشعارات الفضفاضة.",
  "اجعلوا من أصواتكم الانتخابية رسالة مدوية لا تقبل التأويل، من أدى مهمته بإخلاص وكفاءة فله الدعم والاستمرار، ومن خان الأمانة أو أدار ظهره للمصلحة العامة، فليذق مرارة السقوط المدوي في صناديق الاقتراع.",
  "فصوتك ليس مجرد رأي، بل هو السلاح الأخير لفرض الاحترام على من يتولى أمرك، والسبيل الأوحد لبناء غد لا مكان فيه للمتسولين على عتبات المسؤولية.",
  `المصدر: سوس أكتواليتي — ${SOURCE_URL}`,
].join("\n\n");

async function main() {
  const [event] = await db
    .insert(events)
    .values({
      title: TITLE,
      category: "politics",
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
