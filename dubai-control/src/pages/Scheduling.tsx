// dubai-control/src/pages/Scheduling.tsx
// M005/S02: Recurring Job Schedule management UI
// NEW FILE — does not touch any locked Cleaning page

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  listRecurringTemplates,
  createRecurringTemplate,
  updateRecurringTemplate,
  deleteRecurringTemplate,
  RecurringJobTemplate,
  RecurringFrequency,
} from "@/api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function freqBadge(t: RecurringJobTemplate) {
  const base = FREQ_LABELS[t.frequency];
  if (t.frequency === "weekly" && t.day_of_week !== null) {
    return `${base} · ${DAYS[t.day_of_week]}`;
  }
  if (t.frequency === "monthly" && t.day_of_month !== null) {
    return `${base} · Day ${t.day_of_month}`;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Template Form Modal
// ---------------------------------------------------------------------------

interface TemplateFormState {
  name: string;
  location_id: string;
  frequency: RecurringFrequency;
  day_of_week: string;
  day_of_month: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
}

function defaultForm(t?: RecurringJobTemplate): TemplateFormState {
  return {
    name: t?.name ?? "",
    location_id: t?.location?.id ? String(t.location.id) : "",
    frequency: t?.frequency ?? "daily",
    day_of_week: t?.day_of_week != null ? String(t.day_of_week) : "",
    day_of_month: t?.day_of_month != null ? String(t.day_of_month) : "",
    scheduled_start_time: t?.scheduled_start_time ?? "",
    scheduled_end_time: t?.scheduled_end_time ?? "",
  };
}

interface TemplateFormProps {
  initial?: RecurringJobTemplate;
  onSave: (data: Parameters<typeof createRecurringTemplate>[0]) => Promise<void>;
  onClose: () => void;
}

function TemplateForm({ initial, onSave, onClose }: TemplateFormProps) {
  const [form, setForm] = useState<TemplateFormState>(defaultForm(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TemplateFormState>(k: K, v: TemplateFormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.location_id) { setError("Location is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name.trim(),
        location_id: Number(form.location_id),
        frequency: form.frequency,
        day_of_week: form.day_of_week !== "" ? Number(form.day_of_week) : null,
        day_of_month: form.day_of_month !== "" ? Number(form.day_of_month) : null,
        scheduled_start_time: form.scheduled_start_time || null,
        scheduled_end_time: form.scheduled_end_time || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit Schedule" : "New Schedule"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Schedule Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. Daily Marina Apartments"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Location ID *</label>
              <input
                type="number"
                value={form.location_id}
                onChange={e => set("location_id", e.target.value)}
                placeholder="Enter location ID"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Go to Locations to find the ID
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Frequency *</label>
              <select
                value={form.frequency}
                onChange={e => set("frequency", e.target.value as RecurringFrequency)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {form.frequency === "weekly" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Day of Week</label>
                <select
                  value={form.day_of_week}
                  onChange={e => set("day_of_week", e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">— Any —</option>
                  {DAYS.map((d, i) => (
                    <option key={d} value={String(i)}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {form.frequency === "monthly" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Day of Month</label>
                <input
                  type="number"
                  min={1} max={28}
                  value={form.day_of_month}
                  onChange={e => set("day_of_month", e.target.value)}
                  placeholder="1–28"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Start Time</label>
              <input
                type="time"
                value={form.scheduled_start_time}
                onChange={e => set("scheduled_start_time", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">End Time</label>
              <input
                type="time"
                value={form.scheduled_end_time}
                onChange={e => set("scheduled_end_time", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
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
              {initial ? "Save Changes" : "Create Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggle,
}: {
  template: RecurringJobTemplate;
  onEdit: (t: RecurringJobTemplate) => void;
  onDelete: (t: RecurringJobTemplate) => void;
  onToggle: (t: RecurringJobTemplate) => void;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-5 shadow-sm transition-all ${
      template.is_active ? "border-border" : "border-dashed border-muted-foreground/30 opacity-60"
    }`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{template.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <RefreshCw className="h-3 w-3" />
              {freqBadge(template)}
            </span>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              template.is_active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }`}>
              {template.is_active
                ? <CheckCircle2 className="h-3 w-3" />
                : <XCircle className="h-3 w-3" />}
              {template.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {template.location?.name ?? `#${template.location?.id}`}
        </span>
        {template.cleaner && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {template.cleaner.full_name}
          </span>
        )}
        {template.scheduled_start_time && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {template.scheduled_start_time}
            {template.scheduled_end_time && ` – ${template.scheduled_end_time}`}
          </span>
        )}
        {template.last_generated_at && (
          <span className="flex items-center gap-1 col-span-2">
            <Calendar className="h-3 w-3" />
            Last run: {new Date(template.last_generated_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(template)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          {template.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {template.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={() => onEdit(template)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <Pencil className="h-3.5 w-3.5" />Edit
        </button>
        <button
          onClick={() => onDelete(template)}
          className="flex items-center justify-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
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

export default function SchedulingPage() {
  const [templates, setTemplates] = useState<RecurringJobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringJobTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RecurringJobTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await listRecurringTemplates());
    } catch {
      setError("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data: Parameters<typeof createRecurringTemplate>[0]) {
    await createRecurringTemplate(data);
    await load();
  }

  async function handleUpdate(data: Parameters<typeof createRecurringTemplate>[0]) {
    if (!editTarget) return;
    await updateRecurringTemplate(editTarget.id, data);
    await load();
  }

  async function handleToggle(t: RecurringJobTemplate) {
    await updateRecurringTemplate(t.id, { is_active: !t.is_active } as never);
    await load();
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteRecurringTemplate(deleteConfirm.id);
      setDeleteConfirm(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  }

  const active = templates.filter(t => t.is_active);
  const inactive = templates.filter(t => !t.is_active);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <RefreshCw className="h-6 w-6 text-primary" />
            Recurring Schedules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generate cleaning jobs on a daily, weekly, or monthly cadence
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />New Schedule
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No recurring schedules yet</p>
          <p className="text-sm text-muted-foreground/70">
            Create a schedule to auto-generate jobs each day
          </p>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" />Create Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Active ({active.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onEdit={t => { setEditTarget(t); setShowForm(true); }}
                    onDelete={setDeleteConfirm}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          )}
          {inactive.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Inactive ({inactive.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactive.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onEdit={t => { setEditTarget(t); setShowForm(true); }}
                    onDelete={setDeleteConfirm}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showForm && (
        <TemplateForm
          initial={editTarget ?? undefined}
          onSave={editTarget ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Delete Schedule?</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              <strong>{deleteConfirm.name}</strong> will be removed. Already-generated jobs are unaffected.
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
