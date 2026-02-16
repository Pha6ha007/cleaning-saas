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
import SettingsHome from "./pages/settings/SettingsHome";
import AccountSettings from "./pages/settings/AccountSettings";
import Billing from "./pages/settings/Billing";
import CompanyProfile from "./pages/company/CompanyProfile";
import CompanyTeam from "./pages/company/CompanyTeam";
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

/* Maintenance Context Pages */
import MaintenanceDashboard from "./pages/maintenance/Dashboard";
import Assets from "./pages/maintenance/Assets";
import AssetDetail from "./pages/maintenance/AssetDetail";
import AssetTypes from "./pages/maintenance/AssetTypes";
import VisitList from "./pages/maintenance/VisitList";
import CreateVisit from "./pages/maintenance/CreateVisit";
import VisitDetail from "./pages/maintenance/VisitDetail";
import { TechniciansPage } from "./contexts/maintenance/ui/TechniciansPage";
import MaintenanceAnalytics from "./pages/maintenance/Analytics";
import MaintenanceReports from "./pages/maintenance/Reports";
import RecurringTemplates from "./pages/maintenance/RecurringTemplates";
import Contracts from "./pages/maintenance/Contracts";
import Parts from "./pages/maintenance/Parts";
import Checklists from "./pages/maintenance/Checklists";
import AssetQRPrint from "./pages/maintenance/AssetQRPrint";
import AssetQuickAccess from "./pages/maintenance/AssetQuickAccess";
import MaintenanceCalendar from "./pages/maintenance/Calendar";
import MaintenanceMap from "./pages/maintenance/Map";

/* Customer Portal Pages (Stage 16) */
import CustomerLayout from "./pages/customer/CustomerLayout";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerAssets from "./pages/customer/CustomerAssets";
import CustomerVisits from "./pages/customer/CustomerVisits";
import CustomerVisitDetail from "./pages/customer/CustomerVisitDetail";
import CustomerContracts from "./pages/customer/CustomerContracts";
import CustomerLocations from "./pages/customer/CustomerLocations";

/* Contexts */
import { LocationsProvider } from "@/contexts/LocationsContext";
import { AppContextProvider } from "@/contexts/AppContext";

/* Marketing – CleanProof */
import CleanProofLanding from "@/marketing/cleanproof/CleanProofLanding";
import CleanProofDemoRequest from "@/marketing/cleanproof/CleanProofDemoRequest";
import CleanProofContact from "@/marketing/cleanproof/CleanProofContact";
import CleanProofUpdates from "@/marketing/cleanproof/CleanProofUpdates";

/* PWA */
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";

import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* PWA Install Banner (Stage 12) */}
      <PWAInstallBanner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* Global scroll control */}
        <ScrollToTop />

        <LocationsProvider>
          <Routes>
            {/* =========================
                Marketing (public)
                ========================= */}
            <Route path="/cleanproof" element={<CleanProofLanding />} />
            <Route path="/cleanproof/demo" element={<CleanProofDemoRequest />} />
            <Route path="/cleanproof/pricing" element={<PricingPage />} />
            <Route path="/cleanproof/updates" element={<CleanProofUpdates />} />
            <Route path="/cleanproof/contact" element={<CleanProofContact />} />
            {/* alias */}
            <Route path="/pricing" element={<PricingPage />} />

            {/* =========================
                Auth
                ========================= */}
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* =========================
                Protected app (with layout + context)
                ========================= */}
            <Route
              element={
                <AppContextProvider>
                  <AppLayout />
                </AppContextProvider>
              }
            >
              {/* -------------------------
                  Cleaning Context Routes
                  (existing paths, unchanged)
                  ------------------------- */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />

              {/* Legacy redirect: create-job → planning */}
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

              {/* -------------------------
                  Maintenance Context Routes
                  (all under /maintenance/*)
                  ------------------------- */}
              <Route path="/maintenance/dashboard" element={<MaintenanceDashboard />} />
              <Route path="/maintenance/visits" element={<VisitList />} />
              <Route path="/maintenance/visits/new" element={<CreateVisit />} />
              <Route path="/maintenance/visits/:id" element={<VisitDetail />} />
              {/* Calendar View (Stage 11) */}
              <Route path="/maintenance/calendar" element={<MaintenanceCalendar />} />
              {/* Map View (Stage 13) */}
              <Route path="/maintenance/map" element={<MaintenanceMap />} />
              <Route path="/maintenance/assets" element={<Assets />} />
              <Route path="/maintenance/assets/new" element={<Assets />} />
              <Route path="/maintenance/assets/:id" element={<AssetDetail />} />
              <Route path="/maintenance/asset-types" element={<AssetTypes />} />
              {/* Maintenance Technicians (S2-P1) */}
              <Route path="/maintenance/technicians" element={<TechniciansPage />} />
              {/* Maintenance Analytics (S2-P2) */}
              <Route path="/maintenance/analytics" element={<MaintenanceAnalytics />} />
              {/* Maintenance Reports (S2-P3) */}
              <Route path="/maintenance/reports" element={<MaintenanceReports />} />
              {/* Recurring Schedules (Stage 3) */}
              <Route path="/maintenance/schedules" element={<RecurringTemplates />} />
              {/* Service Contracts (Stage 5 Lite) */}
              <Route path="/maintenance/contracts" element={<Contracts />} />
              {/* Parts Catalog (Stage 7) */}
              <Route path="/maintenance/parts" element={<Parts />} />
              {/* Checklists (Stage 9) */}
              <Route path="/maintenance/checklists" element={<Checklists />} />
              {/* QR Print Page (Stage 8) */}
              <Route path="/maintenance/assets/:id/qr" element={<AssetQRPrint />} />

              {/* Legacy /assets redirect to maintenance context */}
              <Route
                path="/assets"
                element={<Navigate to="/maintenance/assets" replace />}
              />
              <Route
                path="/assets/new"
                element={<Navigate to="/maintenance/assets/new" replace />}
              />
              <Route
                path="/assets/:id"
                element={<Navigate to="/maintenance/assets/:id" replace />}
              />

              {/* -------------------------
                  Shared Routes
                  (accessible from any context)
                  ------------------------- */}
              <Route path="/company/profile" element={<CompanyProfile />} />
              <Route path="/company/team" element={<CompanyTeam />} />
              <Route path="/settings" element={<SettingsHome />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/billing" element={<Billing />} />
            </Route>

            {/* =========================
                Cleaner interface (standalone)
                ========================= */}
            <Route path="/cleaner" element={<CleanerJob />} />

            {/* =========================
                Customer Portal (Stage 16)
                ========================= */}
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<CustomerDashboard />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="assets" element={<CustomerAssets />} />
              <Route path="visits" element={<CustomerVisits />} />
              <Route path="visits/:id" element={<CustomerVisitDetail />} />
              <Route path="contracts" element={<CustomerContracts />} />
              <Route path="locations" element={<CustomerLocations />} />
            </Route>

            {/* =========================
                QR Quick Access (standalone mobile)
                ========================= */}
            <Route path="/maintenance/qr/:id" element={<AssetQuickAccess />} />

            {/* =========================
                Catch-all
                ========================= */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LocationsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
