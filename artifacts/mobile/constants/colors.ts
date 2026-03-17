/**
 * FILE: constants/colors.ts
 * ROLE: Central design token file for the entire app.
 * WHY: A single source of truth for colours prevents drift between screens
 *      and makes a future theme change a one-file edit.
 *
 * PALETTE RATIONALE: Deep navy + electric blue + alert-red.
 * - Dark navy base conveys authority and trust (legal/financial context).
 * - Electric blue accent drives actions and links (high contrast, accessible).
 * - Alert red flags discrepancies — the core signal of the app.
 * - Amber for medium-confidence OCR warnings (not critical, needs review).
 */

const palette = {
  navy900:  "#0A0F1E",
  navy800:  "#0F1729",
  navy700:  "#141E35",
  navy600:  "#1C2A46",
  navy500:  "#253354",
  navy400:  "#2E3F63",

  blue500:  "#3B82F6",
  blue400:  "#60A5FA",
  blue300:  "#93C5FD",

  red500:   "#EF4444",
  red400:   "#F87171",
  red100:   "#FEE2E2",

  amber500: "#F59E0B",
  amber400: "#FBBF24",
  amber100: "#FEF3C7",

  green500: "#10B981",
  green400: "#34D399",
  green100: "#D1FAE5",

  white:    "#FFFFFF",
  grey100:  "#F9FAFB",
  grey200:  "#E5E7EB",
  grey400:  "#9CA3AF",
  grey500:  "#6B7280",
  grey600:  "#4B5563",
  grey700:  "#374151",
  grey800:  "#1F2937",
};

const Colors = {
  dark: {
    navy800:          palette.navy800,
    background:       palette.navy900,
    backgroundSecondary: palette.navy800,
    surface:          palette.navy700,
    surfaceElevated:  palette.navy600,
    border:           palette.navy500,
    borderSubtle:     palette.navy400,

    text:             palette.white,
    textSecondary:    palette.grey400,
    textMuted:        palette.grey500,

    primary:          palette.blue500,
    primaryLight:     palette.blue400,
    primarySubtle:    palette.navy600,

    flagHigh:         palette.red500,
    flagMedium:       palette.amber500,
    flagLow:          palette.green500,
    flagHighBg:       "rgba(239,68,68,0.12)",
    flagMediumBg:     "rgba(245,158,11,0.12)",
    flagLowBg:        "rgba(16,185,129,0.12)",

    tabBar:           palette.navy800,
    tint:             palette.blue500,
    tabIconDefault:   palette.grey500,
    tabIconSelected:  palette.blue400,

    cardShadow:       "rgba(0,0,0,0.4)",
  },
  light: {
    background:       "#F8FAFC",
    backgroundSecondary: "#FFFFFF",
    surface:          "#FFFFFF",
    surfaceElevated:  "#F1F5F9",
    border:           "#E2E8F0",
    borderSubtle:     "#F1F5F9",

    text:             "#0F172A",
    textSecondary:    "#475569",
    textMuted:        "#94A3B8",

    primary:          palette.blue500,
    primaryLight:     palette.blue400,
    primarySubtle:    "#EFF6FF",

    flagHigh:         palette.red500,
    flagMedium:       palette.amber500,
    flagLow:          palette.green500,
    flagHighBg:       "#FEE2E2",
    flagMediumBg:     "#FEF3C7",
    flagLowBg:        "#D1FAE5",

    tabBar:           "#FFFFFF",
    tint:             palette.blue500,
    tabIconDefault:   "#94A3B8",
    tabIconSelected:  palette.blue500,

    cardShadow:       "rgba(0,0,0,0.08)",
  },
};

export default Colors;
export { palette };
