export interface ChangelogSection {
  title: string;
  type: "feat" | "fix" | "chore" | "init" | "other";
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  isCurrent?: boolean;
  sections: ChangelogSection[];
}
