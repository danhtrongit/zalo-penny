import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  buildCheckoutFields,
  computeIpnSignature,
  extractSignature,
  signCheckoutFields,
  verifyIpnSignature,
} from "./payment.service";

// Tests assume SEPAY_SECRET_KEY = "test-sepay-secret" from src/test/setup.ts.
const SECRET = "test-sepay-secret";

describe("payment.service / IPN signature", () => {
  it("computeIpnSignature matches an independent HMAC-SHA256", () => {
    const body = JSON.stringify({ foo: "bar", n: 42 });
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(body, "utf8")
      .digest("base64");
    expect(computeIpnSignature(body)).toBe(expected);
  });

  it("verifyIpnSignature returns true for a correct signature", () => {
    const body = JSON.stringify({ notification_type: "ORDER_PAID" });
    const sig = computeIpnSignature(body);
    expect(verifyIpnSignature(body, sig)).toBe(true);
  });

  it("verifyIpnSignature returns false for a tampered body", () => {
    const body = JSON.stringify({ amount: 100 });
    const sig = computeIpnSignature(body);
    const tampered = JSON.stringify({ amount: 9999 });
    expect(verifyIpnSignature(tampered, sig)).toBe(false);
  });

  it("verifyIpnSignature returns false when the signature is the wrong length", () => {
    // crypto.timingSafeEqual requires equal-length buffers; the implementation
    // must short-circuit instead of throwing.
    expect(verifyIpnSignature("body", "short")).toBe(false);
  });

  it("verifyIpnSignature returns false for a totally different signature", () => {
    const body = "{}";
    const sig = computeIpnSignature(body);
    const wrong = Buffer.alloc(sig.length, "x").toString();
    expect(verifyIpnSignature(body, wrong)).toBe(false);
  });
});

describe("payment.service / signature header extraction", () => {
  it("reads x-sepay-signature first", () => {
    const sig = extractSignature({
      "x-sepay-signature": "primary",
      "x-signature": "fallback",
    });
    expect(sig).toBe("primary");
  });

  it("falls back through x-signature and signature", () => {
    expect(extractSignature({ "x-signature": "secondary" })).toBe("secondary");
    expect(extractSignature({ signature: "tertiary" })).toBe("tertiary");
  });

  it("returns null when no signature header is present", () => {
    expect(extractSignature({ "user-agent": "curl" })).toBeNull();
  });

  it("ignores non-string header values (multi-value headers, etc.)", () => {
    expect(extractSignature({ "x-sepay-signature": ["a", "b"] })).toBeNull();
  });

  it("trims whitespace around the signature", () => {
    expect(extractSignature({ "x-sepay-signature": "  abc  " })).toBe("abc");
  });
});

describe("payment.service / checkout signing", () => {
  it("buildCheckoutFields renders the expected payload", () => {
    const fields = buildCheckoutFields({
      merchantId: "M",
      planName: "Pro",
      amount: 89000,
      invoiceNumber: "INV-1",
      customerId: "u_1",
      frontendUrl: "https://app.example",
    });

    expect(fields).toMatchObject({
      merchant: "M",
      currency: "VND",
      operation: "PURCHASE",
      order_amount: "89000",
      order_invoice_number: "INV-1",
      order_description: "Penny - Pro",
      customer_id: "u_1",
      success_url: "https://app.example/payment/success",
      error_url: "https://app.example/payment/error",
      cancel_url: "https://app.example/pricing",
    });
  });

  it("signCheckoutFields produces a stable signature for the same input", () => {
    const fields = buildCheckoutFields({
      merchantId: "M",
      planName: "Pro",
      amount: 89000,
      invoiceNumber: "INV-1",
      customerId: "u_1",
      frontendUrl: "https://app.example",
    });
    expect(signCheckoutFields(fields)).toBe(signCheckoutFields(fields));
  });

  it("signCheckoutFields changes when a signed field changes", () => {
    const a = buildCheckoutFields({
      merchantId: "M",
      planName: "Pro",
      amount: 89000,
      invoiceNumber: "INV-1",
      customerId: "u_1",
      frontendUrl: "https://app.example",
    });
    const b = buildCheckoutFields({
      merchantId: "M",
      planName: "Pro",
      amount: 99000, // different
      invoiceNumber: "INV-1",
      customerId: "u_1",
      frontendUrl: "https://app.example",
    });
    expect(signCheckoutFields(a)).not.toBe(signCheckoutFields(b));
  });

  it("signCheckoutFields ignores unknown fields (only SIGNABLE_FIELDS are signed)", () => {
    const fields = buildCheckoutFields({
      merchantId: "M",
      planName: "Pro",
      amount: 89000,
      invoiceNumber: "INV-1",
      customerId: "u_1",
      frontendUrl: "https://app.example",
    });
    const withExtra = { ...fields, attacker_field: "lol" };
    expect(signCheckoutFields(withExtra)).toBe(signCheckoutFields(fields));
  });
});
