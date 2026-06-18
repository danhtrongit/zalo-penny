import { describe, it, expect } from "vitest";
import { resolveLoadedState } from "./conversation-state.service";

const NOW = 1_700_000_000_000;
const rawState = {
  history: [{ role: "user", text: "ăn trưa 50k", at: "2026-06-18T03:00:00Z" }],
  pendingIntent: "EXPENSE",
  awaitingUserReply: true,
  recentMessageIds: [],
};

describe("resolveLoadedState", () => {
  it("returns empty state when there is no record", () => {
    const s = resolveLoadedState(null, NOW);
    expect(s.history).toHaveLength(0);
    expect(s.pendingIntent).toBeNull();
    expect(s.awaitingUserReply).toBe(false);
  });

  it("keeps history + follow-up flags for a fresh session", () => {
    const s = resolveLoadedState({ state: rawState, lastMessageAt: new Date(NOW) }, NOW);
    expect(s.history).toHaveLength(1);
    expect(s.pendingIntent).toBe("EXPENSE");
    expect(s.awaitingUserReply).toBe(true);
  });

  it("keeps the transcript but clears follow-up flags after 30+ min idle", () => {
    const last = new Date(NOW - 31 * 60 * 1000);
    const s = resolveLoadedState({ state: rawState, lastMessageAt: last }, NOW);
    expect(s.history).toHaveLength(1); // transcript preserved — bot still remembers
    expect(s.pendingIntent).toBeNull(); // volatile follow-up flag expired
    expect(s.awaitingUserReply).toBe(false);
  });

  it("drops the whole transcript after 24h+ idle", () => {
    const last = new Date(NOW - 25 * 60 * 60 * 1000);
    const s = resolveLoadedState({ state: rawState, lastMessageAt: last }, NOW);
    expect(s.history).toHaveLength(0);
  });
});
