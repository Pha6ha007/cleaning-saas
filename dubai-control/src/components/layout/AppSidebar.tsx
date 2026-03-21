// dubai-control/src/components/layout/AppSidebar.tsx
// Sidebar navigation - renders items from current context registry
// Supports collapsible groups for contexts with many items

import { useState, useMemo, useCallback, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppContext } from "@/contexts/AppContext";
import { getNavItems } from "@/config/contexts";
import type { NavItem } from "@/config/contexts/types";

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

/** Group nav items by their `group` property. Items without group go to the top. */
function groupNavItems(items: NavItem[]): { label: string | null; items: NavItem[] }[] {
  const groups: { label: string | null; items: NavItem[] }[] = [];
  const groupMap = new Map<string | null, NavItem[]>();

  for (const item of items) {
    const key = item.group ?? null;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      groups.push({ label: key, items: groupMap.get(key)! });
    }
    groupMap.get(key)!.push(item);
  }

  return groups;
}

function SidebarGroup({
  label,
  items,
  collapsed,
  pathname,
  defaultOpen,
}: {
  label: string | null;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // If no group label, render items flat (e.g., Dashboard)
  if (!label) {
    return (
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarItem key={item.name} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </div>
    );
  }

  // Collapsed mode — show items without headers
  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarItem key={item.name} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "space-y-0.5 overflow-hidden transition-all duration-200",
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {items.map((item) => (
          <SidebarItem key={item.name} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

function SidebarItem({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));

  return (
    <NavLink
      to={item.href}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out",
        collapsed
          ? "justify-center px-0 py-2.5"
          : "justify-start gap-3 px-3 py-2",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <item.icon className="h-[18px] w-[18px]" />
      {!collapsed && <span>{item.name}</span>}
    </NavLink>
  );
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const user = useUserRole();
  const { currentContext, contextConfig } = useAppContext();

  // Mobile: auto-collapse sidebar below 768px
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Get navigation items for current context, filtered by user role
  const consoleRole = user.role === "cleaner" ? undefined : user.role;
  const navigation = getNavItems(currentContext, consoleRole);

  // Group items
  const groups = useMemo(() => groupNavItems(navigation), [navigation]);

  // Determine which groups should be open by default (active item or first 2 groups)
  const isGroupActive = useCallback(
    (items: NavItem[]) =>
      items.some(
        (item) =>
          location.pathname === item.href ||
          (item.href !== "/" && location.pathname.startsWith(item.href))
      ),
    [location.pathname]
  );

  // Mobile drawer overlay
  const showDrawer = isMobile && mobileOpen;

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && !mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm"
          aria-label="Open menu"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Backdrop */}
      {showDrawer && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-200 ease-out",
          isMobile
            ? cn("w-64", showDrawer ? "translate-x-0" : "-translate-x-full")
            : cn(collapsed ? "w-16" : "w-64")
        )}
      >
      {/* Header + logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-3 shrink-0">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "w-full justify-center",
            !collapsed && "flex-1"
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            {currentContext === "maintenance" ? "MP" : "SC"}
          </div>
          {!collapsed && (
            <span className="font-semibold tracking-tight text-foreground">
              {contextConfig.productName}
            </span>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand toggle - only in collapsed mode */}
      {collapsed && (
        <div className="flex items-center justify-center border-b border-border py-2 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation — scrollable */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-3 scrollbar-thin">
        {groups.map((group, i) => (
          <SidebarGroup
            key={group.label ?? `top-${i}`}
            label={group.label}
            items={group.items}
            collapsed={collapsed}
            pathname={location.pathname}
            defaultOpen={isGroupActive(group.items) || i < 2}
          />
        ))}
      </nav>

      {/* Footer / Sign out */}
      <div className="border-t border-border p-3 shrink-0">
        <NavLink
          to="/"
          className={cn(
            "flex items-center rounded-lg text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:bg-sidebar-accent hover:text-foreground",
            collapsed
              ? "justify-center px-0 py-2.5"
              : "justify-start gap-3 px-3 py-2.5"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sign Out</span>}
        </NavLink>
      </div>
    </aside>
    </>
  );
}
