import { describe, it, expect } from "vitest";
import {
  listTransactionsQuery,
  updateTransactionBody,
  transactionIdParams,
} from "./transaction.schema";

describe("listTransactionsQuery", () => {
  it("applies defaults for page=1 and limit=20", () => {
    const out = listTransactionsQuery.parse({});
    expect(out.page).toBe(1);
    expect(out.limit).toBe(20);
  });

  it("coerces string page/limit (Express query) to numbers", () => {
    const out = listTransactionsQuery.parse({ page: "3", limit: "50" });
    expect(out.page).toBe(3);
    expect(out.limit).toBe(50);
  });

  it("rejects limit > 100", () => {
    expect(() => listTransactionsQuery.parse({ limit: "200" })).toThrow();
  });

  it("rejects bad date strings", () => {
    expect(() => listTransactionsQuery.parse({ startDate: "not-a-date" })).toThrow();
  });
});

describe("updateTransactionBody", () => {
  it("requires at least one field", () => {
    expect(() => updateTransactionBody.parse({})).toThrow();
  });

  it("accepts a single-field update", () => {
    expect(updateTransactionBody.parse({ amount: 50000 })).toEqual({ amount: 50000 });
  });

  it("rejects non-positive amount", () => {
    expect(() => updateTransactionBody.parse({ amount: 0 })).toThrow();
    expect(() => updateTransactionBody.parse({ amount: -1 })).toThrow();
  });

  it("rejects non-integer amount", () => {
    expect(() => updateTransactionBody.parse({ amount: 100.5 })).toThrow();
  });

  it("rejects invalid date strings", () => {
    expect(() => updateTransactionBody.parse({ date: "yesterday" })).toThrow();
  });
});

describe("transactionIdParams", () => {
  it("accepts a non-empty short id", () => {
    expect(transactionIdParams.parse({ id: "tx_abc" })).toEqual({ id: "tx_abc" });
  });

  it("rejects empty id", () => {
    expect(() => transactionIdParams.parse({ id: "" })).toThrow();
  });
});
