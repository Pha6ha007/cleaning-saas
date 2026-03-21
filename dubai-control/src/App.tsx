// dubai-control/src/App.tsx

import { lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { SuspenseFallback } from "@/components/layout/SuspenseFallback";

/* Eager — above the fold / auth shell (must not lazy-load) */
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PricingPage from "./pages/PricingPage";
import NotFound from "./pages/NotFound";
import CleanerJob from "./pages/CleanerJob";

/* Contexts (always needed, keep eager) */
import { LocationsProvider } from "@/contexts/LocationsContext";
import { AppContextProvider } from "@/contexts/AppContext";

/* Lazy — CleanProof app pages */
const Dashboard        = lazy(() => import("./pages/Dashboard"));
const Jobs             = lazy(() => import("./pages/Jobs"));
const JobDetails       = lazy(() => import("./pages/JobDetails"));
const JobPlanning      = lazy(() => import("./pages/JobPlanning"));
const History          = lazy(() => import("./pages/History"));
const Performance      = lazy(() => import("./pages/Performance"));
const Reports          = lazy(() => import("./pages/Reports"));
const ViolationJobsPage      = lazy(() => import("./pages/ViolationJobsPage"));
const ReportEmailLogsPage    = lazy(() => import("./pages/ReportEmailLogs"));
const Analytics        = lazy(() => import("./pages/Analytics"));
const Docs             = lazy(() => import("./pages/Docs"));
const Support          = lazy(() => import("./pages/Support"));
const Settings         = lazy(() => import("./pages/Settings"));
const Locations        = lazy(() => import("./pages/Locations"));
const CompanyProfile   = lazy(() => import("./pages/company/CompanyProfile"));
const CompanyTeam      = lazy(() => import("./pages/company/CompanyTeam"));
const BranchesPage     = lazy(() => import("./pages/company/Branches"));
const Billing          = lazy(() => import("./pages/settings/Billing"));
const AccountSettings  = lazy(() => import("./pages/settings/AccountSettings"));
const SchedulingPage   = lazy(() => import("./pages/Scheduling"));
const AuditLogPage     = lazy(() => import("./pages/AuditLog"));

/* Lazy — Maintenance app pages (separate chunk group) */
const MaintenanceDashboard         = lazy(() => import("./pages/maintenance/Dashboard"));
const MaintenanceVisitList         = lazy(() => import("./pages/maintenance/VisitList"));
const MaintenanceCreateVisit       = lazy(() => import("./pages/maintenance/CreateVisit"));
const MaintenanceVisitDetail       = lazy(() => import("./pages/maintenance/VisitDetail"));
const MaintenanceAssets            = lazy(() => import("./pages/maintenance/Assets"));
const MaintenanceAssetDetail       = lazy(() => import("./pages/maintenance/AssetDetail"));
const MaintenanceAssetTypes        = lazy(() => import("./pages/maintenance/AssetTypes"));
const MaintenanceCalendar          = lazy(() => import("./pages/maintenance/Calendar"));
const MaintenanceChecklists        = lazy(() => import("./pages/maintenance/Checklists"));
const MaintenanceCompany           = lazy(() => import("./pages/maintenance/Company"));
const MaintenanceContracts         = lazy(() => import("./pages/maintenance/Contracts"));
const MaintenanceLocations         = lazy(() => import("./pages/maintenance/Locations"));
const MaintenanceMap               = lazy(() => import("./pages/maintenance/Map"));
const MaintenanceParts             = lazy(() => import("./pages/maintenance/Parts"));
const MaintenanceRecurringTemplates = lazy(() => import("./pages/maintenance/RecurringTemplates"));
const MaintenanceAnalytics         = lazy(() => import("./pages/maintenance/Analytics"));
const MaintenanceReports           = lazy(() => import("./pages/maintenance/Reports"));
const MaintenanceDocs              = lazy(() => import("./contexts/maintenance/pages/Docs"));
const MaintenanceSupport           = lazy(() => import("./contexts/maintenance/pages/Support"));
const TechniciansPage              = lazy(() =>
  import("./contexts/maintenance/ui/TechniciansPage").then(m => ({ default: m.TechniciansPage }))
);

/* Lazy — Marketing / Platform (rarely visited after first load) */
const PlatformLanding   = lazy(() => import("@/pages/platform").then(m => ({ default: m.PlatformLanding })));
const Products          = lazy(() => import("@/pages/platform").then(m => ({ default: m.Products })));
const Contact           = lazy(() => import("@/pages/platform").then(m => ({ default: m.Contact })));
const Updates           = lazy(() => import("@/pages/platform").then(m => ({ default: m.Updates })));
const Principles        = lazy(() => import("@/pages/platform").then(m => ({ default: m.Principles })));
const TermsOfService    = lazy(() => import("@/pages/platform").then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy     = lazy(() => import("@/pages/platform").then(m => ({ default: m.PrivacyPolicy })));
const RefundPolicy      = lazy(() => import("@/pages/platform").then(m => ({ default: m.RefundPolicy })));

const CleaningLanding   = lazy(() => import("@/pages/products").then(m => ({ default: m.CleaningLanding })));
const MaintenanceLanding = lazy(() => import("@/pages/products").then(m => ({ default: m.MaintenanceLanding })));
const PropertyComing    = lazy(() => import("@/pages/products").then(m => ({ default: m.PropertyComing })));
const FitoutComing      = lazy(() => import("@/pages/products").then(m => ({ default: m.FitoutComing })));

/* Removed: CleanProofLanding, CleanProofDemoRequest, CleanProofContact, CleanProofUpdates
   were imported but never used in any route (dead code). Legacy /cleanproof/* routes
   redirect to platform pages via <Navigate>. */

import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

/**
 * Minimal fallback shown when the entire app crashes (ErrorBoundary).
 * Provides a reload button and error reporting — avoids a blank white screen.
 */
const SentryFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center space-y-4 p-8 max-w-md">
      <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        An unexpected error occurred. The error has been reported automatically.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Reload page
      </button>
    </div>
  </div>
);

const App = () => (
  <Sentry.ErrorBoundary fallback={<SentryFallback />} showDialog={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* глобальный контроль скролла */}
        <ScrollToTop />

        <AppContextProvider>
          <LocationsProvider>
            <Suspense fallback={<SuspenseFallback />}>
            <Routes>
            {/* =========================
                Platform Marketing (public)
                ========================= */}
            <Route path="/" element={<PlatformLanding />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/cleaning" element={<CleaningLanding />} />
            <Route path="/products/maintenance" element={<MaintenanceLanding />} />
            <Route path="/products/property" element={<PropertyComing />} />
            <Route path="/products/fitout" element={<FitoutComing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/principles" element={<Principles />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* Legal pages */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund" element={<RefundPolicy />} />

            {/* =========================
                Legacy Redirects (CleanProof)
                ========================= */}
            <Route path="/cleanproof" element={<Navigate to="/products/cleaning" replace />} />
            <Route path="/cleanproof/pricing" element={<Navigate to="/pricing" replace />} />
            <Route path="/cleanproof/demo" element={<Navigate to="/contact" replace />} />
            <Route path="/cleanproof/updates" element={<Navigate to="/updates" replace />} />
            <Route path="/cleanproof/contact" element={<Navigate to="/contact" replace />} />

            {/* =========================
                Auth
                ========================= */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* =========================
                Protected app (with layout)
                ========================= */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />

              {/* create-job считается легаси: всегда ведём в Job Planning */}
              <Route
                path="/create-job"
                element={<Navigate to="/planning" replace />}
              />

              <Route path="/planning" element={<JobPlanning />} />
              <Route path="/history" element={<History />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/reports" element={<Reports />} />
              <Route
                path="/reports/violations"
                element={<ViolationJobsPage />}
              />
              <Route
                path="/reports/email-logs"
                element={<ReportEmailLogsPage />}
              />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/new" element={<Locations />} />
              <Route path="/locations/:id" element={<Locations />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:page" element={<Docs />} />
              <Route path="/support" element={<Support />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/billing" element={<Billing />} />
              <Route path="/company/profile" element={<CompanyProfile />} />
              <Route path="/company/team" element={<CompanyTeam />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/scheduling" element={<SchedulingPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />

              {/* Maintenance */}
              <Route path="/maintenance/dashboard" element={<MaintenanceDashboard />} />
              <Route path="/maintenance/visits" element={<MaintenanceVisitList />} />
              <Route path="/maintenance/visits/new" element={<MaintenanceCreateVisit />} />
              <Route path="/maintenance/visits/:id" element={<MaintenanceVisitDetail />} />
              <Route path="/maintenance/assets" element={<MaintenanceAssets />} />
              <Route path="/maintenance/assets/:id" element={<MaintenanceAssetDetail />} />
              <Route path="/maintenance/asset-types" element={<MaintenanceAssetTypes />} />
              <Route path="/maintenance/technicians" element={<TechniciansPage />} />
              <Route path="/maintenance/calendar" element={<MaintenanceCalendar />} />
              <Route path="/maintenance/schedules" element={<MaintenanceRecurringTemplates />} />
              <Route path="/maintenance/contracts" element={<MaintenanceContracts />} />
              <Route path="/maintenance/locations" element={<MaintenanceLocations />} />
              <Route path="/maintenance/locations/:id" element={<MaintenanceLocations />} />
              <Route path="/maintenance/checklists" element={<MaintenanceChecklists />} />
              <Route path="/maintenance/parts" element={<MaintenanceParts />} />
              <Route path="/maintenance/map" element={<MaintenanceMap />} />
              <Route path="/maintenance/company" element={<MaintenanceCompany />} />
              <Route path="/maintenance/analytics" element={<MaintenanceAnalytics />} />
              <Route path="/maintenance/reports" element={<MaintenanceReports />} />
              <Route path="/maintenance/docs" element={<MaintenanceDocs />} />
              <Route path="/maintenance/docs/:page" element={<MaintenanceDocs />} />
              <Route path="/maintenance/support" element={<MaintenanceSupport />} />
            </Route>

            {/* =========================
                Cleaner interface (standalone)
                ========================= */}
            <Route path="/cleaner" element={<CleanerJob />} />

            {/* =========================
                Catch-all
                ========================= */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </LocationsProvider>
        </AppContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
