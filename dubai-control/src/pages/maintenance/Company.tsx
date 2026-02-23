// dubai-control/src/pages/maintenance/Company.tsx
// Company management page for Maintenance context - combines Team Members and Technicians

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCog, Crown, Shield, UserCheck, Mail, Phone } from "lucide-react";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import { TechniciansPage } from "@/contexts/maintenance/ui/TechniciansPage";
import { getTeamMembers, type TeamMember } from "@/api/client";
import { useUserRole, canAccessBilling } from "@/hooks/useUserRole";

type TabType = "members" | "technicians";

// Role icon mapping
function getRoleIcon(role: string) {
  switch (role) {
    case "owner":
      return <Crown className="h-4 w-4 text-yellow-600" />;
    case "manager":
      return <Shield className="h-4 w-4 text-blue-600" />;
    case "staff":
      return <UserCheck className="h-4 w-4 text-green-600" />;
    default:
      return <UserCog className="h-4 w-4 text-gray-600" />;
  }
}

// Role label mapping
function getRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "staff":
      return "Staff";
    default:
      return role;
  }
}

export default function Company() {
  const user = useUserRole();
  const canAccess = canAccessBilling(user.role); // Owner/Manager only
  const [activeTab, setActiveTab] = useState<TabType>("members");

  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: getTeamMembers,
    enabled: canAccess && activeTab === "members",
  });

  // Access restricted
  if (!canAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <Users className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view company settings.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // If Technicians tab is active, render TechniciansPage directly
  if (activeTab === "technicians") {
    return <TechniciansPage showBackButton={true} onBack={() => setActiveTab("members")} />;
  }

  return (
    <MaintenanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Company</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your company information and team
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("members")}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "members"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Team Members
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {teamMembers.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("technicians")}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "technicians"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Technicians
              </div>
            </button>
          </div>
        </div>

        {/* Team Members Tab Content */}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Team Members</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Console users who can access the dashboard
              </p>

              {isLoadingMembers ? (
                <div className="py-8 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4" />
                  <p className="font-medium">No team members yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member: TeamMember) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {member.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{member.full_name}</span>
                            {member.email === user.email && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {member.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {member.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Role Badge */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm font-medium">
                          {getRoleIcon(member.role)}
                          {getRoleLabel(member.role)}
                        </div>
                        <div
                          className={`h-2 w-2 rounded-full ${
                            member.is_active ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
