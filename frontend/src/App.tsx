import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import PrivacyPage from "@/pages/legal/privacy";
import TermsPage from "@/pages/legal/terms";
import ContactLegalPage from "@/pages/legal/contact";
import { AppLayout } from "@/components/layout/app-layout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  // No forced onboarding. Users reach the dashboard directly and connect their
  // Zalo bot from Settings; /onboarding stays an opt-in flow (after payment /
  // free activation). The old guard trapped any account whose bot wasn't LINKED.
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

                {/* Admin moved to its own SPA at https://admin.pennybot.vn
                    (nginx 301-redirects /admin there). */}
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
