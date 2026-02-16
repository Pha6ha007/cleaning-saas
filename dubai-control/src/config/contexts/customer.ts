// =============================================================================
// Customer Portal Context Configuration (Stage 16)
// =============================================================================
// Navigation and theme configuration for Customer Portal.
// Read-only access for customers to view their assets, visits, and contracts.
// =============================================================================

import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  FileText,
  MapPin,
  User,
} from "lucide-react";

export const customerNavigation = [
  { name: "Dashboard", href: "/customer", icon: LayoutDashboard },
  { name: "Assets", href: "/customer/assets", icon: Package },
  { name: "Service Visits", href: "/customer/visits", icon: ClipboardCheck },
  { name: "Contracts", href: "/customer/contracts", icon: FileText },
  { name: "Locations", href: "/customer/locations", icon: MapPin },
];

export const customerTheme = {
  // Customer Portal uses a professional blue theme
  primary: "hsl(220, 60%, 45%)", // Professional blue
  primaryForeground: "hsl(0, 0%, 100%)",
  accent: "hsl(220, 60%, 95%)",
  // Border radius for cards (consistent with main app)
  borderRadius: "6px",
};

export const customerConfig = {
  name: "Customer Portal",
  description: "View your assets, service history, and contracts",
  logoText: "Customer Portal",
};
