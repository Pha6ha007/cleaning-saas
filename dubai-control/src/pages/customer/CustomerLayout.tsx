// Customer Portal Layout (Stage 16)
// Simplified layout for customer read-only access

import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  FileText,
  MapPin,
  Menu,
  X,
  LogOut,
  User,
  Building2,
} from "lucide-react";
import { getCustomerProfile, customerKeys } from "@/api/customer";

const navigation = [
  { name: "Dashboard", href: "/customer", icon: LayoutDashboard },
  { name: "Assets", href: "/customer/assets", icon: Package },
  { name: "Service Visits", href: "/customer/visits", icon: ClipboardCheck },
  { name: "Contracts", href: "/customer/contracts", icon: FileText },
  { name: "Locations", href: "/customer/locations", icon: MapPin },
];

export default function CustomerLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: customerKeys.profile,
    queryFn: getCustomerProfile,
  });

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/customer" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="hidden font-semibold text-foreground md:block">
                Customer Portal
              </span>
            </Link>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden items-center gap-2 text-sm md:flex">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{profile.full_name}</span>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-muted-foreground">{profile.company.name}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="border-t border-border bg-card p-4 md:hidden">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== "/customer" && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/10 text-blue-600"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
          <nav className="sticky top-14 p-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href ||
                  (item.href !== "/customer" && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600/10 text-blue-600"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Locations Count */}
            {profile && (
              <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Your Locations</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {profile.locations_count}
                </div>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
