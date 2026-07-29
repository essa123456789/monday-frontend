/** Runtime brand theming.
 *
 * The whole UI's accent comes from three CSS variables (see globals.css). A
 * workspace admin picks one colour; the hover and soft tints are derived from
 * it so the palette stays coherent whatever they choose. */

/** The purple the app ships with — what "no colour chosen" falls back to. */
export const DEFAULT_THEME_COLOR = "#8B5CF6";

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two colours: `t` of 0 keeps `a`, 1 lands on `b`. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const channels = (rgb: Rgb) => rgb.join(" ");

/**
 * Point the accent variables at `color` (a #rrggbb string). Pass null/an
 * invalid value to restore the shipped purple.
 *
 * Hover darkens by 18% — enough to read as a press state on any hue — and the
 * soft tint is the colour at 12% over white, matching the original #EDEDFF.
 */
export function applyThemeColor(color: string | null | undefined) {
  if (typeof document === "undefined") return;
  const rgb = hexToRgb(color || DEFAULT_THEME_COLOR) ?? hexToRgb(DEFAULT_THEME_COLOR)!;
  const root = document.documentElement;
  root.style.setProperty("--primary-rgb", channels(rgb));
  root.style.setProperty("--primary-hover-rgb", channels(mix(rgb, [0, 0, 0], 0.18)));
  root.style.setProperty("--primary-soft-rgb", channels(mix(rgb, [255, 255, 255], 0.88)));
}
