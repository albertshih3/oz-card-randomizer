import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";
import { requireApproved } from "../_auth.js";
import { enforceRateLimit } from "../_rate-limit.js";

interface DayEntry {
  date: string;
  activeUsers: number;
  sessions: number;
  /** Count of `generate` events: actions, not packs. A run of 50 counts once. */
  packGenerations: number;
  exports: number;
}

interface PeriodTotals {
  activeUsers: number;
  sessions: number;
  packGenerations: number;
  exports: number;
}

interface SummaryResponse {
  days: number;
  series: DayEntry[];
  current: PeriodTotals;
  prior: PeriodTotals;
}

const SUPPORTED_DAYS = new Set([7, 30, 90]);
const DEFAULT_DAYS = 30;

/** Returns the requested window, or null for anything but one supported value. */
function parseDays(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_DAYS;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const days = Number(raw);
  return SUPPORTED_DAYS.has(days) ? days : null;
}

type Report = protos.google.analytics.data.v1beta.IRunReportResponse;
type Row = protos.google.analytics.data.v1beta.IRow;

function metric(row: Row | undefined, index: number): number {
  const value = Number.parseInt(row?.metricValues?.[index]?.value ?? "0", 10);
  return Number.isFinite(value) ? value : 0;
}

function ga4DateToIso(ga4Date: string): string {
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`;
}

/**
 * The `days` complete calendar days before today in the property's timezone,
 * oldest first. Calendar arithmetic happens in UTC so DST changes cannot skip or
 * repeat a date.
 */
export function completeDaysBefore(
  now: Date,
  timeZone: string,
  days: number,
): string[] {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: days }, (_, i) =>
    new Date(Date.UTC(year, month - 1, day - days + i))
      .toISOString()
      .slice(0, 10),
  );
}

function eventTotals(report: Report): { generate: number; download: number } {
  const totals = { generate: 0, download: 0 };
  for (const row of report.rows ?? []) {
    const name = row.dimensionValues?.at(-1)?.value;
    if (name === "generate" || name === "download") {
      totals[name] += metric(row, 0);
    }
  }
  return totals;
}

let cachedClient: { key: string; client: BetaAnalyticsDataClient } | null =
  null;

function analyticsClientFor(encoded: string): BetaAnalyticsDataClient {
  if (cachedClient?.key === encoded) return cachedClient.client;
  const credentials = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8"),
  );
  const client = new BetaAnalyticsDataClient({ credentials });
  cachedClient = { key: encoded, client };
  return client;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end();
    return;
  }

  let userId: string;
  try {
    ({ userId } = await requireApproved(req, res));
  } catch {
    return;
  }

  const days = parseDays(req.query.days);
  if (days === null) {
    res.status(400).json({ error: "days must be 7, 30, or 90" });
    return;
  }

  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    !process.env.GA4_PROPERTY_ID
  ) {
    res.status(500).json({ error: "Analytics not configured" });
    return;
  }

  let analyticsClient: BetaAnalyticsDataClient;
  try {
    analyticsClient = analyticsClientFor(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    );
  } catch {
    res.status(500).json({ error: "Invalid analytics credentials" });
    return;
  }

  const allowed = await enforceRateLimit(res, {
    bucket: "analytics",
    key: userId,
    limit: 60,
    windowSeconds: 3600,
    whenUnavailable: "allow",
  });
  if (!allowed) return;

  const property = `properties/${process.env.GA4_PROPERTY_ID}`;

  // Relative dates resolve in the GA property's timezone, so both periods align
  // with its reporting days and exclude today's partial data.
  const current = { startDate: `${days}daysAgo`, endDate: "yesterday" };
  const prior = {
    startDate: `${days * 2}daysAgo`,
    endDate: `${days + 1}daysAgo`,
  };

  const usage = [{ name: "activeUsers" }, { name: "sessions" }];
  const trackedEvents = {
    filter: {
      fieldName: "eventName",
      inListFilter: { values: ["generate", "download"] },
    },
  };

  try {
    const [
      [daily],
      [currentUsage],
      [dailyEvents],
      [priorUsage],
      [priorEvents],
    ] = await Promise.all([
      // Users and sessions describe all app usage, not only generators.
      analyticsClient.runReport({
        property,
        dateRanges: [current],
        dimensions: [{ name: "date" }],
        metrics: usage,
      }),
      // Period uniques need their own query: a returning user appears in
      // several daily rows, so summing those would overcount.
      analyticsClient.runReport({
        property,
        dateRanges: [current],
        metrics: usage,
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [current],
        dimensions: [{ name: "date" }, { name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: trackedEvents,
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [prior],
        metrics: usage,
      }),
      analyticsClient.runReport({
        property,
        dateRanges: [prior],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: trackedEvents,
      }),
    ]);

    const timeZone = daily.metadata?.timeZone || "UTC";
    const dateMap = new Map<string, DayEntry>(
      completeDaysBefore(new Date(), timeZone, days).map((date) => [
        date,
        { date, activeUsers: 0, sessions: 0, packGenerations: 0, exports: 0 },
      ]),
    );

    for (const row of daily.rows ?? []) {
      const entry = dateMap.get(
        ga4DateToIso(row.dimensionValues?.[0]?.value ?? ""),
      );
      if (entry) {
        entry.activeUsers = metric(row, 0);
        entry.sessions = metric(row, 1);
      }
    }

    for (const row of dailyEvents.rows ?? []) {
      const entry = dateMap.get(
        ga4DateToIso(row.dimensionValues?.[0]?.value ?? ""),
      );
      const name = row.dimensionValues?.[1]?.value;
      if (entry && name === "generate") entry.packGenerations = metric(row, 0);
      if (entry && name === "download") entry.exports = metric(row, 0);
    }

    const series = [...dateMap.values()];
    const currentEvents = eventTotals(dailyEvents);
    const priorEventTotals = eventTotals(priorEvents);

    const response: SummaryResponse = {
      days,
      series,
      current: {
        activeUsers: metric(currentUsage.rows?.[0], 0),
        sessions: metric(currentUsage.rows?.[0], 1),
        packGenerations: currentEvents.generate,
        exports: currentEvents.download,
      },
      prior: {
        activeUsers: metric(priorUsage.rows?.[0], 0),
        sessions: metric(priorUsage.rows?.[0], 1),
        packGenerations: priorEventTotals.generate,
        exports: priorEventTotals.download,
      },
    };
    res.setHeader("Cache-Control", "private, max-age=300");
    res.status(200).json(response);
  } catch (err) {
    console.error("[GET /api/analytics/summary]", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}
