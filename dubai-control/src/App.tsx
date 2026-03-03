// dubai-control/src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ScrollToTop from "@/components/layout/ScrollToTop";

/* Product pages */
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import History from "./pages/History";
import Settings from "./pages/Settings";
import CleanerJob from "./pages/CleanerJob";
import NotFound from "./pages/NotFound";
import JobPlanning from "./pages/JobPlanning";
import Locations from "./pages/Locations";
import PricingPage from "./pages/PricingPage";
import Signup from "./pages/Signup";
import Performance from "./pages/Performance";
import Reports from "./pages/Reports";
import ViolationJobsPage from "./pages/ViolationJobsPage";
import ReportEmailLogsPage from "./pages/ReportEmailLogs";
import Analytics from "./pages/Analytics";
import Docs from "./pages/Docs";
import Support from "./pages/Support";
import CompanyProfile from "./pages/company/CompanyProfile";
import CompanyTeam from "./pages/company/CompanyTeam";
import Billing from "./pages/settings/Billing";

/* Maintenance pages */
import MaintenanceDocs from "./contexts/maintenance/pages/Docs";
import MaintenanceSupport from "./contexts/maintenance/pages/Support";
import { TechniciansPage } from "./contexts/maintenance/ui/TechniciansPage";
import MaintenanceDashboard from "./pages/maintenance/Dashboard";
import MaintenanceAssets from "./pages/maintenance/Assets";
import MaintenanceAssetDetail from "./pages/maintenance/AssetDetail";
import MaintenanceAssetTypes from "./pages/maintenance/AssetTypes";
import MaintenanceCalendar from "./pages/maintenance/Calendar";
import MaintenanceChecklists from "./pages/maintenance/Checklists";
import MaintenanceCompany from "./pages/maintenance/Company";
import MaintenanceContracts from "./pages/maintenance/Contracts";
import MaintenanceLocations from "./pages/maintenance/Locations";
import MaintenanceMap from "./pages/maintenance/Map";
import MaintenanceParts from "./pages/maintenance/Parts";
import MaintenanceRecurringTemplates from "./pages/maintenance/RecurringTemplates";
import MaintenanceAnalytics from "./pages/maintenance/Analytics";
import MaintenanceReports from "./pages/maintenance/Reports";
import MaintenanceVisitList from "./pages/maintenance/VisitList";
import MaintenanceVisitDetail from "./pages/maintenance/VisitDetail";
import MaintenanceCreateVisit from "./pages/maintenance/CreateVisit";

/* Contexts */
import { LocationsProvider } from "@/contexts/LocationsContext";
import { AppContextProvider } from "@/contexts/AppContext";

/* Marketing – Platform */
import {
  PlatformLanding,
  Products,
  Contact,
  Updates,
  Principles,
  TermsOfService,
  PrivacyPolicy,
  RefundPolicy,
} from "@/pages/platform";

/* Marketing – Product Landing Pages */
import {
  CleaningLanding,
  MaintenanceLanding,
  PropertyComing,
  FitoutComing,
} from "@/pages/products";

/* Marketing – CleanProof */
import CleanProofLanding from "@/marketing/cleanproof/CleanProofLanding";
import CleanProofDemoRequest from "@/marketing/cleanproof/CleanProofDemoRequest";
import CleanProofContact from "@/marketing/cleanproof/CleanProofContact";
import CleanProofUpdates from "@/marketing/cleanproof/CleanProofUpdates";

import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* глобальный контроль скролла */}
        <ScrollToTop />

        <AppContextProvider>
          <LocationsProvider>
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
              <Route path="/settings/billing" element={<Billing />} />
              <Route path="/company/profile" element={<CompanyProfile />} />
              <Route path="/company/team" element={<CompanyTeam />} />

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
          </LocationsProvider>
        </AppContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
