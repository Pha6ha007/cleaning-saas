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

/* Maintenance pages */
import MaintenanceDocs from "./contexts/maintenance/pages/Docs";
import MaintenanceSupport from "./contexts/maintenance/pages/Support";
import { VisitsPage } from "./contexts/maintenance/ui/VisitsPage";
import { AssetsPage } from "./contexts/maintenance/ui/AssetsPage";
import { TechniciansPage } from "./contexts/maintenance/ui/TechniciansPage";

/* Contexts */
import { LocationsProvider } from "@/contexts/LocationsContext";
import { AppContextProvider } from "@/contexts/AppContext";

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
                Marketing (public)
                ========================= */}
            <Route path="/cleanproof" element={<CleanProofLanding />} />
            <Route path="/cleanproof/demo" element={<CleanProofDemoRequest />} />
            <Route path="/cleanproof/pricing" element={<PricingPage />} />
            <Route path="/cleanproof/updates" element={<CleanProofUpdates />} />
            <Route path="/cleanproof/contact" element={<CleanProofContact />} />
            {/* alias на всякий случай */}
            <Route path="/pricing" element={<PricingPage />} />

            {/* =========================
                Auth
                ========================= */}
            <Route path="/" element={<Login />} />
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

              {/* Maintenance */}
              <Route path="/maintenance/visits" element={<VisitsPage />} />
              <Route path="/maintenance/assets" element={<AssetsPage />} />
              <Route path="/maintenance/technicians" element={<TechniciansPage />} />
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
