// dubai-control/src/components/onboarding/OnboardingChecklist.tsx
// Setup checklist shown on Dashboard for new users
// Disappears once all steps are complete or dismissed

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, X, MapPin, Users, CalendarPlus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  check: () => boolean;
}

interface OnboardingChecklistProps {
  context: "cleaning" | "maintenance";
  locationCount: number;
  staffCount: number;
  taskCount: number;
  assetCount?: number;
}

const STORAGE_KEY = "onboarding_dismissed";

const CubeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

export function OnboardingChecklist({
  context,
  locationCount,
  staffCount,
  taskCount,
  assetCount = 0,
}: OnboardingChecklistProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val ? JSON.parse(val) : {};
    } catch {
      return {};
    }
  });

  const isDismissed = dismissed[context] === true;

  const handleDismiss = () => {
    const updated = { ...dismissed, [context]: true };
    setDismissed(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const steps: Step[] = context === "cleaning"
    ? [
        {
          id: "location",
          label: t("cleaning.onboarding.addLocation"),
          description: t("cleaning.onboarding.addLocationDesc"),
          href: "/locations",
          icon: <MapPin className="h-4 w-4" />,
          check: () => locationCount > 0,
        },
        {
          id: "staff",
          label: t("cleaning.onboarding.addCleaner"),
          description: t("cleaning.onboarding.addCleanerDesc"),
          href: "/company/team",
          icon: <Users className="h-4 w-4" />,
          check: () => staffCount > 0,
        },
        {
          id: "task",
          label: t("cleaning.onboarding.createJob"),
          description: t("cleaning.onboarding.createJobDesc"),
          href: "/planning",
          icon: <CalendarPlus className="h-4 w-4" />,
          check: () => taskCount > 0,
        },
      ]
    : [
        {
          id: "location",
          label: t("maintenance.onboarding.addLocation"),
          description: t("maintenance.onboarding.addLocationDesc"),
          href: "/maintenance/locations",
          icon: <MapPin className="h-4 w-4" />,
          check: () => locationCount > 0,
        },
        {
          id: "asset",
          label: t("maintenance.onboarding.addAsset"),
          description: t("maintenance.onboarding.addAssetDesc"),
          href: "/maintenance/assets",
          icon: <CubeIcon />,
          check: () => assetCount > 0,
        },
        {
          id: "staff",
          label: t("maintenance.onboarding.addTechnician"),
          description: t("maintenance.onboarding.addTechnicianDesc"),
          href: "/maintenance/technicians",
          icon: <Users className="h-4 w-4" />,
          check: () => staffCount > 0,
        },
        {
          id: "task",
          label: t("maintenance.onboarding.createVisit"),
          description: t("maintenance.onboarding.createVisitDesc"),
          href: "/maintenance/visits/new",
          icon: <CalendarPlus className="h-4 w-4" />,
          check: () => taskCount > 0,
        },
      ];

  const completedCount = steps.filter((s) => s.check()).length;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    if (allDone && !isDismissed) {
      const timer = setTimeout(() => handleDismiss(), 5000);
      return () => clearTimeout(timer);
    }
  }, [allDone, isDismissed]);

  if (isDismissed) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {allDone ? t("dashboard.onboarding.allSet") : t("dashboard.onboarding.getStarted")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {allDone
                ? t("dashboard.onboarding.workspaceReady")
                : t("dashboard.onboarding.stepsComplete", { completed: completedCount, total: steps.length })}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={t("dashboard.onboarding.dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-border/50">
        {steps.map((step) => {
          const done = step.check();
          return (
            <Link
              key={step.id}
              to={step.href}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors group"
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  done
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-border text-muted-foreground group-hover:border-primary/50"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!done && (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
