import { Outlet } from "react-router-dom";
import { AppHeader } from "./app-header";
import { BottomNav } from "./bottom-nav";
import { ErrorBoundary } from "@/components/error-boundary";

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-background">
      <AppHeader />
      <main className="flex-1 px-5 pb-24 sm:px-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <BottomNav />
    </div>
  );
}
