// The link code shown on the web is `PENNY-XXXX` where XXXX is 4 chars from an
// unambiguous alphabet (no 0/1/I/O). Non-technical users paste or hand-type it
// in Zalo with assorted noise — lowercase, missing dash, a stray space, or just
// the 4-char core. This normalizes such input to the canonical `PENNY-XXXX` form
// so the matcher in tryLinkPoolUser is forgiving. Returns null when the message
// is not plausibly a link code (so ordinary chat isn't misread as one).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CORE_RE = new RegExp(`^[${CODE_ALPHABET}]{4}$`);

export function extractLinkCode(text: string): string | null {
  if (!text) return null;
  let s = text.trim().toUpperCase();
  if (!s) return null;
  // Drop separators users add around the code (spaces, dashes)...
  s = s.replace(/[\s-]+/g, "");
  // ...and an optional PENNY prefix, leaving just the 4-char core.
  s = s.replace(/^PENNY/, "");
  if (!CORE_RE.test(s)) return null;
  return `PENNY-${s}`;
}
