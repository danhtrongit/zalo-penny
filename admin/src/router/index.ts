import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: () => import("@/layouts/AdminLayout.vue"),
      meta: { requiresAdmin: true },
      children: [
        { path: "", name: "dashboard", component: () => import("@/pages/DashboardView.vue") },
        { path: "users", name: "users", component: () => import("@/pages/UsersView.vue") },
        { path: "users/:id", name: "user-detail", component: () => import("@/pages/UserDetailView.vue") },
        { path: "plans", name: "plans", component: () => import("@/pages/PlansView.vue") },
        { path: "bots", name: "bots", component: () => import("@/pages/BotsView.vue") },
        { path: "payments", name: "payments", component: () => import("@/pages/PaymentsView.vue") },
        { path: "notifications", name: "notifications", component: () => import("@/pages/NotificationsView.vue") },
        { path: "send", name: "send", component: () => import("@/pages/SendToUsersView.vue") },
        { path: "reminders", name: "reminders", component: () => import("@/pages/RemindersView.vue") },
        { path: "audit", name: "audit", component: () => import("@/pages/AuditView.vue") },
        { path: "settings", name: "settings", component: () => import("@/pages/SettingsView.vue") },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  // Hydrate user once if we have a token but no user yet.
  if (auth.isAuthenticated && !auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      auth.logout();
    }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: "login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : undefined };
  }
  if (to.name === "login" && auth.isAdmin) {
    return { name: "dashboard" };
  }
  return true;
});

export default router;
