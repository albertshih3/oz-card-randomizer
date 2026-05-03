export interface TutorialStep {
  id: string;
  targetId: string | null;
  route: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  mobileTargetId?: string;
  mobileDescription?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    targetId: null,
    route: "/admin",
    title: "Welcome 👋",
    description:
      "This quick tour covers the key features of the admin panel. You can skip at any time or restart from the ? button.",
  },
  {
    id: "navigation",
    targetId: "nav-drawer",
    route: "/admin",
    title: "Navigation",
    description:
      "Use the sidebar to switch between Cards, Categories, Users, and Analytics.",
    placement: "right",
    mobileTargetId: "hamburger-menu",
    mobileDescription: "Tap the menu icon to open the navigation drawer.",
  },
  {
    id: "card-toolbar",
    targetId: "card-toolbar",
    route: "/admin",
    title: "Card Filters & Views",
    description:
      "Search by name, filter by status, and switch between table, grid, and list views.",
  },
  {
    id: "card-list",
    targetId: "card-list",
    route: "/admin",
    title: "Card Catalog",
    description:
      "All cards in the database are listed here. Click any edit icon to modify a card.",
  },
  {
    id: "new-card",
    targetId: "new-card-btn",
    route: "/admin",
    title: "Adding & Editing Cards",
    description:
      "Create a new card or edit existing ones. Changes save directly to the database.",
    mobileTargetId: "new-card-fab",
    mobileDescription:
      "Tap the + button to create a new card or edit existing ones.",
  },
  {
    id: "categories-table",
    targetId: "categories-table",
    route: "/admin/categories",
    title: "Category Management",
    description:
      "View and manage all card categories. Each category groups a set of cards used in booster pack generation.",
  },
  {
    id: "wildcard-toggle",
    targetId: "wildcard-toggle",
    route: "/admin/categories",
    title: "Wildcard Eligibility",
    description:
      "Toggle which categories are eligible for the random wildcard slot in each booster pack.",
  },
  {
    id: "users-table",
    targetId: "users-table",
    route: "/admin/users",
    title: "Team & Invitations",
    description:
      "View team members and invite new admins by email. Invited users receive an email to set up their account.",
  },
  {
    id: "analytics-metrics",
    targetId: "analytics-metrics",
    route: "/admin/analytics",
    title: "Analytics Dashboard",
    description:
      "Track pack generations, exports, and active users. Use the day range selector to adjust the period.",
  },
  {
    id: "complete",
    targetId: null,
    route: "/admin/analytics",
    title: "You're all set!",
    description:
      "You've completed the tour. Hit the ? icon in the header anytime to revisit.",
  },
];
