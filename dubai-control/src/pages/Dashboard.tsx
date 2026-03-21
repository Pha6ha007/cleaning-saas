import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/empty/EmptyState";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { useLocations } from "@/contexts/LocationsContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { TrialExpiredBanner } from "@/components/access";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getManagerTodayJobs, getUsageSummary, API_BASE_URL } from "@/api/client";
import { TRIAL_COPY, formatPlanTier, CTA_COPY } from "@/constants/copy";

type ApiJob = {
  id: number;
  status: "scheduled" | "in_progress" | "completed" | string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  scheduled_date?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location: string;
  cleaner: string;
};

type UiJobStatus = "in-progress" | "completed" | "issue";

type UiJob = {
  id: number;
  status: UiJobStatus;
  date: string;
  location: string;
  cleaner: string;
  startTime: string;
  endTime: string;
};

type UsageSummary = {
  plan: string;
  plan_tier: "standard" | "pro" | "enterprise";
  is_paid?: boolean;
  is_trial_active: boolean;
  is_trial_expired: boolean;
  days_left?: number | null;
};

// formatPlanTier imported from @/constants/copy

// Нормализуем время: поддерживаем ISO и просто "HH:MM(:SS)"
function normalizeTime(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Формат "HH:MM" или "HH:MM:SS"
  const pureMatch = trimmed.match(/^(\d{2}:\d{2})(:\d{2})?$/);
  if (pureMatch) {
    return pureMatch[1]; // берём только HH:MM
  }

  // Пробуем распарсить как ISO
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return null;
}

function mapApiJobToUi(job: ApiJob): UiJob {
  let uiStatus: UiJobStatus;

  if (job.status === "in_progress") {
    uiStatus = "in-progress";
  } else if (job.status === "completed") {
    uiStatus = "completed";
  } else {
    uiStatus = "issue";
  }

  // стараемся поймать время из всех возможных полей
  const rawStart =
    job.scheduled_start ||
    job.scheduled_start_time ||
    job.start_time ||
    null;

  const rawEnd =
    job.scheduled_end ||
    job.scheduled_end_time ||
    job.end_time ||
    null;

  const startTime = normalizeTime(rawStart) ?? "--:--";
  const endTime = normalizeTime(rawEnd) ?? "--:--";

  // дата — либо отдельное поле, либо берём из scheduled_start, если там ISO
  let date = "";
  if (job.scheduled_date) {
    date = job.scheduled_date;
  } else if (job.scheduled_start) {
    date = job.scheduled_start.slice(0, 10);
  }

  return {
    id: job.id,
    status: uiStatus,
    date,
    location: job.location || "Unknown location",
    cleaner: job.cleaner || "Unknown cleaner",
    startTime,
    endTime,
  };
}

