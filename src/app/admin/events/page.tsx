import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { events, sourceItems, sources } from "@/db/schema";

/**
 * Internal ops view of radar output. No auth yet (Phase 0's `users`/`roles`
 * work hasn't landed) — this is only safe because nothing in this repo is
 * deployed. Do not deploy this route before Phase 2's auth lands.
 */
export const dynamic = "force-dynamic";

async function getRecentEvents() {
  return db
    .select({
      id: events.id,
      title: events.title,
      category: events.category,
      status: events.status,
      priority: events.priority,
      detectedAt: events.detectedAt,
    })
    .from(events)
    .orderBy(desc(events.detectedAt))
    .limit(50);
}

async function getItemsFor(eventId: string) {
  return db
    .select({
      title: sourceItems.title,
      url: sourceItems.url,
      fetchedAt: sourceItems.fetchedAt,
      sourceName: sources.name,
    })
    .from(sourceItems)
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(eq(sourceItems.eventId, eventId));
}

export default async function AdminEventsPage() {
  const recentEvents = await getRecentEvents();
  const eventsWithItems = await Promise.all(
    recentEvents.map(async (event) => ({
      event,
      items: await getItemsFor(event.id),
    })),
  );

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 960 }}>
      <h1>Radar — candidate events</h1>
      <p>
        Dev-only, unauthenticated. SHADOW mode: nothing here is published.
        {" "}{recentEvents.length} most recent event(s).
      </p>
      {eventsWithItems.length === 0 && <p>No events yet — run `npm run radar:once`.</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Detected</th>
            <th>Category</th>
            <th>Status</th>
            <th>Title</th>
            <th>Sources</th>
          </tr>
        </thead>
        <tbody>
          {eventsWithItems.map(({ event, items }) => (
            <tr key={event.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{event.detectedAt.toISOString()}</td>
              <td>{event.category}</td>
              <td>
                {event.status} / {event.priority}
              </td>
              <td>{event.title}</td>
              <td>
                {items.map((item) => (
                  <div key={item.url}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.sourceName}
                    </a>
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
