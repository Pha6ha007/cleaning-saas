// dubai-control/src/pages/maintenance/Parts.tsx
// Parts catalog management page for Maintenance context (Stage 7)
// Uses Lovable-style CSS classes: .page-header, .page-title, .premium-card, .data-table

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Loader2,
  X,
  Package,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  listParts,
  getPart,
  createPart,
  updatePart,
  deletePart,
  maintenanceKeys,
  type Part,
  type PartUnit,
  type CreatePartInput,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// RBAC: Check if user can write parts (owner/manager)
function canWriteParts(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// RBAC: Check if user can read parts (owner/manager/staff)
function canReadParts(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Unit options with display labels
const UNIT_OPTIONS: { value: PartUnit; label: string }[] = [
  { value: "pcs", label: "Pieces" },
  { value: "m", label: "Meters" },
  { value: "kg", label: "Kilograms" },
  { value: "L", label: "Liters" },
  { value: "set", label: "Sets" },
];

export default function Parts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Part | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    unit: "pcs" as PartUnit,
    is_active: true,
  });

  // Check access
  const hasReadAccess = canReadParts(user.role);
  const hasWriteAccess = canWriteParts(user.role);

  // Fetch parts
  const {
    data: parts = [],
    isLoading,
    isError,
    error: errorData,
    refetch,
  } = useQuery({
    queryKey: maintenanceKeys.parts.list(),
    queryFn: () => listParts(),
    enabled: hasReadAccess,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePartInput) => createPart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.parts.all });
      toast({
        title: "Success",
        description: "Part created successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to create part";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreatePartInput & { is_active: boolean }>;
    }) => updatePart(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.parts.all });
      toast({
        title: "Success",
        description: "Part updated successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update part";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.parts.all });
      toast({
        title: "Success",
        description: "Part deleted successfully",
      });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      const code = error?.response?.data?.code;
      const message =
        code === "CONFLICT"
          ? "Cannot delete part with usage records. Deactivate instead."
          : error?.response?.data?.message || "Failed to delete part";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setDeleteConfirm(null);
    },
  });

  const handleAddNew = () => {
    setEditingPart(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      unit: "pcs",
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      sku: part.sku || "",
      description: part.description || "",
      unit: part.unit,
      is_active: part.is_active,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPart(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      unit: "pcs",
      is_active: true,
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Part name is required",
      });
      return;
    }

    if (editingPart) {
      updateMutation.mutate({
        id: editingPart.id,
        data: {
          name: formData.name.trim(),
          sku: formData.sku.trim() || undefined,
          description: formData.description.trim() || undefined,
          unit: formData.unit,
          is_active: formData.is_active,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        description: formData.description.trim() || undefined,
        unit: formData.unit,
      });
    }
  };

  const handleDelete = (part: Part) => {
    setDeleteConfirm(part);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <Package className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view parts catalog.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <MaintenanceLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MaintenanceLayout>
    );
  }

  // Error state
  if (isError) {
    const errorMessage =
      (errorData as any)?.response?.data?.message ||
      "Failed to load parts. Please try again.";
    return (
      <MaintenanceLayout>
        <div className="space-y-4">
          {/* Error Banner */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                Error loading data
              </p>
            </div>
            <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <div className="py-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">
              Unable to load parts
            </h2>
            <p className="mt-2 text-muted-foreground">
              There was an error loading the parts catalog.
            </p>
            <Button onClick={() => refetch()} className="mt-4" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </MaintenanceLayout>
    );
  }

  return (
    <MaintenanceLayout>
      <div className="space-y-4">
        {/* Header - Lovable style */}
        <div className="page-header">
          <h1 className="page-title">Parts Catalog</h1>
          {hasWriteAccess && (
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-medium"
              onClick={handleAddNew}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Part
            </Button>
          )}
        </div>

        {/* Parts Table - Lovable premium-card style */}
        <div className="premium-card overflow-hidden">
          {parts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">No parts yet</p>
              <p className="mt-1 text-sm">
                Add parts to track materials used on service visits
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Unit</th>
                  <th className="w-[80px]">Status</th>
                  {hasWriteAccess && <th className="w-[100px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id}>
                    <td className="font-medium text-foreground">{part.name}</td>
                    <td className="text-muted-foreground">
                      {part.sku || "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {part.unit_display || part.unit}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          part.is_active
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {part.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {hasWriteAccess && (
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(part)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(part)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {editingPart ? "Edit Part" : "Add Part"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {editingPart
                      ? "Update part details"
                      : "Add a new part to the catalog"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Oil Filter, Coolant, Gasket"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Part Number</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="e.g., OF-123, CLT-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit of Measurement</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: PartUnit) =>
                      setFormData({ ...formData, unit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                {editingPart && (
                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPart ? "Save Changes" : "Create Part"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
              <div className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Delete Part
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    "{deleteConfirm.name}"
                  </span>
                  ? If this part has usage records, deletion will fail.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
