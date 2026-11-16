import type { Elev, Rect } from "../look";

/**
 * Shared types of the v4 twins (V4.md section 5). Frames (`at`, `dur`, ...) are in the caller's local time (the scene's
 * Sequence). Positions are film px on the 1920 x 1080 stage, before the camera.
 */

export type World = "day" | "night";

/** The app's states as the byline names them (API words). */
export type DdsState = "verified" | "possibly_stale" | "stale" | "unanchored";

/**
 * Words a page twin can lift out or mark. `PAY-18` lives on the ADR, the others on the runbook. `./scripts/rollback.sh`
 * is the whole command word on step 2's command line (A1's mark); the `-v2` and `_SECS` ids name the same boxes once
 * step 2 reads its fixed form.
 */
export type TokenId =
  | "scripts/rollback.sh"
  | "./scripts/rollback.sh"
  | "PAY-6"
  | "ROLLBACK_TIMEOUT"
  | "PAY-18"
  | "scripts/rollback-v2.sh"
  | "ROLLBACK_TIMEOUT_SECS";

export type MarkKind = "mist" | "current" | "amber";

/** The byline: A1's generic date line, or our real byline item ("Possibly stale · Doc Drift" with the app icon). */
export type BylineSpec =
  | { kind: "reviewed"; text: string }
  | {
      kind: "dds";
      state: DdsState;
      /**
       * What the byline read before: a Doc Drift state, or "reviewed" (A1's line, `fromText`, default "Reviewed 34 days
       * ago"). The swap is a 6-frame slip centred on `at`: the old words are gone at `at`, the new ones fully readable at
       * at + 3 (STATUS.md, Byline swap timing).
       */
      from?: DdsState | "reviewed";
      fromText?: string;
      at?: number;
      /**
       * Whether the item carries the shot's amber (the bloom and the amber word) while it reads Possibly stale.
       * Default true. Set false when the slipped Steps band is the amber element of the shot.
       */
      amber?: boolean;
    };

export type PageTwinProps = {
  world?: World;
  doc?: "runbook" | "adr015";
  /** UI px to film px (default 1.8: UI body 15 px reads 27 px). */
  k?: number;
  /** Top-left of the page card on the stage, film px (default: the card centred, top at 96). */
  x?: number;
  y?: number;
  /** Card width in UI px (default 520). The film width is width x k. */
  width?: number;
  byline?: BylineSpec;
  tooltip?: { text: string; at: number; out?: number };
  /** 0 flat .. 1 the three bands apart in Z (use inside a preserve-3d camera; see STATUS.md). */
  explode?: number;
  /**
   * The Steps band slips one unit right at `at` (6 f) and snaps home at `back` (8 f), with its trace, glow and bloom.
   * The band carries the amber from `at` until `handoff` (then the amber passes to the byline item, the band stays
   * out of line, neutral). Without `handoff` the band keeps the amber; pass `amber: false` to slip it neutral.
   */
  slip?: { at: number; back?: number; handoff?: number; amber?: boolean };
  /**
   * Step 2's code: "old" (as written), "renamed" (after the rename quick fix: `./scripts/rollback-v2.sh --timeout
   * $ROLLBACK_TIMEOUT`), "new" (after the drafts: `export ROLLBACK_TIMEOUT_SECS=300` / `./scripts/rollback-v2.sh
   * --timeout $ROLLBACK_TIMEOUT_SECS`), or a slip morph between two of them: `{ morphAt, dur? (8), from? ("old"),
   * to? ("new") }`. The insertions open and the text after them slides right; nothing fades.
   */
  step2?: "old" | "renamed" | "new" | { morphAt: number; dur?: number; from?: "old" | "renamed" | "new"; to?: "old" | "renamed" | "new" };
  /** A hairline scanning down the page from `at` over `dur` frames. */
  scan?: { at: number; dur: number };
  /** A marker on a token: Mist band, Current underline, or amber block (amber only for the drift). */
  mark?: { token: TokenId; kind: MarkKind; at: number };
  /**
   * The token lifts off the page toward the camera at `at` (a chip floats at elevation 4; its home keeps a trace).
   * From `dockAt` the chip is no longer drawn here: your KineticDock carries it on (start it at
   * pageRects(props).tokensLifted[token], and draw <TokenChip> inside it).
   */
  lift?: { token: TokenId; at: number; dockAt?: number };
  /** Card elevation (default 3, the hero). */
  elev?: Elev;
  /** Arrive by lifting from elevation `from` (default 1) to `elev` over `dur` (default 14) frames, rising 18 UI px. */
  enter?: { at: number; dur?: number; from?: Elev };
  /** Show "By Razvan Statescu" before the byline item (default true). */
  author?: boolean;
  /** Z offsets of the three bands at explode = 1, film px (default [-90, 110, -180]). */
  explodeZ?: [number, number, number];
  /** The card's own rotation, degrees (read square at rest: V4.md M2). */
  yaw?: number;
  pitch?: number;
  /** Give the card its own perspective (px). Leave it out inside a Camera3D that already has one. */
  perspective?: number;
  style?: React.CSSProperties;
};

export type PageRects = {
  /** The whole card. */
  card: Rect;
  title: Rect;
  /** The byline row (the date line or the byline item). */
  byline: Rect;
  /** The byline item itself ("Possibly stale · Doc Drift" with its icon), or the reviewed line. */
  badge: Rect;
  /** The three bands: header (top), Steps (middle, the one that slips), the rest (bottom). */
  bands: { top: Rect; steps: Rect; bottom: Rect };
  /** The Steps band where it sits when slipped (one unit right). */
  stepsSlipped: Rect;
  /** Step 2 (its sentence and code well). */
  step2: Rect;
  /** Step 2's code line with the command. */
  step2Code: Rect;
  /** Each liftable token's rect. Missing when the doc does not carry it. */
  tokens: Partial<Record<TokenId, Rect>>;
  /** Where the tooltip sits when open. */
  tooltip: Rect;
  /** Node on the card's right edge for each band (connectors start here). */
  nodes: { top: [number, number]; steps: [number, number] };
};

export type AnchorKind = "code" | "jira";
export type AnchorSpec = { label: string; kind: AnchorKind };
