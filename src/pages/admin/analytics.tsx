import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { M3Button } from "@/components/m3/button";
import { Skeleton } from "@heroui/skeleton";
import { LinearProgress } from "@/components/m3/linear-progress";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/utils/admin-api";

const CHART_WIDTH = 800;
const CHART_HEIGHT = 220;
const CHART_PADDING = { top: 56, right: 8, bottom: 32, left: 40 };
// Pack gen bar is wider than exports to visually emphasize it
const PACK_BAR_FRACTION = 0.6; // 60% of available bar-pair width
const EXPORT_BAR_FRACTION = 0.4;
const BAR_GROUP_PADDING = 0.25;

function computeChangePct(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

interface MetricCardProps {
  title: string;
  value: number;
  changePct: number | null;
  highlighted?: boolean;
}

function MetricCard({ title, value, changePct, highlighted }: MetricCardProps) {
  return (
    <div
      className="rounded-3xl p-4 shadow-elevation-1"
      style={
        highlighted
          ? {
              background: "var(--md-sys-color-primary-container)",
              color: "var(--md-sys-color-on-primary-container)",
            }
          : { background: "var(--md-sys-color-surface)" }
      }
    >
      <p
        className="text-label-large mb-1"
        style={{
          color: highlighted
            ? "var(--md-sys-color-on-primary-container)"
            : "var(--md-sys-color-on-surface-variant)",
          opacity: highlighted ? 0.8 : 1,
        }}
      >
        {title}
      </p>
      <p
        className={highlighted ? "text-display-medium" : "text-headline-large"}
        style={{
          color: highlighted
            ? "var(--md-sys-color-on-primary-container)"
            : "var(--md-sys-color-on-surface)",
        }}
      >
        {value.toLocaleString()}
      </p>
      {changePct !== null ? (
        <span
          className="inline-block mt-1 px-2 py-0.5 rounded-full text-label-medium"
          style={
            changePct >= 0
              ? {
                  background: highlighted
                    ? "rgba(0,0,0,0.12)"
                    : "var(--md-sys-color-tertiary-container)",
                  color: highlighted
                    ? "var(--md-sys-color-on-primary-container)"
                    : "var(--md-sys-color-on-tertiary-container)",
                }
              : {
                  background: "var(--md-sys-color-error-container)",
                  color: "var(--md-sys-color-on-error-container)",
                }
          }
        >
          {changePct >= 0 ? "+" : ""}
          {changePct}%
        </span>
      ) : (
        <span
          className="inline-block mt-1 text-label-medium"
          style={{
            color: highlighted
              ? "var(--md-sys-color-on-primary-container)"
              : "var(--md-sys-color-on-surface-variant)",
            opacity: 0.6,
          }}
        >
          —
        </span>
      )}
    </div>
  );
}

interface BarChartProps {
  series: AnalyticsSummary["series"];
}

function BarChart({ series }: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (series.length === 0) {
    return (
      <p
        className="text-body-medium text-center py-8"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        No data available for this period
      </p>
    );
  }

  const maxValue = Math.max(
    ...series.map((d) => Math.max(d.packGenerations, d.exports)),
    1,
  );
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const groupWidth = plotWidth / series.length;
  const availableBarWidth = groupWidth * (1 - BAR_GROUP_PADDING);
  const packBarWidth = availableBarWidth * PACK_BAR_FRACTION;
  const exportBarWidth = availableBarWidth * EXPORT_BAR_FRACTION;
  const labelStep = Math.ceil(series.length / 8);

  const hoveredEntry = hoveredIndex !== null ? series[hoveredIndex] : null;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      width="100%"
      aria-label="Pack generations and exports over time"
      role="img"
      style={{ overflow: "visible" }}
    >
      {/* Y-axis line */}
      <line
        x1={CHART_PADDING.left}
        y1={CHART_PADDING.top}
        x2={CHART_PADDING.left}
        y2={CHART_PADDING.top + plotHeight}
        stroke="var(--md-sys-color-outline-variant)"
        strokeWidth="1"
      />
      {/* X-axis line */}
      <line
        x1={CHART_PADDING.left}
        y1={CHART_PADDING.top + plotHeight}
        x2={CHART_PADDING.left + plotWidth}
        y2={CHART_PADDING.top + plotHeight}
        stroke="var(--md-sys-color-outline-variant)"
        strokeWidth="1"
      />
      {/* Y-axis labels */}
      {[0, Math.round(maxValue / 2), maxValue].map((v, i) => {
        const y = CHART_PADDING.top + plotHeight - (v / maxValue) * plotHeight;
        return (
          <text
            key={i}
            x={CHART_PADDING.left - 4}
            y={y + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--md-sys-color-on-surface-variant)"
          >
            {v}
          </text>
        );
      })}
      {/* Bars */}
      {series.map((entry, i) => {
        const groupX = CHART_PADDING.left + i * groupWidth;
        const barGap = (groupWidth * BAR_GROUP_PADDING) / 2;
        const bar1X = groupX + barGap;
        const bar2X = bar1X + packBarWidth;
        const bar1Height = (entry.packGenerations / maxValue) * plotHeight;
        const bar2Height = (entry.exports / maxValue) * plotHeight;
        const bar1Y = CHART_PADDING.top + plotHeight - bar1Height;
        const bar2Y = CHART_PADDING.top + plotHeight - bar2Height;
        const isDimmed = hoveredIndex !== null && hoveredIndex !== i;
        return (
          <g
            key={entry.date}
            opacity={isDimmed ? 0.3 : 1}
            style={{ transition: "opacity 120ms ease" }}
          >
            <rect
              x={bar1X}
              y={bar1Y}
              width={packBarWidth}
              height={bar1Height}
              fill="var(--md-sys-color-primary)"
              rx="2"
            />
            <rect
              x={bar2X}
              y={bar2Y}
              width={exportBarWidth}
              height={bar2Height}
              fill="var(--md-sys-color-tertiary)"
              rx="2"
            />
            {i % labelStep === 0 && (
              <text
                x={groupX + groupWidth / 2}
                y={CHART_PADDING.top + plotHeight + 16}
                textAnchor="middle"
                fontSize="9"
                fill="var(--md-sys-color-on-surface-variant)"
              >
                {new Date(entry.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </text>
            )}
          </g>
        );
      })}
      {/* Hover detection overlays — rendered on top of bars */}
      {series.map((_, i) => {
        const groupX = CHART_PADDING.left + i * groupWidth;
        return (
          <rect
            key={`hover-${i}`}
            x={groupX}
            y={CHART_PADDING.top}
            width={groupWidth}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: "crosshair" }}
          />
        );
      })}
      {/* Tooltip — always in top padding area so it never overlaps bars */}
      {hoveredEntry !== null &&
        hoveredIndex !== null &&
        (() => {
          const groupX = CHART_PADDING.left + hoveredIndex * groupWidth;
          const centerX = groupX + groupWidth / 2;
          const tooltipW = 138;
          const tooltipH = 54;
          const tx = Math.min(
            Math.max(centerX - tooltipW / 2, CHART_PADDING.left),
            CHART_WIDTH - CHART_PADDING.right - tooltipW,
          );
          const ty = 2;
          const dateLabel = new Date(hoveredEntry.date).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" },
          );
          return (
            <g style={{ pointerEvents: "none" }}>
              {/* Drop shadow simulation */}
              <rect
                x={tx + 1}
                y={ty + 1}
                width={tooltipW}
                height={tooltipH}
                rx="6"
                fill="rgba(0,0,0,0.08)"
              />
              <rect
                x={tx}
                y={ty}
                width={tooltipW}
                height={tooltipH}
                rx="6"
                fill="var(--md-sys-color-surface)"
                stroke="var(--md-sys-color-outline-variant)"
                strokeWidth="0.75"
              />
              {/* Date */}
              <text
                x={tx + tooltipW / 2}
                y={ty + 14}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="var(--md-sys-color-on-surface)"
              >
                {dateLabel}
              </text>
              {/* Pack generations row */}
              <rect
                x={tx + 10}
                y={ty + 22}
                width={8}
                height={8}
                fill="var(--md-sys-color-primary)"
                rx="1"
              />
              <text x={tx + 22} y={ty + 30} fontSize="10">
                <tspan fill="var(--md-sys-color-on-surface-variant)">
                  Packs:{" "}
                </tspan>
                <tspan fill="var(--md-sys-color-primary)" fontWeight="600">
                  {hoveredEntry.packGenerations}
                </tspan>
              </text>
              {/* Exports row */}
              <rect
                x={tx + 10}
                y={ty + 36}
                width={8}
                height={8}
                fill="var(--md-sys-color-tertiary)"
                rx="1"
              />
              <text x={tx + 22} y={ty + 44} fontSize="10">
                <tspan fill="var(--md-sys-color-on-surface-variant)">
                  Exports:{" "}
                </tspan>
                <tspan fill="var(--md-sys-color-tertiary)" fontWeight="600">
                  {hoveredEntry.exports}
                </tspan>
              </text>
            </g>
          );
        })()}
      {/* Legend */}
      <rect
        x={CHART_WIDTH - 140}
        y={CHART_PADDING.top}
        width={10}
        height={10}
        fill="var(--md-sys-color-primary)"
        rx="2"
      />
      <text
        x={CHART_WIDTH - 126}
        y={CHART_PADDING.top + 9}
        fontSize="10"
        fill="var(--md-sys-color-on-surface-variant)"
      >
        Pack Generations
      </text>
      <rect
        x={CHART_WIDTH - 140}
        y={CHART_PADDING.top + 16}
        width={10}
        height={10}
        fill="var(--md-sys-color-tertiary)"
        rx="2"
      />
      <text
        x={CHART_WIDTH - 126}
        y={CHART_PADDING.top + 25}
        fontSize="10"
        fill="var(--md-sys-color-on-surface-variant)"
      >
        Exports
      </text>
    </svg>
  );
}

