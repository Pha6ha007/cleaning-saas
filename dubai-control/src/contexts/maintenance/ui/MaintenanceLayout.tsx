// dubai-control/src/contexts/maintenance/ui/MaintenanceLayout.tsx
// Maintenance context styling wrapper
//
// NOTE: Layout (padding, max-width) is controlled by AppLayout via shellMode.
// This component only provides:
// - .maintenance-root class for scoped CSS (typography, colors)
// - No layout-related styling
// - Background photo sync (V3 PWA Enhancement)

import { ReactNode } from "react";
import { usePhotoSync } from "@/hooks/usePhotoSync";
import "./maintenance.css";

interface MaintenanceLayoutProps {
  children: ReactNode;
}

/**
 * Maintenance Layout Wrapper
 *
 * Applies `.maintenance-root` class for context-specific styling:
 * - Inter font, 13px base size
 * - Compact typography density
 * - Component-specific overrides
 *
 * Layout is handled by AppLayout via shellMode="compact".
 *
 * V3 PWA Enhancement: Enables background photo sync for offline uploads
 */
export function MaintenanceLayout({ children }: MaintenanceLayoutProps) {
  // Enable background photo sync across all maintenance pages
  usePhotoSync();

  return (
    <div className="maintenance-root">
      {children}
    </div>
  );
}

export default MaintenanceLayout;
