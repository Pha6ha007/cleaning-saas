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
  { name: "Service Visits", href: "/maintenance/visits", icon: ClipboardList },
  { name: "Calendar", href: "/maintenance/calendar", icon: CalendarDays },

  // === Planning ===
  { name: "Schedules", href: "/maintenance/schedules", icon: CalendarRange },
  { name: "Contracts", href: "/maintenance/contracts", icon: ScrollText },

  // === Assets Management ===
  { name: "Locations", href: "/maintenance/locations", icon: Building2 },
  { name: "Assets", href: "/maintenance/assets", icon: Wrench },
  { name: "Asset Types", href: "/maintenance/asset-types", icon: Tag },

  // === Tools ===
  { name: "Checklists", href: "/maintenance/checklists", icon: ListChecks },
  { name: "Parts", href: "/maintenance/parts", icon: Package },

  // === Visualization & Management ===
  { name: "Map", href: "/maintenance/map", icon: MapPin },
  // Company is RBAC-gated (owner/manager only) - includes Team Members & Technicians
  { name: "Company", href: "/maintenance/company", icon: Building, roles: ["owner", "manager"] },

  // === Analytics ===
  { name: "Analytics", href: "/maintenance/analytics", icon: BarChart3 },
  { name: "Reports", href: "/maintenance/reports", icon: FileText },

  // === Help & Support ===
  { name: "Docs", href: "/maintenance/docs", icon: BookOpen },
  { name: "Support", href: "/maintenance/support", icon: LifeBuoy },
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
