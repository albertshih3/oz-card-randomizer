import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { requireAuth } from "../_auth.js";

interface DayEntry {
  date: string;
  activeUsers: number;
  sessions: number;
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

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function ga4DateToIso(ga4Date: string): string {
  return `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`;
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

  try {
    await requireAuth(req, res);
  } catch {
    return;
  }

  const rawDays = parseInt((req.query.days as string) ?? "30", 10);
  const days =
    Number.isNaN(rawDays) || rawDays < 1 ? 30 : Math.min(rawDays, 90);

  if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    !process.env.GA4_PROPERTY_ID
  ) {
    res.status(500).json({ error: "Analytics not configured" });
    return;
  }

  let analyticsClient: BetaAnalyticsDataClient;
  try {
    const creds = JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        "base64",
      ).toString("utf8"),
    );
    analyticsClient = new BetaAnalyticsDataClient({ credentials: creds });
  } catch {
    res.status(500).json({ error: "Invalid analytics credentials" });
    return;
  }

  const propertyId = `properties/${process.env.GA4_PROPERTY_ID}`;

  const currentStartDate = formatDate(daysAgo(days));
  const currentEndDate = formatDate(daysAgo(1));
  const priorStartDate = formatDate(daysAgo(days * 2));
  const priorEndDate = formatDate(daysAgo(days + 1));

  try {
    const [[responseA], [responseB], [responseC], [responseD]] =
      await Promise.all([
        // Current period: generate events with date dimension
        analyticsClient.runReport({
          property: propertyId,
          dateRanges: [
            { startDate: currentStartDate, endDate: currentEndDate },
          ],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "eventCount" },
          ],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              stringFilter: { value: "generate", matchType: "EXACT" },
            },
          },
        }),
        // Current period: download events with date dimension
        analyticsClient.runReport({
          property: propertyId,
          dateRanges: [
            { startDate: currentStartDate, endDate: currentEndDate },
          ],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              stringFilter: { value: "download", matchType: "EXACT" },
            },
          },
        }),
        // Prior period: generate events (totals only)
        analyticsClient.runReport({
          property: propertyId,
          dateRanges: [{ startDate: priorStartDate, endDate: priorEndDate }],
          metrics: [
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "eventCount" },
          ],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              stringFilter: { value: "generate", matchType: "EXACT" },
            },
          },
        }),
        // Prior period: download events (totals only)
        analyticsClient.runReport({
          property: propertyId,
          dateRanges: [{ startDate: priorStartDate, endDate: priorEndDate }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: {
              fieldName: "eventName",
              stringFilter: { value: "download", matchType: "EXACT" },
            },
          },
        }),
      ]);

    // Merge current period by date
    const dateMap = new Map<string, DayEntry>();

    for (const row of responseA.rows ?? []) {
      const ga4Date = row.dimensionValues?.[0]?.value ?? "";
      const isoDate = ga4DateToIso(ga4Date);
      dateMap.set(isoDate, {
        date: isoDate,
        activeUsers: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
        sessions: parseInt(row.metricValues?.[1]?.value ?? "0", 10),
        packGenerations: parseInt(row.metricValues?.[2]?.value ?? "0", 10),
        exports: 0,
      });
    }

    for (const row of responseB.rows ?? []) {
      const ga4Date = row.dimensionValues?.[0]?.value ?? "";
      const isoDate = ga4DateToIso(ga4Date);
      const existing = dateMap.get(isoDate);
      if (existing) {
        existing.exports = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
      } else {
        dateMap.set(isoDate, {
          date: isoDate,
          activeUsers: 0,
          sessions: 0,
          packGenerations: 0,
          exports: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
        });
      }
    }

    const series = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    const current: PeriodTotals = {
      activeUsers: series.reduce((s, d) => s + d.activeUsers, 0),
      sessions: series.reduce((s, d) => s + d.sessions, 0),
      packGenerations: series.reduce((s, d) => s + d.packGenerations, 0),
      exports: series.reduce((s, d) => s + d.exports, 0),
    };

    const prior: PeriodTotals = {
      activeUsers:
        responseC.rows?.reduce(
          (s, r) => s + parseInt(r.metricValues?.[0]?.value ?? "0", 10),
          0,
        ) ?? 0,
      sessions:
        responseC.rows?.reduce(
          (s, r) => s + parseInt(r.metricValues?.[1]?.value ?? "0", 10),
          0,
        ) ?? 0,
      packGenerations:
        responseC.rows?.reduce(
          (s, r) => s + parseInt(r.metricValues?.[2]?.value ?? "0", 10),
          0,
        ) ?? 0,
      exports:
        responseD.rows?.reduce(
          (s, r) => s + parseInt(r.metricValues?.[0]?.value ?? "0", 10),
          0,
        ) ?? 0,
    };

    const response: SummaryResponse = { days, series, current, prior };
    res.status(200).json(response);
  } catch (err) {
    console.error("[GET /api/analytics/summary]", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}