export default function Dashboard() {
  const [todayJobs, setTodayJobs] = useState<UiJob[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [companyBlocked, setCompanyBlocked] = useState(false);

  // Auto-start trial if user came from pricing page with trial flow
  useEffect(() => {
    const trialEntry = localStorage.getItem("cleanproof_trial_entry");

    // Accept any valid tier: standard, pro, enterprise
    if (trialEntry && ["standard", "pro", "enterprise"].includes(trialEntry)) {
      // Remove flag immediately to prevent re-triggering
      localStorage.removeItem("cleanproof_trial_entry");

      // Call trial start endpoint with the selected tier
      // Prefer JWT access_token; fall back to legacy Token auth
      const jwtToken = localStorage.getItem("access_token");
      const legacyToken = localStorage.getItem("authToken") || localStorage.getItem("auth_token");
      const token = jwtToken || legacyToken;
      const authScheme = jwtToken ? "Bearer" : "Token";

      if (token) {
        fetch(`${API_BASE_URL}/api/cleanproof/trials/start/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${authScheme} ${token}`,
          },
          body: JSON.stringify({ tier: trialEntry }),
        })
          .then(async (resp) => {
            if (resp.ok) {
            } else {
              console.warn("Failed to start trial:", resp.status);
            }
          })
          .catch((err) => {
            console.error("Error starting trial:", err);
          });
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [apiJobs, usageSummary] = await Promise.all([
        getManagerTodayJobs(),
        getUsageSummary(),
      ]);

      const mappedJobs = (apiJobs as ApiJob[]).map(mapApiJobToUi);
      setTodayJobs(mappedJobs);
      setUsage(usageSummary as UsageSummary);
    } catch (err: unknown) {
      // 🔒 company blocked → read-only mode
      const apiErr = err as { code?: string; message?: string };
      if (apiErr?.code === "company_blocked") {
        setCompanyBlocked(true);
        setTodayJobs([]);
        setUsage(null);
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      setTodayJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = {
    total: todayJobs.length,
    inProgress: todayJobs.filter((j) => j.status === "in-progress").length,
    completed: todayJobs.filter((j) => j.status === "completed").length,
    issues: todayJobs.filter((j) => j.status === "issue").length,
  };

  const todayInGulf = new Date();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Dubai", // GST / UTC+4
  }).format(todayInGulf);

  // Check if company is paid
  const isPaid = usage?.is_paid ?? false;

  // Banner texts using consistent copy
  const bannerTitle =
    isPaid
      ? formatPlanTier(usage?.plan_tier ?? "standard")
      : usage && usage.is_trial_expired
      ? TRIAL_COPY.trialExpired
      : usage && usage.is_trial_active
      ? TRIAL_COPY.trialActive(usage.days_left ?? 0)
      : usage
      ? formatPlanTier(usage.plan_tier)
      : "Loading...";

  const bannerDescription =
    isPaid
      ? "Your plan is active. All features are available."
      : usage && usage.is_trial_expired
      ? TRIAL_COPY.trialExpiredDescription
      : usage && usage.is_trial_active
      ? TRIAL_COPY.trialActiveDescription
      : "You're on a paid plan. All features are available.";

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Today&apos;s Overview
          </h1>
          <p className="mt-1 text-muted-foreground">
            {todayLabel} · GST (UTC+4)
          </p>
        </div>

        <Link to={companyBlocked ? "#" : "/planning"}>
          <Button
            disabled={companyBlocked}
            className="bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-60"
          >
            {companyBlocked ? (
              "Account suspended"
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </>
            )}
          </Button>
        </Link>
      </div>

      {/* Company blocked banner */}
      {companyBlocked && (
        <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
          <p className="text-sm font-medium text-yellow-900">
            ⚠️ Account suspended
          </p>
          <p className="mt-1 text-xs text-yellow-800">
            Your company account is currently suspended. You can view jobs and
            reports, but creating new items is temporarily disabled.
          </p>
          <p className="mt-1 text-xs text-yellow-800">
            Please contact support to restore full access.
          </p>
        </div>
      )}

      {/* Usage / Trial banner */}
      {usage && usage.is_trial_expired && !isPaid ? (
        <TrialExpiredBanner
          variant="inline"
          title={TRIAL_COPY.trialExpired}
          description={TRIAL_COPY.trialExpiredDescription}
          ctaText={CTA_COPY.contactToUpgrade}
          ctaHref={CTA_COPY.contactHref}
          className="mb-6"
        />
      ) : usage ? (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center justify-between ${
          isPaid
            ? "border-emerald-200 bg-emerald-50"
            : "border-border bg-muted/40"
        }`}>
          <div>
            <p className={`text-sm font-medium ${isPaid ? "text-emerald-900" : "text-foreground"}`}>
              {bannerTitle}
            </p>
            <p className={`mt-1 text-xs ${isPaid ? "text-emerald-700" : "text-muted-foreground"}`}>
              {bannerDescription}
            </p>
          </div>

          {!isPaid && (
            <Button asChild variant="outline" size="sm">
              <Link to={CTA_COPY.contactHref}>{CTA_COPY.contactToUpgrade}</Link>
            </Button>
          )}
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jobs Today"
          value={stats.total}
          icon={Calendar}
          variant="primary"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          variant="default"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Issues"
          value={stats.issues}
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 flex items-center justify-between gap-3">
          <div className="text-sm text-destructive">Failed to load jobs: {error}</div>
          <Button size="sm" variant="outline" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* Today's Jobs */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">Today&apos;s Jobs</h2>
          <Link
            to="/jobs"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px] rounded-full" />
                </div>
              ))}
            </div>
          ) : todayJobs.length === 0 ? (
            <EmptyState
              icon={<svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>}
              title="No jobs scheduled for today"
              description="Create a job to get started. Jobs assigned to today will appear here."
              actionLabel="Create a job"
              actionHref="/planning"
            />
          ) : (
            todayJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="truncate font-medium text-foreground">
                      {job.location}
                    </p>
                    <StatusPill status={job.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.cleaner} · {job.startTime} - {job.endTime}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
