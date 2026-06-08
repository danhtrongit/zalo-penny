import type { GlobalThemeOverrides } from "naive-ui";
import {
  PRIMARY,
  PRIMARY_HOVER,
  PRIMARY_PRESSED,
  PRIMARY_SUPPL,
  RADIUS,
  FONT_FAMILY,
  FONT_FAMILY_MONO,
} from "./tokens";

/**
 * Build Naive UI theme overrides for the Penny brand (deep green).
 * Works for both light and dark base themes; the same primary palette applies.
 */
export function buildThemeOverrides(_isDark: boolean): GlobalThemeOverrides {
  return {
    common: {
      primaryColor: PRIMARY,
      primaryColorHover: PRIMARY_HOVER,
      primaryColorPressed: PRIMARY_PRESSED,
      primaryColorSuppl: PRIMARY_SUPPL,
      borderRadius: RADIUS,
      borderRadiusSmall: "8px",
      fontFamily: FONT_FAMILY,
      fontFamilyMono: FONT_FAMILY_MONO,
    },
    Button: {
      textColorPrimary: "#ffffff",
      textColorHoverPrimary: "#ffffff",
      textColorPressedPrimary: "#ffffff",
      textColorFocusPrimary: "#ffffff",
    },
  };
}
