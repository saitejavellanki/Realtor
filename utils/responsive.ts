// utils/responsive.ts
// Base Figma canvas: 375×812
// Strategy:
//   s(px)   → scales by screen WIDTH  (layouts, widths, heights of components)
//   ms(px)  → moderate scale (font sizes, icon sizes — scales gently on tablets)
//   isTablet → true when width >= 600px

import { Dimensions } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const BASE_W = 375;

// True linear scale by width — use for component widths, paddings, radii
export const s = (px: number) => px * (W / BASE_W);

// Moderate scale — use for font sizes and icon sizes.
// On a 375px phone: returns px exactly.
// On a 768px tablet: returns ~px*1.3 instead of px*2 — readable but not huge.
const FACTOR = 0.5;
export const ms = (px: number) => px + (s(px) - px) * FACTOR;

// Vertical — use ONLY for things that must match Figma vertical positions exactly.
// Prefer flex layouts over this wherever possible.
export const vs = (px: number) => px * (H / 812);

export const W_SCREEN = W;
export const H_SCREEN = H;
export const IS_TABLET = W >= 600;