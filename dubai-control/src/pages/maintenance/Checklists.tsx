// dubai-control/src/pages/maintenance/Checklists.tsx
// Checklist templates management page for Maintenance context (Stage 9)
// Uses Lovable-style CSS classes: .page-header, .page-title, .premium-card, .data-table

import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Loader2,
  X,
  ClipboardList,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  maintenanceKeys,
  type ChecklistTemplate,
  type CreateChecklistTemplateInput,
  type UpdateChecklistTemplateInput,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";

// RBAC: Check if user can write checklists (owner/manager)
function canWriteChecklists(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// RBAC: Check if user can read checklists (owner/manager/staff)
function canReadChecklists(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Item form type
type ItemForm = {
  text: string;
  is_required: boolean;
};

export default function Checklists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserRole();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ChecklistTemplate | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const [formItems, setFormItems] = useState<ItemForm[]>([
    { text: "", is_required: true },
  ]);

  // Check access
  const hasReadAccess = canReadChecklists(user.role);
  const hasWriteAccess = canWriteChecklists(user.role);

  // Fetch checklists
  const {
    data: templates = [],
    isLoading,
    isError,
    error: errorData,
    refetch,
  } = useQuery({
    queryKey: maintenanceKeys.checklistTemplates.list(),
    queryFn: () => getChecklistTemplates(),
    enabled: hasReadAccess,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateChecklistTemplateInput) => createChecklistTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplates.all });
      toast({
        title: "Success",
        description: "Checklist template created successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to create checklist template";
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
      data: UpdateChecklistTemplateInput;
    }) => updateChecklistTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplates.all });
      toast({
        title: "Success",
        description: "Checklist template updated successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Failed to update checklist template";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteChecklistTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.checklistTemplates.all });
      toast({
        title: "Success",
        description: "Checklist template deleted successfully",
      });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      const code = error?.response?.data?.code;
      const message =
        code === "CONFLICT"
          ? error?.response?.data?.message || "Cannot delete checklist template in use."
          : error?.response?.data?.message || "Failed to delete checklist template";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setDeleteConfirm(null);
    },
  });

  const handleAddNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
    setFormItems([{ text: "", is_required: true }]);
    setShowModal(true);
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      is_active: template.is_active ?? true,
    });
    // Convert items to form format
    const items = template.items?.map((item) => ({
      text: item.text,
      is_required: item.is_required,
    })) || [{ text: "", is_required: true }];
    setFormItems(items.length > 0 ? items : [{ text: "", is_required: true }]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
    setFormItems([{ text: "", is_required: true }]);
  };

  const handleAddItem = () => {
    setFormItems([...formItems, { text: "", is_required: true }]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof ItemForm, value: string | boolean) => {
    const newItems = [...formItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormItems(newItems);
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formItems.length - 1)
    ) {
      return;
    }
    const newItems = [...formItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setFormItems(newItems);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Template name is required",
      });
      return;
    }

    // Filter out empty items and create ordered list
    const validItems = formItems
      .filter((item) => item.text.trim())
      .map((item, index) => ({
        text: item.text.trim(),
        is_required: item.is_required,
        order: index + 1,
      }));

    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least one checklist item is required",
      });
      return;
    }

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
          items: validItems,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        items: validItems,
      });
    }
  };

  const handleDelete = (template: ChecklistTemplate) => {
    setDeleteConfirm(template);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const toggleRowExpanded = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Access restricted view
  if (!hasReadAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view checklist templates.
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
      "Failed to load checklist templates. Please try again.";
    return (
      <MaintenanceLayout>
        <div className="space-y-4">
          {/* Error Banner */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                Error loading data
              </p>
            </div>
            <p className="mt-1 text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <div className="py-8 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">
              Unable to load checklist templates
            </h2>
            <p className="mt-2 text-muted-foreground">
              There was an error loading the checklist templates.
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
          <h1 className="page-title">Checklist Templates</h1>
          {hasWriteAccess && (
            <Button
              size="sm"
              className="h-8 px-3 text-xs font-medium"
              onClick={handleAddNew}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Template
            </Button>
          )}
        </div>

        {/* Templates Table - Lovable premium-card style */}
        <div className="premium-card overflow-hidden">
          {templates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">No checklist templates yet</p>
              <p className="mt-1 text-sm">
                Create templates to standardize maintenance tasks
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[40px]"></th>
                  <th>Name</th>
                  <th className="w-[100px] text-center">Items</th>
                  <th className="w-[100px] text-center">Used In</th>
                  <th className="w-[80px]">Status</th>
                  {hasWriteAccess && <th className="w-[100px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <Fragment key={template.id}>
                    <tr className={!template.is_active ? "opacity-60" : ""}>
                      <td className="!px-2">
                        <button
                          onClick={() => toggleRowExpanded(template.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {expandedRows.has(template.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {template.description}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="text-muted-foreground">
                          {template.items_count ?? template.items?.length ?? 0}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="text-muted-foreground">
                          {template.usage_count ?? 0} visits
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            template.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {template.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {hasWriteAccess && (
                        <td>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Expanded row with items */}
                    {expandedRows.has(template.id) && template.items && (
                      <tr>
                        <td colSpan={hasWriteAccess ? 6 : 5} className="!p-0">
                          <div className="bg-muted/30 px-6 py-3 border-t border-border">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              CHECKLIST ITEMS
                            </div>
                            <div className="space-y-1">
                              {template.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="w-5 h-5 rounded border border-border bg-background flex items-center justify-center text-xs text-muted-foreground">
                                    {idx + 1}
                                  </span>
                                  <span className={item.is_required ? "" : "text-muted-foreground"}>
                                    {item.text}
                                  </span>
                                  {item.is_required && (
                                    <span className="text-xs text-amber-600 font-medium">
                                      Required
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingTemplate ? "Edit Checklist Template" : "New Checklist Template"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., HVAC Maintenance Checklist"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Checklist Items *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {formItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 border border-border rounded-lg bg-muted/30"
                    >
                      {/* Order controls */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveItem(index, "up")}
                          disabled={index === 0}
                          className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(index, "down")}
                          disabled={index === formItems.length - 1}
                          className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Item text */}
                      <div className="flex-1">
                        <Input
                          value={item.text}
                          onChange={(e) =>
                            handleItemChange(index, "text", e.target.value)
                          }
                          placeholder={`Item ${index + 1}`}
                          className="h-8 text-sm"
                        />
                      </div>
                      {/* Required toggle */}
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id={`required-${index}`}
                          checked={item.is_required}
                          onCheckedChange={(checked) =>
                            handleItemChange(index, "is_required", !!checked)
                          }
                        />
                        <Label
                          htmlFor={`required-${index}`}
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          Required
                        </Label>
                      </div>
                      {/* Remove button */}
                      {formItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active toggle (only for editing) */}
              {editingTemplate && (
                <div className="flex items-center gap-2">
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

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingTemplate ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Delete Checklist Template</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete "{deleteConfirm.name}"? This action
              cannot be undone.
            </p>
            {(deleteConfirm.usage_count ?? 0) > 0 && (
              <p className="mt-2 text-sm text-amber-600">
                This template is used by {deleteConfirm.usage_count} visit(s).
                Consider deactivating instead.
              </p>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
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
      )}
    </MaintenanceLayout>
  );
}
