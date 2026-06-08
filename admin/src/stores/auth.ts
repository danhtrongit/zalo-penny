import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api, TOKEN_KEY } from "@/lib/api";
import type { AuthUser, LoginResponse } from "@/types/api";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AuthUser | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => !!user.value && user.value.role === "ADMIN");

  function setToken(value: string | null) {
    token.value = value;
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Log in and require ADMIN role. Non-admins are rejected and no token is
   * persisted (the admin portal is admin-only).
   */
  async function login(phone: string, password: string): Promise<void> {
    const { data } = await api.post<LoginResponse>("/auth/login", { phone, password });
    if (data.user.role !== "ADMIN") {
      throw new Error("Tài khoản không có quyền admin");
    }
    setToken(data.token);
    user.value = data.user;
  }

  /** Re-hydrate the current user from the token (called on app boot). */
  async function fetchMe(): Promise<void> {
    if (!token.value) return;
    const { data } = await api.get<AuthUser>("/auth/me");
    user.value = data;
  }

  function logout(): void {
    setToken(null);
    user.value = null;
  }

  return { token, user, isAuthenticated, isAdmin, login, fetchMe, logout };
});
