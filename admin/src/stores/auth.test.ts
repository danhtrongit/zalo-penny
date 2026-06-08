import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/lib/api", () => ({
  api: { post: vi.fn(), get: vi.fn() },
  TOKEN_KEY: "penny_admin_token",
}));

// The auth store uses localStorage; provide an in-memory stub so the test does
// not depend on a DOM environment.
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});

import { api, TOKEN_KEY } from "@/lib/api";
import { useAuthStore } from "./auth";

const post = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  setActivePinia(createPinia());
  mem.clear();
  vi.clearAllMocks();
});

describe("auth store", () => {
  it("persists token + user when an ADMIN logs in", async () => {
    post.mockResolvedValue({
      data: { token: "T", user: { id: "a", role: "ADMIN", name: "An", phone: "0900", email: null, createdAt: "" } },
    });
    const auth = useAuthStore();
    await auth.login("0900", "pw");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("T");
    expect(auth.isAdmin).toBe(true);
  });

  it("rejects a non-admin and stores no token", async () => {
    post.mockResolvedValue({
      data: { token: "T", user: { id: "u", role: "USER", name: "U", phone: "0901", email: null, createdAt: "" } },
    });
    const auth = useAuthStore();
    await expect(auth.login("0901", "pw")).rejects.toThrow(/quyền admin/);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(auth.isAdmin).toBe(false);
  });

  it("logout clears token + user", () => {
    mem.set(TOKEN_KEY, "T");
    const auth = useAuthStore();
    auth.logout();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(auth.isAdmin).toBe(false);
  });
});
