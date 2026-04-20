import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import PricingPage from "@/pages/pricing";
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentErrorPage from "@/pages/payment-error";
import DashboardPage from "@/pages/dashboard/index";
import TransactionsPage from "@/pages/dashboard/transactions";
import ReportsPage from "@/pages/dashboard/reports";
import SettingsPage from "@/pages/dashboard/settings";
import ContactPage from "@/pages/dashboard/contact";
import AdminUsersPage from "@/pages/admin/users";
import AdminBroadcastPage from "@/pages/admin/broadcast";
import PrivacyPage from "@/pages/legal/privacy";
import TermsPage from "@/pages/legal/terms";
import ContactLegalPage from "@/pages/legal/contact";
import { AppLayout } from "@/components/layout/app-layout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user || user.role !== "ADMIN") return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/error" element={<PaymentErrorPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/contact" element={<ContactLegalPage />} />

                <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="contact" element={<ContactPage />} />
                </Route>

                <Route path="/admin" element={<AdminRoute><AppLayout /></AdminRoute>}>
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="broadcast" element={<AdminBroadcastPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
