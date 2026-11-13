import React from "react";

/**
 * The brand icon set: 1.75 px strokes on a 20 px grid, round caps and joins, no fills (brand README, Iconography).
 * The first block is copied path for path from site/assets/icons.svg; the second block adds the few the film needs,
 * drawn on the same grid. Strokes scale with the icon (40 px icon = 3.5 px stroke). Icons sit in text-muted and take a
 * state colour only inside their badge.
 */
const PATHS = {
  // ---- from site/assets/icons.svg ----
  check: <path d="M4.5 10.5l3.75 3.75L15.5 6.5" />,
  slip: <path d="M3 7h9.5M7.5 13H17" />,
  clock: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5V10l2.5 1.75" />
    </>
  ),
  trace: <rect x="3.5" y="3.5" width="13" height="13" rx="2" strokeDasharray="2.6 2.4" />,
  anchor: (
    <>
      <path d="M8.6 11.4a3 3 0 0 0 4.24 0l2.5-2.5a3 3 0 0 0-4.24-4.24l-.9.9" />
      <path d="M11.4 8.6a3 3 0 0 0-4.24 0l-2.5 2.5a3 3 0 0 0 4.24 4.24l.9-.9" />
    </>
  ),
  merge: (
    <>
      <circle cx="6" cy="4.75" r="1.75" />
      <circle cx="6" cy="15.25" r="1.75" />
      <circle cx="14" cy="15.25" r="1.75" />
      <path d="M6 6.5v7M14 13.5V9a2.5 2.5 0 0 0-2.5-2.5H9" />
      <path d="M10.75 4.75 9 6.5l1.75 1.75" />
    </>
  ),
  page: (
    <>
      <path d="M5 2.75h6.25L15 6.5v10.75H5z" />
      <path d="M11 2.75V6.5h4M7.75 10.5h4.5M7.75 13.5h4.5" />
    </>
  ),
  copy: (
    <>
      <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
      <path d="M13 7V5.25A1.5 1.5 0 0 0 11.5 3.75h-6A1.5 1.5 0 0 0 4 5.25v6a1.5 1.5 0 0 0 1.5 1.5H7" />
    </>
  ),
  menu: <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />,
  x: <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  arrow: <path d="M4 10h11.5M11 5.5l4.5 4.5-4.5 4.5" />,
  eye: (
    <>
      <path d="M2.5 10s2.75-5 7.5-5 7.5 5 7.5 5-2.75 5-7.5 5-7.5-5-7.5-5z" />
      <circle cx="10" cy="10" r="2.25" />
    </>
  ),
  hand: (
    <path d="M7 10.5V4.75a1.25 1.25 0 0 1 2.5 0V9.5M9.5 9V3.75a1.25 1.25 0 0 1 2.5 0V9.5M12 9.25V5a1.25 1.25 0 0 1 2.5 0v6.5a5.75 5.75 0 0 1-5.75 5.75c-2 0-3.2-.9-4.3-2.5L2.9 12.4a1.3 1.3 0 0 1 2.1-1.5L7 13" />
  ),
  rule: (
    <>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h7" />
      <path d="M13.5 13.75l1.5 1.5 2.5-2.75" />
    </>
  ),
  store: (
    <>
      <ellipse cx="10" cy="5" rx="6" ry="2.25" />
      <path d="M4 5v10c0 1.24 2.69 2.25 6 2.25s6-1.01 6-2.25V5M4 10c0 1.24 2.69 2.25 6 2.25s6-1.01 6-2.25" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="12.5" r="3.5" />
      <path d="M9.5 10 16 3.5M13.5 6l2 2M11.75 7.75l1.5 1.5" />
    </>
  ),
  words: (
    <>
      <path d="M3.5 4.5h13v8.5H9l-3.5 3v-3h-2z" />
      <path d="M6.5 8h7M6.5 10.5h4" />
    </>
  ),
  bell: (
    <>
      <path d="M5.5 8.5a4.5 4.5 0 0 1 9 0c0 4 1.75 5.5 1.75 5.5H3.75S5.5 12.5 5.5 8.5z" />
      <path d="M8.25 16.5a1.85 1.85 0 0 0 3.5 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M3.5 6h6M13.5 6h3M3.5 14h3M10.5 14h6" />
      <circle cx="11.5" cy="6" r="2" />
      <circle cx="8.5" cy="14" r="2" />
    </>
  ),
  play: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M8.5 7.25v5.5l4.25-2.75z" />
    </>
  ),
  undo: (
    <>
      <path d="M6.5 5 3.5 8l3 3" />
      <path d="M3.5 8h8a5 5 0 0 1 0 10H8" />
    </>
  ),
  rename: (
    <>
      <path d="M3.5 6.5h9M3.5 13.5h9" />
      <path d="M14 4l2.5 2.5L14 9M14 11l2.5 2.5L14 16" />
    </>
  ),
  filter: <path d="M3.5 4.5h13l-5 6v5l-3 1.5v-6.5z" />,
  ticket: (
    <>
      <path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 17 6.5V8a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 13.5V12a2 2 0 0 0 0-4z" />
      <path d="M12 5v10" strokeDasharray="1.5 2" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v4.5M10 6.5v.01" />
    </>
  ),
  // ---- added for the film, same grid and stroke ----
  /** An alert (the 3 a.m. page). */
  alert: (
    <>
      <path d="M8.7 3.9a1.5 1.5 0 0 1 2.6 0l5.9 10.35a1.5 1.5 0 0 1-1.3 2.25H4.1a1.5 1.5 0 0 1-1.3-2.25z" />
      <path d="M10 8v3.5M10 13.75v.01" />
    </>
  ),
  /** A terminal (coding agents, MCP). */
  terminal: (
    <>
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
      <path d="M6 8l2.25 2L6 12M10.25 12.5h3.75" />
    </>
  ),
  /** The drift dashboard. */
  chart: <path d="M3.5 16.25h13M6.25 13.25V9.5M10 13.25v-7.5M13.75 13.25V8" />,
  /** A person (the page owner). */
  user: (
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4.25 16.5a5.75 5.75 0 0 1 11.5 0" />
    </>
  ),
  search: (
    <>
      <circle cx="9" cy="9" r="5.25" />
      <path d="M13 13l3.5 3.5" />
    </>
  ),
  /** A comment (the footer comment). */
  comment: (
    <>
      <path d="M4.5 4h11A1.5 1.5 0 0 1 17 5.5v7a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 2.75V14h-1A1.5 1.5 0 0 1 3 12.5v-7A1.5 1.5 0 0 1 4.5 4z" />
    </>
  ),
  /** A step list (runbook steps). */
  list: <path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01" />,
  /** History (page history). */
  history: (
    <>
      <path d="M3.5 10a6.5 6.5 0 1 0 1.9-4.6" />
      <path d="M3.25 3.5v2.25H5.5M10 6.75V10l2.25 1.5" />
    </>
  ),
  /** A diff (the drafted edit). */
  diff: <path d="M5.5 3.75v5M3 6.25h5M3 14.25h5M11 5.5h6M11 9.5h6M11 13.5h6" />,
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export const Icon: React.FC<{
  name: IconName;
  /** px, or any CSS length ("0.9em" to follow the text). */
  size?: number | string;
  color?: string;
  /** Stroke width on the 20 px grid (default 1.75, the brand value). */
  stroke?: number;
  style?: React.CSSProperties;
}> = ({ name, size = 40, color = "currentColor", stroke = 1.75, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "block", flexShrink: 0, overflow: "visible", ...style }}
    aria-hidden
  >
    {PATHS[name]}
  </svg>
);
