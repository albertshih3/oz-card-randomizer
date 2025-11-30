import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GitCommit, Tag, Calendar, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import DefaultLayout from "@/layouts/default";
import changelogData from "@/data/changelog.json";
import { ChangelogEntry, ChangelogSection } from "@/types/changelog";

// Map section types to icons and colors
const getSectionIcon = (type: string) => {
  switch (type) {
    case "feat":
      return <Sparkles className="w-4 h-4 text-blue-500" />;
    case "fix":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "chore":
      return <Wrench className="w-4 h-4 text-amber-500" />;
    case "init":
      return <GitCommit className="w-4 h-4 text-purple-500" />;
    default:
      return <Tag className="w-4 h-4 text-gray-500" />;
  }
};

const getSectionColor = (type: string) => {
  switch (type) {
    case "feat":
      return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
    case "fix":
      return "text-green-500 bg-green-50 dark:bg-green-900/20";
    case "chore":
      return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
    case "init":
      return "text-purple-500 bg-purple-50 dark:bg-purple-900/20";
    default:
      return "text-gray-500 bg-gray-50 dark:bg-gray-800";
  }
};

export default function Changelog() {
  // Default to expanding the first (latest) version
  const [expandedVersion, setExpandedVersion] = useState<string | null>(changelogData[0]?.version || null);

  const toggleVersion = (version: string) => {
    if (expandedVersion === version) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(version);
    }
  };

  return (
    <DefaultLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Changelog</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stay updated with the latest improvements, features, and fixes.
          </p>
        </div>

        <div className="space-y-4">
          {(changelogData as unknown as ChangelogEntry[]).map((entry: ChangelogEntry) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`border rounded-xl overflow-hidden transition-all duration-200 ${expandedVersion === entry.version
                ? "border-primary/50 shadow-lg bg-card"
                : "border-border hover:border-primary/30 bg-card/50"
                }`}
            >
              <button
                onClick={() => toggleVersion(entry.version)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${entry.isCurrent
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    <GitCommit className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">
                        {entry.version === "Initial Release" ? entry.version : `v${entry.version}`}
                      </h2>
                      {entry.isCurrent && (
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {entry.date || "Pending Release"}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${expandedVersion === entry.version ? "rotate-180" : ""
                    }`}
                />
              </button>

              <AnimatePresence>
                {expandedVersion === entry.version && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-8 pt-2 border-t border-border/50">
                      <div className="space-y-8">
                        {entry.sections.map((section: ChangelogSection, idx: number) => (
                          <div key={idx} className="relative pl-4">
                            {/* Vertical line for visual hierarchy */}
                            <div className="absolute left-0 top-2 bottom-0 w-0.5 bg-border/50 rounded-full"></div>

                            <h3 className="text-base font-semibold flex items-center mb-3">
                              <span className={`flex items-center justify-center w-6 h-6 rounded-md mr-3 ${getSectionColor(section.type)}`}>
                                {getSectionIcon(section.type)}
                              </span>
                              {section.title}
                            </h3>
                            <ul className="space-y-3 pl-9">
                              {section.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="text-muted-foreground text-sm leading-relaxed relative">
                                  <span className="absolute -left-4 top-2 w-1.5 h-1.5 rounded-full bg-border"></span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </DefaultLayout>
  );
}