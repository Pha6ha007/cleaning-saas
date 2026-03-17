// dubai-control/src/pages/company/Branches.tsx
// M005/S01: Branch management UI — list, create, edit, analytics
// NEW FILE — does not touch any locked Cleaning page

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  BarChart2,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchAnalytics,
  Branch,
  BranchAnalytics,
} from "@/api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function completionColor(rate: number): string {
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 70) return "text-amber-500";
  return "text-rose-500";
}

// ---------------------------------------------------------------------------
// Branch Form Modal
// ---------------------------------------------------------------------------

interface BranchFormProps {
  initial?: Partial<Branch>;
  onSave: (data: { name: string; description: string }) => Promise<void>;
  onClose: () => void;
}

function BranchForm({ initial, onSave, onClose }: BranchFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Branch name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {initial?.id ? "Edit Branch" : "New Branch"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Branch Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dubai Marina"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes about this branch"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {initial?.id ? "Save Changes" : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics Panel
// ---------------------------------------------------------------------------

function AnalyticsPanel({ branchId, name, onClose }: {
  branchId: number;
  name: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<BranchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBranchAnalytics(branchId, { days });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [branchId, days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{name}</h2>
            <p className="text-xs text-muted-foreground">Branch Analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="rounded-lg border border-border px-2 py-1 text-xs"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Jobs", value: data.jobs_total, color: "text-foreground" },
              { label: "Completed", value: data.jobs_completed, color: "text-emerald-600" },
              { label: "Cancelled", value: data.jobs_cancelled, color: "text-rose-500" },
              { label: "In Progress", value: data.jobs_in_progress, color: "text-blue-500" },
              { label: "SLA Breaches", value: data.sla_breaches, color: "text-amber-500" },
              {
                label: "Completion Rate",
                value: `${data.completion_rate.toFixed(1)}%`,
                color: completionColor(data.completion_rate),
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No data available</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branch Card
// ---------------------------------------------------------------------------

function BranchCard({
  branch,
  onEdit,
  onDelete,
  onAnalytics,
}: {
  branch: Branch;
  onEdit: (b: Branch) => void;
  onDelete: (b: Branch) => void;
  onAnalytics: (b: Branch) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="font-semibold text-foreground">{branch.name}</h3>
            {branch.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{branch.description}</p>
            )}
          </div>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          branch.is_active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-muted text-muted-foreground"
        }`}>
          {branch.is_active
            ? <CheckCircle2 className="h-3 w-3" />
            : <XCircle className="h-3 w-3" />}
          {branch.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />{branch.location_count} locations
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />{branch.user_count} staff
        </span>
      </div>

      {branch.manager && (
        <p className="mb-4 text-xs text-muted-foreground">
          Manager: <span className="text-foreground font-medium">{branch.manager.full_name}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onAnalytics(branch)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <BarChart2 className="h-3.5 w-3.5" />Analytics
        </button>
        <button
          onClick={() => onEdit(branch)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />Edit
        </button>
        <button
          onClick={() => onDelete(branch)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<Branch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBranches();
      setBranches(data);
    } catch {
      setError("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: { name: string; description: string }) {
    await createBranch(data);
    await load();
  }

  async function handleUpdate(data: { name: string; description: string }) {
    if (!editTarget) return;
    await updateBranch(editTarget.id, data);
    await load();
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteBranch(deleteConfirm.id);
      setDeleteConfirm(null);
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <GitBranch className="h-6 w-6 text-primary" />
            Branches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organise locations and staff into operational branches
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />New Branch
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : branches.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No branches yet</p>
          <p className="text-sm text-muted-foreground/70">
            Create your first branch to group locations and staff
          </p>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />Create Branch
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map(b => (
            <BranchCard
              key={b.id}
              branch={b}
              onEdit={b => { setEditTarget(b); setShowForm(true); }}
              onDelete={setDeleteConfirm}
              onAnalytics={setAnalyticsTarget}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <BranchForm
          initial={editTarget ?? undefined}
          onSave={editTarget ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Analytics Panel */}
      {analyticsTarget && (
        <AnalyticsPanel
          branchId={analyticsTarget.id}
          name={analyticsTarget.name}
          onClose={() => setAnalyticsTarget(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-foreground">Delete Branch?</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              <strong>{deleteConfirm.name}</strong> will be removed. Locations and staff
              in this branch will be unassigned.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
