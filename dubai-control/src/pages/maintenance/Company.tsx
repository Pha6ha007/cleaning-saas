// dubai-control/src/pages/maintenance/Company.tsx
// Company management page for Maintenance context - combines Team Members and Technicians

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCog,
  Crown,
  Shield,
  UserCheck,
  Mail,
  Plus,
  Key,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import { TechniciansPage } from "@/contexts/maintenance/ui/TechniciansPage";
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  resetTeamMemberPassword,
  type TeamMember,
  type CreateTeamMemberPayload,
} from "@/api/client";
import { useUserRole, canAccessBilling, isOwner } from "@/hooks/useUserRole";

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
  const { toast } = useToast();
  const user = useUserRole();
  const userIsOwner = isOwner(user.role);
  const canAccess = canAccessBilling(user.role); // Owner/Manager only
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("members");

  // Team member modals state
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showMemberPasswordModal, setShowMemberPasswordModal] = useState(false);
  const [memberPasswordData, setMemberPasswordData] = useState<{
    member: TeamMember;
    tempPassword: string;
  } | null>(null);

  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: getTeamMembers,
    enabled: canAccess && activeTab === "members",
  });

  // Update team member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { is_active?: boolean; full_name?: string } }) =>
      updateTeamMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast({
        title: "Success",
        description: "Team member updated successfully",
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update team member";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Reset team member password mutation
  const resetMemberPasswordMutation = useMutation({
    mutationFn: (memberId: number) => resetTeamMemberPassword(memberId),
    onSuccess: (data, memberId) => {
      const member = teamMembers.find((m) => m.id === memberId);
      if (member) {
        setMemberPasswordData({ member, tempPassword: data.temp_password });
        setShowMemberPasswordModal(true);
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to reset password";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  const handleToggleMemberActive = (member: TeamMember) => {
    if (!userIsOwner) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Only account owner can modify team members",
      });
      return;
    }
    updateMemberMutation.mutate({
      id: member.id,
      data: { is_active: !member.is_active },
    });
  };

  const handleResetMemberPassword = (member: TeamMember) => {
    if (!userIsOwner) {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Only account owner can reset passwords",
      });
      return;
    }
    resetMemberPasswordMutation.mutate(member.id);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Company</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your company information and team
            </p>
          </div>

          {/* Action Button - only for Team Members tab */}
          {activeTab === "members" && userIsOwner && (
            <Button onClick={() => setShowInviteMemberModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          )}
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
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Console users who can access the dashboard
              </p>
              {!userIsOwner && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Manager Access</p>
                    <p className="mt-1 text-xs">
                      You can view team members but cannot modify them. To manage field workers, switch to the <strong>Technicians</strong> tab.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isLoadingMembers ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">No team members</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {userIsOwner
                    ? "Invite managers and staff to help manage your business"
                    : "No other team members have been added yet"}
                </p>
                {userIsOwner && (
                  <Button onClick={() => setShowInviteMemberModal(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Invite member
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      {userIsOwner && (
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {teamMembers.map((member) => (
                      <tr
                        key={member.id}
                        className={`transition-colors hover:bg-muted/30 ${
                          !member.is_active ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                                member.role === "owner"
                                  ? "bg-amber-100 text-amber-800"
                                  : member.role === "manager"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {member.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">
                                {member.full_name}
                                {member.email === user.email && (
                                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                              member.role === "owner"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : member.role === "manager"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {member.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {member.role === "owner" ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              Active
                            </span>
                          ) : userIsOwner && member.email !== user.email ? (
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={member.is_active}
                                onCheckedChange={() => handleToggleMemberActive(member)}
                                disabled={updateMemberMutation.isPending}
                              />
                              <span className="text-sm font-medium text-foreground">
                                {member.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-sm font-medium ${
                                member.is_active ? "text-green-700" : "text-gray-500"
                              }`}
                            >
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  member.is_active ? "bg-green-500" : "bg-gray-400"
                                }`}
                              />
                              {member.is_active ? "Active" : "Inactive"}
                            </span>
                          )}
                        </td>
                        {userIsOwner && (
                          <td className="px-6 py-4 text-right">
                            {member.role !== "owner" && member.email !== user.email && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={resetMemberPasswordMutation.isPending}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleResetMemberPassword(member)}
                                    disabled={resetMemberPasswordMutation.isPending}
                                  >
                                    <Key className="mr-2 h-4 w-4" />
                                    Reset password
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team Member Password Reset Modal */}
      {showMemberPasswordModal && memberPasswordData && (
        <PasswordModal
          title="Password Reset Successful"
          subtitle={`Temporary password for ${memberPasswordData.member.full_name}`}
          password={memberPasswordData.tempPassword}
          onClose={() => {
            setShowMemberPasswordModal(false);
            setMemberPasswordData(null);
          }}
        />
      )}

      {/* Invite Member Modal */}
      {showInviteMemberModal && (
        <InviteMemberModal onClose={() => setShowInviteMemberModal(false)} />
      )}
    </MaintenanceLayout>
  );
}

// Password Display Modal Component
function PasswordModal({
  title,
  subtitle,
  password,
  onClose,
}: {
  title: string;
  subtitle: string;
  password: string;
  onClose: () => void;
}) {
  const { toast } = useToast();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Temporary Password
          </div>
          <div className="flex items-center justify-between">
            <code className="text-xl font-mono font-semibold text-foreground">
              {password}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(password);
                toast({
                  title: "Copied",
                  description: "Password copied to clipboard",
                });
              }}
            >
              Copy
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Important</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>Share this password securely</li>
            <li>They must change it on first login</li>
            <li>This password will not be shown again</li>
          </ul>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// Invite Member Modal Component
function InviteMemberModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "manager" as "manager" | "staff",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: CreateTeamMemberPayload) => createTeamMember(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      setCreatedPassword(data.temp_password);
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      if (data?.fields) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.fields)) {
          fieldErrors[key] = Array.isArray(value) ? value[0] : String(value);
        }
        setErrors(fieldErrors);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.message || "Failed to invite member",
        });
      }
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    createMutation.mutate({
      full_name: formData.full_name,
      email: formData.email,
      role: formData.role,
    });
  };

  // If password was created, show the password modal
  if (createdPassword) {
    return (
      <PasswordModal
        title="Team Member Invited"
        subtitle={`Temporary password for ${formData.full_name}`}
        password={createdPassword}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a manager or staff member to your team
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Enter full name"
              disabled={createMutation.isPending}
            />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="email@example.com"
              disabled={createMutation.isPending}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            <p className="text-xs text-muted-foreground">
              They will use this email to log in
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "manager" })}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  formData.role === "manager"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-foreground">Manager</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Full access to operations
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "staff" })}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors ${
                  formData.role === "staff"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-foreground">Staff</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Limited console access
                </p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                "Invite member"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
