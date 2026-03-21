// dubai-control/src/pages/maintenance/Parts.tsx
// Parts catalog management page for Maintenance context (Stage 7)
// Stage 14: Full Inventory Management with stock levels and adjustments
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
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
} from "lucide-react";
import {
  listParts,
  createPart,
  updatePart,
  deletePart,
  adjustStock,
  getStockHistory,
  maintenanceKeys,
  type Part,
  type PartUnit,
  type CreatePartInput,
  type StockAdjustment,
  type StockAdjustmentType,
  type AdjustStockInput,
  getApiErrorMessage,
  getApiErrorCode,
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

  // Stock adjustment modal
  const [stockAdjustPart, setStockAdjustPart] = useState<Part | null>(null);
  const [stockAdjustData, setStockAdjustData] = useState({
    adjustment_type: "in" as StockAdjustmentType,
    quantity: "",
    reason: "",
    reference: "",
  });

  // Stock history modal
  const [stockHistoryPart, setStockHistoryPart] = useState<Part | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    unit: "pcs" as PartUnit,
    is_active: true,
    stock_quantity: "",
    reorder_point: "",
    reorder_quantity: "",
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
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Failed to create part");
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
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Failed to update part");
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
    onError: (error: unknown) => {
      const code = getApiErrorCode(error);
      const message =
        code === "CONFLICT"
          ? "Cannot delete part with usage records. Deactivate instead."
          : getApiErrorMessage(error, "Failed to delete part");
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
      setDeleteConfirm(null);
    },
  });

  // Stock adjustment mutation
  const stockAdjustMutation = useMutation({
    mutationFn: ({ partId, input }: { partId: number; input: AdjustStockInput }) =>
      adjustStock(partId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.parts.all });
      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      });
      setStockAdjustPart(null);
      setStockAdjustData({
        adjustment_type: "in",
        quantity: "",
        reason: "",
        reference: "",
      });
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Failed to adjust stock");
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  });

  // Stock history query
  const {
    data: stockHistory = [],
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: maintenanceKeys.parts.stockHistory(stockHistoryPart?.id ?? 0),
    queryFn: () => getStockHistory(stockHistoryPart!.id),
    enabled: !!stockHistoryPart,
  });

  const handleAddNew = () => {
    setEditingPart(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      unit: "pcs",
      is_active: true,
      stock_quantity: "0",
      reorder_point: "0",
      reorder_quantity: "0",
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
      stock_quantity: part.stock_quantity || "0",
      reorder_point: part.reorder_point || "0",
      reorder_quantity: part.reorder_quantity || "0",
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
      stock_quantity: "0",
      reorder_point: "0",
      reorder_quantity: "0",
    });
  };

  const handleOpenStockAdjust = (part: Part) => {
    setStockAdjustPart(part);
    setStockAdjustData({
      adjustment_type: "in",
      quantity: "",
      reason: "",
      reference: "",
    });
  };

  const handleSaveStockAdjust = () => {
    const qty = parseFloat(stockAdjustData.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be a positive number",
      });
      return;
    }
    if (!stockAdjustPart) return;

    stockAdjustMutation.mutate({
      partId: stockAdjustPart.id,
      input: {
        adjustment_type: stockAdjustData.adjustment_type,
        quantity: qty,
        reason: stockAdjustData.reason.trim() || undefined,
        reference: stockAdjustData.reference.trim() || undefined,
      },
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

    const stockQty = parseFloat(formData.stock_quantity) || 0;
    const reorderPoint = parseFloat(formData.reorder_point) || 0;
    const reorderQty = parseFloat(formData.reorder_quantity) || 0;

    if (editingPart) {
      updateMutation.mutate({
        id: editingPart.id,
        data: {
          name: formData.name.trim(),
          sku: formData.sku.trim() || undefined,
          description: formData.description.trim() || undefined,
          unit: formData.unit,
          is_active: formData.is_active,
          stock_quantity: stockQty,
          reorder_point: reorderPoint,
          reorder_quantity: reorderQty,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        description: formData.description.trim() || undefined,
        unit: formData.unit,
        stock_quantity: stockQty,
        reorder_point: reorderPoint,
        reorder_quantity: reorderQty,
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
    const errorMessage = getApiErrorMessage(errorData, "Failed to load parts. Please try again.");
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

  // Calculate low stock count
  const lowStockParts = parts.filter(
    (p) => p.is_active && (p.is_low_stock || p.stock_status === "low_stock" || p.stock_status === "out_of_stock")
  );
  const hasLowStock = lowStockParts.length > 0;

  return (
    <MaintenanceLayout>
      <div className="space-y-4">
        {/* Low Stock Alert Banner */}
        {hasLowStock && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-700">
                Low Stock Alert
              </p>
            </div>
            <p className="mt-1 text-sm text-amber-600">
              {lowStockParts.length} part{lowStockParts.length !== 1 ? "s" : ""} {lowStockParts.length !== 1 ? "are" : "is"} below reorder point:{" "}
              {lowStockParts.slice(0, 3).map((p) => p.name).join(", ")}
              {lowStockParts.length > 3 && ` and ${lowStockParts.length - 3} more`}
            </p>
          </div>
        )}

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
                  <th className="text-right">Stock</th>
                  <th className="text-right">Reorder Pt.</th>
                  <th className="w-[100px]">Stock Status</th>
                  <th className="w-[80px]">Status</th>
                  {hasWriteAccess && <th className="w-[140px]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => {
                  const stockQty = parseFloat(part.stock_quantity) || 0;
                  const reorderPt = parseFloat(part.reorder_point) || 0;

                  // Determine stock status
                  let stockStatusBadge;
                  if (part.stock_status === "out_of_stock" || stockQty <= 0) {
                    stockStatusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Out of Stock
                      </span>
                    );
                  } else if (part.stock_status === "low_stock" || part.is_low_stock) {
                    stockStatusBadge = (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </span>
                    );
                  } else {
                    stockStatusBadge = (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                        In Stock
                      </span>
                    );
                  }

                  return (
                    <tr key={part.id}>
                      <td className="font-medium text-foreground">{part.name}</td>
                      <td className="text-muted-foreground">
                        {part.sku || "—"}
                      </td>
                      <td className="text-muted-foreground">
                        {part.unit_display || part.unit}
                      </td>
                      <td className="text-right font-mono text-sm">
                        {stockQty.toFixed(0)}
                      </td>
                      <td className="text-right font-mono text-sm text-muted-foreground">
                        {reorderPt.toFixed(0)}
                      </td>
                      <td>{stockStatusBadge}</td>
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
                              onClick={() => handleOpenStockAdjust(part)}
                              title="Adjust Stock"
                            >
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setStockHistoryPart(part)}
                              title="Stock History"
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEdit(part)}
                              title="Edit Part"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(part)}
                              title="Delete Part"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
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

                {/* Stock Management Fields */}
                <div className="pt-2 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    Inventory Settings
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Current Stock</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.stock_quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, stock_quantity: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reorder_point">Reorder Point</Label>
                      <Input
                        id="reorder_point"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.reorder_point}
                        onChange={(e) =>
                          setFormData({ ...formData, reorder_point: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reorder_quantity">Reorder Qty</Label>
                      <Input
                        id="reorder_quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={formData.reorder_quantity}
                        onChange={(e) =>
                          setFormData({ ...formData, reorder_quantity: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Low stock alert triggers when stock falls below reorder point.
                  </p>
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

        {/* Stock Adjustment Modal */}
        {stockAdjustPart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Adjust Stock
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stockAdjustPart.name} (Current: {parseFloat(stockAdjustPart.stock_quantity).toFixed(0)} {stockAdjustPart.unit_display})
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStockAdjustPart(null)}
                  disabled={stockAdjustMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={stockAdjustData.adjustment_type === "in" ? "default" : "outline"}
                      className={stockAdjustData.adjustment_type === "in" ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => setStockAdjustData({ ...stockAdjustData, adjustment_type: "in" })}
                    >
                      <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                      Stock In
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={stockAdjustData.adjustment_type === "out" ? "default" : "outline"}
                      className={stockAdjustData.adjustment_type === "out" ? "bg-amber-600 hover:bg-amber-700" : ""}
                      onClick={() => setStockAdjustData({ ...stockAdjustData, adjustment_type: "out" })}
                    >
                      <ArrowDownCircle className="mr-1.5 h-4 w-4" />
                      Stock Out
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={stockAdjustData.adjustment_type === "correction" ? "default" : "outline"}
                      onClick={() => setStockAdjustData({ ...stockAdjustData, adjustment_type: "correction" })}
                    >
                      Correction
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust_quantity">Quantity *</Label>
                  <Input
                    id="adjust_quantity"
                    type="number"
                    min="0.01"
                    step="1"
                    value={stockAdjustData.quantity}
                    onChange={(e) =>
                      setStockAdjustData({ ...stockAdjustData, quantity: e.target.value })
                    }
                    placeholder="Enter quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust_reason">Reason</Label>
                  <Input
                    id="adjust_reason"
                    value={stockAdjustData.reason}
                    onChange={(e) =>
                      setStockAdjustData({ ...stockAdjustData, reason: e.target.value })
                    }
                    placeholder="e.g., Received shipment, Used on visit, Inventory count"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjust_reference">Reference</Label>
                  <Input
                    id="adjust_reference"
                    value={stockAdjustData.reference}
                    onChange={(e) =>
                      setStockAdjustData({ ...stockAdjustData, reference: e.target.value })
                    }
                    placeholder="e.g., PO-12345, Visit-789"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setStockAdjustPart(null)}
                  disabled={stockAdjustMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveStockAdjust}
                  disabled={stockAdjustMutation.isPending}
                >
                  {stockAdjustMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Adjust Stock
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stock History Modal */}
        {stockHistoryPart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl max-h-[80vh] rounded-xl border border-border bg-card shadow-xl flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Stock History
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stockHistoryPart.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStockHistoryPart(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-auto p-6">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : stockHistory.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <History className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="font-medium text-foreground">No adjustments yet</p>
                    <p className="mt-1 text-sm">
                      Stock adjustments will appear here
                    </p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Before</th>
                        <th className="text-right">After</th>
                        <th>Reason</th>
                        <th>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockHistory.map((adj) => {
                        const typeLabel = adj.adjustment_type === "in" ? "Stock In" :
                          adj.adjustment_type === "out" ? "Stock Out" : "Correction";
                        const typeClass = adj.adjustment_type === "in"
                          ? "bg-green-500/10 text-green-600"
                          : adj.adjustment_type === "out"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-blue-500/10 text-blue-600";

                        return (
                          <tr key={adj.id}>
                            <td className="text-muted-foreground text-sm">
                              {new Date(adj.adjusted_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeClass}`}>
                                {typeLabel}
                              </span>
                            </td>
                            <td className="text-right font-mono text-sm">
                              {adj.adjustment_type === "out" ? "-" : "+"}{parseFloat(adj.quantity).toFixed(0)}
                            </td>
                            <td className="text-right font-mono text-sm text-muted-foreground">
                              {parseFloat(adj.quantity_before).toFixed(0)}
                            </td>
                            <td className="text-right font-mono text-sm font-medium">
                              {parseFloat(adj.quantity_after).toFixed(0)}
                            </td>
                            <td className="text-muted-foreground text-sm max-w-[150px] truncate">
                              {adj.reason || adj.reference || "—"}
                            </td>
                            <td className="text-muted-foreground text-sm">
                              {adj.adjusted_by?.name || "System"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setStockHistoryPart(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MaintenanceLayout>
  );
}
