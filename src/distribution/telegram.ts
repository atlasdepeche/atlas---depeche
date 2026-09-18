import type { DistributionAdapter } from "./types";

/**
 * Telegram Bot API sendMessage. Behind a flag — see src/distribution/x.ts
 * for the shared rationale. Untested against the real API: no bot token
 * configured in this environment (creating one via @BotFather is free and
 * fast, unlike X's paid developer tiers — worth doing first if only one
 * channel gets tested).
 */
export const telegramAdapter: DistributionAdapter = {
  channel: "telegram",

  isEnabled: () =>
    process.env.DISTRIBUTION_TELEGRAM_ENABLED === "true" &&
    Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),

  post: async (article, siteUrl) => {
    if (!telegramAdapter.isEnabled()) {
      return { status: "disabled" };
    }

    const token = process.env.TELEGRAM_BOT_TOKEN as string;
    const chatId = process.env.TELEGRAM_CHAT_ID as string;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const text = `${article.title}\n${siteUrl}/${article.locale}/${article.slug}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        result?: { message_id?: number };
        description?: string;
      };

      if (!res.ok || !body.ok) {
        return { status: "error", errorMessage: `${res.status} ${body.description ?? JSON.stringify(body)}` };
      }

      return {
        status: "posted",
        externalPostId: body.result?.message_id != null ? String(body.result.message_id) : undefined,
      };
    } catch (err) {
      return { status: "error", errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
