/**
 * Cost guard for advertising module — prevents runaway API spend.
 * Per-company daily limits, global daily limits, and generation counters.
 */
import { db } from "@/db/client";
import { adCostLog } from "@/db/schema";
import { gte, eq, and, sql } from "drizzle-orm";
import type { CostGuardResult } from "./types";

const DEFAULT_DAILY_LIMIT_USD = 5.0;
const DEFAULT_MAX_GENERATIONS_PER_DAY = 10;

/**
 * Check if a generation action is allowed under cost limits.
 */
export async function checkCostGuard(
  companyId: string,
  dailyLimitUsd: number = DEFAULT_DAILY_LIMIT_USD,
  maxGenerationsPerDay: number = DEFAULT_MAX_GENERATIONS_PER_DAY,
): Promise<CostGuardResult> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Sum cost for this company today
  const costResult = await db
    .select({
      total: sql<string>`coalesce(sum(${adCostLog.costUsd}::numeric), 0)`,
    })
    .from(adCostLog)
    .where(
      and(
        eq(adCostLog.companyId, companyId),
        gte(adCostLog.createdAt, startOfDay),
      ),
    );

  const currentCost = parseFloat(costResult[0]?.total ?? "0");

  // Count generations for this company today
  const genResult = await db
    .select({ count: sql<string>`count(*)` })
    .from(adCostLog)
    .where(
      and(
        eq(adCostLog.companyId, companyId),
        eq(adCostLog.action, "generate"),
        gte(adCostLog.createdAt, startOfDay),
      ),
    );

  const generationsToday = parseInt(genResult[0]?.count ?? "0");

  if (currentCost >= dailyLimitUsd) {
    return {
      allowed: false,
      reason: `Daily cost limit reached ($${currentCost.toFixed(2)} / $${dailyLimitUsd.toFixed(2)})`,
      currentCost,
      dailyLimit: dailyLimitUsd,
      generationsToday,
      maxGenerationsPerDay,
    };
  }

  if (generationsToday >= maxGenerationsPerDay) {
    return {
      allowed: false,
      reason: `Daily generation limit reached (${generationsToday} / ${maxGenerationsPerDay})`,
      currentCost,
      dailyLimit: dailyLimitUsd,
      generationsToday,
      maxGenerationsPerDay,
    };
  }

  return {
    allowed: true,
    reason: "OK",
    currentCost,
    dailyLimit: dailyLimitUsd,
    generationsToday,
    maxGenerationsPerDay,
  };
}

/**
 * Log a cost event.
 */
export async function logCost(params: {
  companyId: string;
  creativeId?: string;
  action: string;
  provider: string;
  costUsd: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(adCostLog).values({
    companyId: params.companyId,
    creativeId: params.creativeId ?? null,
    action: params.action,
    provider: params.provider,
    costUsd: String(params.costUsd),
    details: params.details ?? null,
  });
}
