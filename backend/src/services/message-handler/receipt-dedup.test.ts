import { describe, it, expect } from "vitest";
import { shouldBlockDuplicateReceipt } from "./receipt-dedup";

describe("shouldBlockDuplicateReceipt", () => {
  it("does not block when there is no prior receipt", () => {
    expect(shouldBlockDuplicateReceipt(null)).toBe(false);
  });

  it("does NOT block an orphan receipt (OCR failed, nothing recorded) — user must be able to retry", () => {
    expect(shouldBlockDuplicateReceipt({ transactions: [] })).toBe(false);
  });

  it("blocks only when the prior upload actually produced a transaction", () => {
    expect(shouldBlockDuplicateReceipt({ transactions: [{ id: "t1" }] })).toBe(true);
  });
});
