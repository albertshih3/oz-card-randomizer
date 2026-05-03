import type React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  GitCommit,
  Tag,
  Calendar,
  CheckCircle2,
  Sparkles,
  Wrench,
} from "lucide-react";
import DefaultLayout from "@/layouts/default";
import changelogData from "@/data/changelog.json";
import { ChangelogEntry, ChangelogSection } from "@/types/changelog";

const RECENT_COUNT = 3;

/**
 * Returns true if the entry's date string parses to a date within
 * the last 30 days. Returns false on any parse failure.
 *
 * Handles:
 *   "March 16, 2026"        → standard Month D, YYYY
 *   "February 2nd, 2025"    → ordinal suffix stripped before parse
 *   "2024"                  → year-only; new Date("2024") = Jan 1 2024, not recent
 */
function isRecentEntry(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  // Strip ordinal suffixes: "2nd" → "2", "3rd" → "3", "1st" → "1", "4th" → "4", etc.
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)\b/g, "$1");
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return false;
  const now = new Date();
  const msIn30Days = 30 * 24 * 60 * 60 * 1000;
  return now.getTime() - parsed.getTime() <= msIn30Days;
}

const getSectionIcon = (type: string) => {
  switch (type) {
    case "feat":
      return <Sparkles className="w-4 h-4" />;
    case "fix":
      return <CheckCircle2 className="w-4 h-4" />;
    case "chore":
      return <Wrench className="w-4 h-4" />;
    case "init":
      return <GitCommit className="w-4 h-4" />;
    default:
      return <Tag className="w-4 h-4" />;
  }
};

const getSectionStyle = (type: string): React.CSSProperties => {
  switch (type) {
    case "feat":
      return {
        background: "var(--md-sys-color-primary-container)",
        color: "var(--md-sys-color-on-primary-container)",
      };
    case "fix":
      return {
        background: "var(--md-sys-color-tertiary-container)",
        color: "var(--md-sys-color-on-tertiary-container)",
      };
    case "chore":
      return {
        background: "var(--md-sys-color-secondary-container)",
        color: "var(--md-sys-color-on-secondary-container)",
      };
    case "init":
      return {
        background: "var(--md-sys-color-surface-variant)",
        color: "var(--md-sys-color-on-surface-variant)",
      };
    default:
      return {
        background: "var(--md-sys-color-surface-variant)",
        color: "var(--md-sys-color-on-surface-variant)",
      };
  }
};