export default function AdminAnalyticsPage() {
  const { getToken } = useAuth();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) {
        setLoadError("Session expired. Please refresh the page.");
        return;
      }
      const data = await getAnalyticsSummary(token, days);
      setSummary(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load analytics",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getToken, days]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const metrics = summary
    ? [
        {
          title: "Active Users",
          value: summary.current.activeUsers,
          changePct: computeChangePct(
            summary.current.activeUsers,
            summary.prior.activeUsers,
          ),
          highlighted: false,
        },
        {
          title: "Sessions",
          value: summary.current.sessions,
          changePct: computeChangePct(
            summary.current.sessions,
            summary.prior.sessions,
          ),
          highlighted: false,
        },
        {
          title: "Pack Generations",
          value: summary.current.packGenerations,
          changePct: computeChangePct(
            summary.current.packGenerations,
            summary.prior.packGenerations,
          ),
          highlighted: false,
        },
        {
          title: "Exports",
          value: summary.current.exports,
          changePct: computeChangePct(
            summary.current.exports,
            summary.prior.exports,
          ),
          highlighted: false,
        },
      ]
    : null;

  return (
    <div style={{ color: "var(--md-sys-color-on-surface)" }}>
      <LinearProgress visible={isLoading} className="mb-3" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-headline-large"
          style={{ color: "var(--md-sys-color-on-surface)" }}
        >
          Analytics
        </h1>
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--md-sys-color-surface-variant)" }}
        >
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-3 py-1.5 rounded-lg text-label-large transition-colors"
              style={
                days === d
                  ? {
                      background: "var(--md-sys-color-surface)",
                      color: "var(--md-sys-color-on-surface)",
                    }
                  : { color: "var(--md-sys-color-on-surface-variant)" }
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {loadError && !isLoading && (
        <div className="text-center py-12">
          <p
            className="text-label-large mb-1"
            style={{ color: "var(--md-sys-color-error)" }}
          >
            Could not load analytics
          </p>
          <p
            className="text-body-medium mb-4"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {loadError}
          </p>
          <M3Button size="sm" variant="tonal" onPress={fetchSummary}>
            Retry
          </M3Button>
        </div>
      )}

      {/* Metric cards grid */}
      <div
        data-tutorial-id="analytics-metrics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {metrics
          ? metrics.map((m) => <MetricCard key={m.title} {...m} />)
          : Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="rounded-3xl h-28" />
            ))}
      </div>

      {/* Chart section */}
      {summary && (
        <div
          className="rounded-3xl p-6 shadow-elevation-1"
          style={{ background: "var(--md-sys-color-surface)" }}
        >
          <h3 className="text-title-medium mb-4">Pack Generations & Exports</h3>
          <BarChart series={summary.series} />
        </div>
      )}
    </div>
  );
}
