/**
 * Documentation Navigation Structure
 * Defines the sidebar navigation and organization of docs pages
 */

export interface DocPage {
  id: string;
  title: string;
  group: string;
}

export interface DocGroup {
  name: string;
  items: DocPage[];
}

export const docGroups: DocGroup[] = [
  {
    name: "GETTING STARTED",
    items: [
      { id: "first-steps", title: "First Steps", group: "GETTING STARTED" },
      { id: "how-it-works", title: "How It Works", group: "GETTING STARTED" },
    ],
  },
  {
    name: "GUIDES",
    items: [
      { id: "creating-jobs", title: "Creating Jobs", group: "GUIDES" },
      { id: "managing-locations", title: "Managing Locations", group: "GUIDES" },
      { id: "working-with-cleaners", title: "Working with Cleaners", group: "GUIDES" },
      { id: "checklist-templates", title: "Checklist Templates", group: "GUIDES" },
    ],
  },
  {
    name: "CONCEPTS",
    items: [
      { id: "proof-system", title: "Proof System", group: "CONCEPTS" },
      { id: "sla-engine", title: "SLA Engine", group: "CONCEPTS" },
      { id: "analytics", title: "Analytics", group: "CONCEPTS" },
    ],
  },
  {
    name: "REFERENCE",
    items: [
      { id: "plans-billing", title: "Plans & Billing", group: "REFERENCE" },
    ],
  },
];

// Flat list of all pages for search
export const allPages = docGroups.flatMap((group) => group.items);
