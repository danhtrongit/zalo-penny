/**
 * A re-uploaded receipt should only be blocked as a duplicate when the prior
 * upload actually produced a transaction. An "orphan" receipt — one whose OCR
 * failed so nothing was recorded — must NOT block, or the user gets
 * "đã nhận trước đó rồi" with no expense ever saved and can never retry.
 */
export function shouldBlockDuplicateReceipt(
  prior: { transactions: { id: string }[] } | null
): boolean {
  return !!prior && prior.transactions.length > 0;
}
