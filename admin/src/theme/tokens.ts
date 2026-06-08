// Brand palette. Source of truth is oklch (see styles/global.css); these hex
// equivalents are used for Naive UI theme tokens because Naive UI's internal
// color math (seemly) cannot parse oklch() and would break derived states.
//
//   PRIMARY         = oklch(0.403 0.106 152.2)
//   PRIMARY_HOVER   = oklch(0.462 0.123 151.6)
//   PRIMARY_PRESSED = oklch(0.316 0.081 153.4)
//   PRIMARY_SUPPL   = oklch(0.525 0.138 152.2)
export const PRIMARY = "#00582a";
export const PRIMARY_HOVER = "#006b33";
export const PRIMARY_PRESSED = "#003d1d";
export const PRIMARY_SUPPL = "#008040";

// Lighter brand green used as a secondary chart series (oklch(0.695 0.153 155.3)).
export const CHART_ACCENT = "#33b872";

export const RADIUS = "10px";
export const FONT_FAMILY =
  "'Manrope Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const FONT_FAMILY_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
