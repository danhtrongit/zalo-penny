import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./admin-sidebar";

export function AdminLayout() {
  return (
    <div className="grid min-h-svh grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="border-b bg-card md:border-b-0 md:border-r">
        <div className="border-b p-3">
          <p className="font-heading text-base font-bold">Penny Admin</p>
        </div>
        <AdminSidebar />
      </aside>
      <main className="bg-background p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
