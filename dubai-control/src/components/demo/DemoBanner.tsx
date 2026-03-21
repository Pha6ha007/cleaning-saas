// dubai-control/src/components/demo/DemoBanner.tsx
// Shows a sticky banner when the user is in a demo session

import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function DemoBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const isDemo = localStorage.getItem("is_demo") === "true";

  if (!isDemo || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-white text-sm font-medium shadow-sm">
      <Sparkles className="h-4 w-4 flex-shrink-0" />
      <span>
        {t("demo.banner")}{" "}
        <Link to="/login" className="underline underline-offset-2 hover:no-underline font-semibold">
          {t("demo.signUpCta")}
        </Link>{" "}
        {t("demo.createWorkspace")}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-0.5 rounded hover:bg-white/20 transition-colors"
        aria-label={t("dashboard.onboarding.dismiss")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
