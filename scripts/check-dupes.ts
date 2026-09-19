import "dotenv/config";
import { getFilteredRadarItems } from "@/lib/public-site";

async function main() {
  for (const locale of ["fr", "ar"] as const) {
    const items = await getFilteredRadarItems(locale);
    console.log(`\n=== ${locale}: ${items.length} items (after filter+dedupe) ===`);

    const byTitle = new Map<string, typeof items>();
    for (const it of items) {
      const key = it.title.trim().toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key)!.push(it);
    }
    for (const [title, group] of byTitle) {
      if (group.length > 1) {
        console.log(`DUP TITLE (${group.length}x): "${title}"`);
        for (const g of group) console.log(`   id=${g.id} url=${g.url} source=${g.sourceName} img=${g.imageUrl}`);
      }
    }

    const byImg = new Map<string, typeof items>();
    for (const it of items) {
      if (!it.imageUrl) continue;
      if (!byImg.has(it.imageUrl)) byImg.set(it.imageUrl, []);
      byImg.get(it.imageUrl)!.push(it);
    }
    for (const [img, group] of byImg) {
      if (group.length > 1) {
        console.log(`DUP IMAGE (${group.length}x): ${img}`);
        for (const g of group) console.log(`   id=${g.id} title="${g.title}" source=${g.sourceName}`);
      }
    }
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
