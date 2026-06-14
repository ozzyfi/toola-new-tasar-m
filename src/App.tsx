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
import Technicians from "./pages/app/Technicians";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public landing (unchanged iframe) */}
            <Route path="/" element={<Index />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated app */}
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
              <Route
                path="manager"
                element={
                  <ProtectedRoute requireManager>
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="machines"
                element={
                  <ProtectedRoute requireManager>
                    <Machines />
                  </ProtectedRoute>
                }
              />
              <Route
                path="technicians"
                element={
                  <ProtectedRoute requireManager>
                    <Technicians />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
