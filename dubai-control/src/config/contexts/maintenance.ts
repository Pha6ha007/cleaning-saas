// dubai-control/src/config/contexts/maintenance.ts
// Maintenance Context Navigation Configuration

import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Tag,
  BarChart3,
  FileText,
  CalendarRange,
  CalendarDays,
  ScrollText,
  Package,
  ListChecks,
  MapPin,
  Building2,
  Building,
  BookOpen,
  LifeBuoy,
} from "lucide-react";
import type { ContextConfig, NavItem } from "./types";

/**
 * Maintenance context navigation items.
 * All routes MUST be under /maintenance/* prefix (no cross-context routing).
 *
 * Organized in logical groups:
 * 1. Daily Operations: Dashboard, Service Visits, Calendar
 * 2. Planning: Schedules, Contracts
 * 3. Assets Management: Locations, Assets, Asset Types
 * 4. Tools: Checklists, Parts
 * 5. Visualization & Management: Map, Company
 * 6. Analytics: Analytics, Reports
 */
export const maintenanceNavItems: NavItem[] = [
  // === Daily Operations ===
  { name: "Dashboard", href: "/maintenance/dashboard", icon: LayoutDashboard },
  { name: "Service Visits", href: "/maintenance/visits", icon: ClipboardList, group: "Operations" },
  { name: "Calendar", href: "/maintenance/calendar", icon: CalendarDays, group: "Operations" },
  { name: "Schedules", href: "/maintenance/schedules", icon: CalendarRange, group: "Operations" },

  // === Assets & Locations ===
  { name: "Locations", href: "/maintenance/locations", icon: Building2, group: "Assets & Locations" },
  { name: "Assets", href: "/maintenance/assets", icon: Wrench, group: "Assets & Locations" },
  { name: "Asset Types", href: "/maintenance/asset-types", icon: Tag, group: "Assets & Locations" },
  { name: "Parts", href: "/maintenance/parts", icon: Package, group: "Assets & Locations" },

  // === Configuration ===
  { name: "Contracts", href: "/maintenance/contracts", icon: ScrollText, group: "Configuration" },
  { name: "Checklists", href: "/maintenance/checklists", icon: ListChecks, group: "Configuration" },

  // === Insights ===
  { name: "Map", href: "/maintenance/map", icon: MapPin, group: "Insights" },
  { name: "Analytics", href: "/maintenance/analytics", icon: BarChart3, group: "Insights" },
  { name: "Reports", href: "/maintenance/reports", icon: FileText, group: "Insights" },

  // === System (RBAC-gated) ===
  { name: "Company", href: "/maintenance/company", icon: Building, roles: ["owner", "manager"], group: "System" },
  { name: "Docs", href: "/maintenance/docs", icon: BookOpen, group: "System" },
  { name: "Support", href: "/maintenance/support", icon: LifeBuoy, group: "System" },
];

/**
 * Maintenance context configuration.
 */
export const maintenanceContext: ContextConfig = {
  id: "maintenance",
  displayName: "Maintenance",
  productName: "MaintainProof",
  basePath: "/maintenance",
  defaultRoute: "/maintenance/visits",
  navItems: maintenanceNavItems,
  enabled: true,
  shellMode: "compact",
};
