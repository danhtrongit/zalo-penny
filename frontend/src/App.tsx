import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InAppBrowserGuard } from "@/components/in-app-browser-guard";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import PricingPage from "@/pages/pricing";
import OnboardingPage from "@/pages/onboarding";
import PaymentErrorPage from "@/pages/payment-error";
import DashboardPage from "@/pages/dashboard/index";
import TransactionsPage from "@/pages/dashboard/transactions";
import ReportsPage from "@/pages/dashboard/reports";
import SettingsPage from "@/pages/dashboard/settings";
import ContactPage from "@/pages/dashboard/contact";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminRoute } from "@/components/auth/admin-route";
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";
import AdminUserDetailPage from "@/pages/admin/user-detail";
import AdminPlansPage from "@/pages/admin/plans";
import AdminBotsPage from "@/pages/admin/bots";
import AdminPaymentsPage from "@/pages/admin/payments";
import AdminNotificationsPage from "@/pages/admin/notifications";
import AdminAuditPage from "@/pages/admin/audit";
import PrivacyPage from "@/pages/legal/privacy";
import TermsPage from "@/pages/legal/terms";
import ContactLegalPage from "@/pages/legal/contact";
import { AppLayout } from "@/components/layout/app-layout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const conn = user.botConnection;
  const connected = conn ? conn.isActive || conn.status === "LINKED" : false;
  const needsOnboarding = user.subscription?.status === "ACTIVE" && !connected;
  const onboardingSafe =
    location.pathname === "/onboarding" ||
    location.pathname === "/dashboard/contact";
  if (needsOnboarding && !onboardingSafe) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <InAppBrowserGuard>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment/success" element={<Navigate to="/onboarding" replace />} />
                <Route path="/payment/error" element={<PaymentErrorPage />} />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />
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

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="users/:id" element={<AdminUserDetailPage />} />
                  <Route path="plans" element={<AdminPlansPage />} />
                  <Route path="bots" element={<AdminBotsPage />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="notifications" element={<AdminNotificationsPage />} />
                  <Route path="audit" element={<AdminAuditPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster />
          </AuthProvider>
          </InAppBrowserGuard>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