export default function Changelog() {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    changelogData[0]?.version || null,
  );
  const [showAll, setShowAll] = useState(false);

  const toggleVersion = (version: string) => {
    if (expandedVersion === version) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(version);
    }
  };

  const entries = changelogData as unknown as ChangelogEntry[];
  const visibleEntries = showAll ? entries : entries.slice(0, RECENT_COUNT);
  const hiddenCount = entries.length - RECENT_COUNT;

  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-12 text-center">
          <h1
            className="text-headline-large mb-4"
            style={{ color: "var(--md-sys-color-on-background)" }}
          >
            Changelog
          </h1>
          <p
            className="text-body-large max-w-2xl mx-auto"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            Stay updated with the latest improvements, features, and fixes.
          </p>
        </div>

        <div className="space-y-4">
          {visibleEntries.map((entry: ChangelogEntry, index: number) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.05, 0.7, 0.1, 1.0],
                delay: index * 0.04,
              }}
              className={`rounded-xl overflow-hidden ${
                entry.isCurrent
                  ? "shadow-elevation-1"
                  : expandedVersion === entry.version
                    ? "shadow-elevation-1"
                    : ""
              }`}
              style={{
                border: entry.isCurrent
                  ? "2px solid var(--md-sys-color-primary)"
                  : `1px solid var(--md-sys-color-outline-variant)`,
                background: "var(--md-sys-color-surface)",
              }}
            >
              <button
                onClick={() => toggleVersion(entry.version)}
                aria-expanded={expandedVersion === entry.version}
                aria-controls={`changelog-panel-${entry.version}`}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full"
                    style={
                      entry.isCurrent
                        ? {
                            background: "var(--md-sys-color-primary)",
                            color: "var(--md-sys-color-on-primary)",
                          }
                        : {
                            background: "var(--md-sys-color-surface-variant)",
                            color: "var(--md-sys-color-on-surface-variant)",
                          }
                    }
                  >
                    <GitCommit className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2
                        className="text-title-large font-semibold"
                        style={{
                          color: "var(--md-sys-color-on-surface)",
                        }}
                      >
                        {entry.version === "Initial Release"
                          ? entry.version
                          : `v${entry.version}`}
                      </h2>
                      {entry.isCurrent && (
                        <span
                          className="text-label-medium px-2.5 py-1 rounded-full"
                          style={{
                            background: "var(--md-sys-color-primary)",
                            color: "var(--md-sys-color-on-primary)",
                          }}
                        >
                          Current
                        </span>
                      )}
                      {!entry.isCurrent && isRecentEntry(entry.date) && (
                        <span
                          className="text-label-medium px-2.5 py-1 rounded-full"
                          style={{
                            background:
                              "var(--md-sys-color-tertiary-container)",
                            color: "var(--md-sys-color-on-tertiary-container)",
                          }}
                        >
                          New
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center text-body-medium mt-1"
                      style={{
                        color: "var(--md-sys-color-on-surface-variant)",
                      }}
                    >
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {entry.date || "Pending Release"}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${
                    expandedVersion === entry.version ? "rotate-180" : ""
                  }`}
                  style={{
                    color: "var(--md-sys-color-on-surface-variant)",
                  }}
                />
              </button>

              <div
                id={`changelog-panel-${entry.version}`}
                className={`grid transition-[grid-template-rows] duration-300 ease-standard ${
                  expandedVersion === entry.version
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className="px-6 pb-8 pt-2"
                    style={{
                      borderTop:
                        "1px solid var(--md-sys-color-outline-variant)",
                    }}
                  >
                    <div className="space-y-8">
                      {entry.sections.map(
                        (section: ChangelogSection, idx: number) => (
                          <div key={idx} className="relative pl-4">
                            {/* Vertical line for visual hierarchy */}
                            <div
                              className="absolute left-0 top-2 bottom-0 w-0.5 rounded-full"
                              style={{
                                background:
                                  "var(--md-sys-color-outline-variant)",
                              }}
                            />

                            <h3
                              className="text-label-large flex items-center mb-3"
                              style={{
                                color: "var(--md-sys-color-on-surface)",
                              }}
                            >
                              <span
                                className="flex items-center justify-center w-6 h-6 rounded-md mr-3"
                                style={getSectionStyle(section.type)}
                              >
                                {getSectionIcon(section.type)}
                              </span>
                              {section.title}
                            </h3>
                            <ul className="space-y-3 pl-9">
                              {section.items.map((item, itemIdx) => (
                                <li
                                  key={itemIdx}
                                  className="text-body-medium relative"
                                  style={{
                                    color:
                                      "var(--md-sys-color-on-surface-variant)",
                                  }}
                                >
                                  <span
                                    className="absolute -left-4 top-2 w-1.5 h-1.5 rounded-full"
                                    style={{
                                      background:
                                        "var(--md-sys-color-outline-variant)",
                                    }}
                                  />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {entries.length > RECENT_COUNT && (
          <AnimatePresence mode="wait">
            <motion.div
              key={showAll ? "show-less" : "show-more"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="flex justify-center mt-6"
            >
              <button
                onClick={() => setShowAll((v) => !v)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-label-large transition-colors"
                style={{
                  border: "1px solid var(--md-sys-color-outline)",
                  color: "var(--md-sys-color-primary)",
                  background: "transparent",
                }}
              >
                {showAll ? (
                  "Show less"
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    {`Show ${hiddenCount} older version${hiddenCount === 1 ? "" : "s"}`}
                  </>
                )}
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </DefaultLayout>
  );
}
