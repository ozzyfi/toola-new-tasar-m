import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import WorkOrders from "./pages/app/WorkOrders";
import NewWorkOrder from "./pages/app/NewWorkOrder";
import WorkOrderDetail from "./pages/app/WorkOrderDetail";
import ManagerDashboard from "./pages/app/ManagerDashboard";
import Machines from "./pages/app/Machines";
import MachineDetail from "./pages/app/MachineDetail";
import Technicians from "./pages/app/Technicians";
import Memory from "./pages/app/Memory";
import DiagnosisHistory from "./pages/app/DiagnosisHistory";
import RepairVideos from "./pages/app/RepairVideos";
import MachineLogs from "./pages/app/MachineLogs";
import PowReports from "./pages/app/PowReports";
import MasterProfiles from "./pages/app/MasterProfiles";
import Users from "./pages/app/Users";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<WorkOrders />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="work-orders/new" element={<NewWorkOrder />} />
              <Route path="work-orders/:id" element={<WorkOrderDetail />} />

              {/* Technician + manager */}
              <Route path="memory" element={<Memory />} />
              <Route path="diagnosis" element={<DiagnosisHistory />} />
              <Route path="sop" element={<RepairVideos />} />
              <Route path="logs" element={<MachineLogs />} />

              {/* Manager */}
              <Route path="manager" element={<ProtectedRoute requireManager><ManagerDashboard /></ProtectedRoute>} />
              <Route path="machines" element={<ProtectedRoute requireManager><Machines /></ProtectedRoute>} />
              <Route path="machines/:id" element={<ProtectedRoute requireManager><MachineDetail /></ProtectedRoute>} />
              <Route path="technicians" element={<ProtectedRoute requireManager><Technicians /></ProtectedRoute>} />
              <Route path="manager/reports" element={<ProtectedRoute requireManager><PowReports /></ProtectedRoute>} />
              <Route path="manager/masters" element={<ProtectedRoute requireManager><MasterProfiles /></ProtectedRoute>} />
              <Route path="manager/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
