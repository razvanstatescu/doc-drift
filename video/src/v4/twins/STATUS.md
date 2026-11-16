# Twins status

stubs: yes (every contract name exports and typechecks)
**ready: all** (2026-11-16): `PageTwin`, `pageRects`, `BylineItem`, `TooltipTwin`, `AnchorRail`, `ChangeRecord`,
`AgentPanelTwin`, `TerminalTwin`, plus helpers (`TokenChip`, `anchorRailRects`, `agentPanelRects`, `agentPanelHeightAt`,
`changeRecordSize`, `terminalSize`, `tooltipLayout`, `bylineItemSize`, `reviewedLineWidth`, `bylineSwapProgress`,
`textWidth`, `layoutRuns`, `wrapText`, `jsonLines`, `TOOLTIPS`).
**round 2 ready** (2026-11-16, review T-1 to T-5, S-1, S-8, G-1, R-3, R-5): see "Round 2 changes" below. Props stay
compatible (nothing renamed or removed); three defaults changed on purpose and are flagged there.

Owner: Shared twins agent (port 3511). Import from `src/v4/twins` only:

```ts
import { PageTwin, pageRects, AnchorRail, ChangeRecord, AgentPanelTwin, agentPanelRects, TerminalTwin, TOOLTIPS } from "../../v4/twins";
```

Gallery: composition `Dev/Twins`, one page per 100 frames (settled at page x 100 + 90). While another scene breaks the
bundle, render it through the twins' own entry: `npx remotion still src/v4/twins/devRoot.tsx Twins out/v4/twins/x.png
--frame=N --port=3511`. Pages: 0 rects overlay, 1 slip and handoff, 2 explode, 3 1:1 byline + flagged tooltip, 4 1:1
Unanchored and Verified tooltips, 5 1:1 step 2 (morph to the fixed form), 6 Night A1 (Mist), 7 1:1 ADR-015, 8 Night A4
(lit item, tooltip, enter), 9 AnchorRail (draw, change, pulse), 10 ChangeRecord, 11 TerminalTwin, 12 1:1 Drift
Reviewer, 13 generic panel (Night), 14 ghost slip, 15 scan and lift, 16 marks and step 2 "new", 17 1:1 header tables.
Stills: `out/v4/twins/` (`1to1-*.png` are the twin beside the real capture at matching scale).

Every twin draws only real words: `apps/core/src/lib/copy.ts`, `apps/core/src/frontend/shared/copy.ts`,
`captures.json` (`runbookText`, `toolOutput`), and the captures. Layout is computed from the fonts' own advance widths
(`metrics.ts`), so every rect helper returns what the twin draws, at any frame, before or after fonts load.

## Round 2 changes (2026-11-16; scene owners: re-check these before re-rendering)

| Item | What changed | Your action |
| --- | --- | --- |
| T-5, S-8, R-3: byline swaps | **Slip swaps**, no opacity: the old words slide right one unit while a wipe takes them from the left; the new words slide in from the left behind a wipe that opens to the right. Same timing as the QA fix (table below): old gone at `at`, new readable at `at + 3`. New: `byline: { kind: "dds", from: "reviewed", fromText?, state, at }` swaps A1's "Reviewed 34 days ago" line into the Doc Drift item the same way (also `BylineItem from="reviewed"`) | Replace any two-byline cross-fade with one `from: "reviewed"` swap (A2, f1218) |
| T-5, R-3: step 2 | `step2: "renamed"` (`./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT`, the page after the quick fix). Morphs take `{ morphAt, dur? (default 8, was 10), from? ("old"), to? ("new") }` and are **slips**: each insertion (`-v2`, `_SECS`) opens, the text after it slides right, and the inserted characters are uncovered from their start. No fade, no drop. `pageRects` follows the morph's `to` state | P4: drop `RenamedLine2`; use `step2: "renamed"` before the drafts and `{ morphAt, from: "renamed", to: "new" }` at the snap back |
| T-1, N-1, G-3: AgentPanelTwin | `prefilled` (or `question.prefilled`): the question is in its bubble at arrival, no typing. **Default changed:** the card is content-sized and grows (8 frames, expo out) as the question, the steps and each answer line arrive; `grow={false}` (or a fixed `height`) gives the old fixed final height. The steps now fold by the answer sliding up over them (cut, never faded). `avatarSize` (T-3: match the real avatar in a morph). `agentPanelHeightAt(props, frame)` | A1, P3, A4: check anything placed against the panel's bottom edge; use `prefilled` for arrivals |
| T-2, G-1, R-5, R-6: TerminalTwin | `typeFrames` per call (0: already typed when the call appears; about 6: a quick type). `enter: { at, dur? }` lifts it in at full opacity (elevation 1 to its level, rising 26 px). `dim` 0..1 steps it back by blur and scale, never opacity. `tag` puts an ink tag over its top-left (pass the full text, for example "Real output: doc-drift MCP"; `tagSize` default 28). **Default changed:** `maxArea` (default 0.35) caps the slab at 35% of the frame's area at zoom 1 by showing fewer rows (it scrolls); `terminalSize(props)` reports width, height, rows and area. Scrolling now moves by whole rows, so no row is ever cut under the title bar | P3: drop the covering band; set the first call's `at` = `enter.at` with `typeFrames: 0`; check `terminalSize()` for your width |
| T-4, S-1, S-9: AnchorRail | **Default changed:** chips are sized to what they show: the label, then they grow (width and height, 12 frames) as a change docks. A change written "PR #482 · a -> b" stacks the PR over the rename, so the chip grows mostly in height. `leave: { at, dur? (9) }`: the curves retract toward the page while the chips slide right and drop. `anchorRailRects(props, frame)` gives the sizes at a frame | A2: re-check the rail's `x` against the docked width (`anchorRailRects(props).chips[0]`); use `leave` instead of unmounting |

Frame strips of every changed behaviour: `out/v4/twins/round2/` (`byline-slip-swaps-strip.png`,
`byline-pagetwin-handoff-strip.png`, `step2-slip-morph-strip.png`, `panel-arrival-growth-strip.png`,
`terminal-arrival-strip.png`, `anchor-rail-growth-leave-strip.png`), from the composition `TwinsRound2`
(`src/v4/twins/Round2.tsx`, registered only in `devRoot.tsx`).

## Byline swap timing (read this before timing a byline)

Every byline swap (`PageTwin` `byline: { from, state, at }` and `BylineItem` `from`/`at`) is a 6-frame **slip** window
centred on `at` (`BYLINE_SWAP = { outStart: -3, inEnd: 3 }`, `bylineSwapProgress(frame, at)`). Between two Doc Drift
states only the words swap (the icon stays in line); from "reviewed" the whole line swaps.

| Frame | Old words (`from`) | New words (`state`) |
| --- | --- | --- |
| up to at - 3 | fully readable | hidden |
| at - 2 | sliding right, the wipe has taken about a third | hidden |
| at - 1 | sliding right, about two thirds gone | hidden |
| **at** | **gone** | hidden (the icon stays) |
| at + 1 | gone | about 90% uncovered, sliding in |
| at + 2 | gone | about 99% |
| **at + 3** | gone | **100% and still: fully readable** |

No opacity anywhere in the swap; the two labels are never visible in the same frame. To have the new words readable 0 to 4 frames before their narration
word (V4.md M6), set `at = word - 3` (readable on the word) down to `at = word - 7` (4 frames early). Example: the payoff
"Verified." at film 3760 wants `at` = 3753 to 3757 in film frames (readable 3756 to 3760).

The amber handoff (`slip.handoff`) runs 6 frames, expo out: the item's amber is 69% at handoff + 1, 90% at + 2, 97% at
+ 3, while the band's amber falls the same way. Set `slip.handoff = byline.at` so the amber arrives with the new
words. A lit old face (Possibly stale) leaves with its amber block over at - 3 to at; a snap back (`slip.back`) can
start at the same frame as the swap window (`back = at - 3`). Proof: `out/v4/twins/swap-strip.png` (gallery page 1,
both directions, frame by frame, at - 5 to at + 6; the same strip is `round2/byline-pagetwin-handoff-strip.png`).
Before the QA fix the swap ran over at to at + 13 and the labels overlapped from at + 3 to at + 6.

---

## PageTwin

The runbook (`doc="runbook"`, default) or ADR-015 (`doc="adr015"`) as a neutral crafted card (not shaped like
Confluence). Runbook: crumbs "Platform / Runbooks", the title, "By Razvan Statescu" (the real author; `author={false}`
hides it), a properties well (Service `payments-api`; Jira `PAY-6` Safer payments deploys and rollbacks; the real Owner
row names Dana, so it is left out), Steps 1 and 2 with step 2's real code block, then "If the script times out" with its
real first sentences. ADR: crumbs "Platform / Architecture decisions", title, byline; its table (Status, Date, Jira
`PAY-18` Multi-region active-passive database; Deciders and Owner are left out, they name people); then Context.

Three bands = the mark's three bands: `top` (header), `middle` (the section that drifts: the runbook's Steps; the ADR's
table, which the real panel calls "Top of page"), `bottom`.

| Prop | Meaning |
| --- | --- |
| `world` | `"day"` (default) or `"night"` (A1/A4: Night surface, dark wells, Paper tooltip) |
| `k` | UI px to film px, default 1.8 (body 27 px, code 26 px). The card is 600 UI px wide: 1080 px at 1.8, 900 at 1.5. Runbook height: 1121 px at 1.8, 934 at 1.5 |
| `x`, `y` | the card's top-left on the stage, film px (default: centred). It positions itself absolutely: put it in your camera layer |
| `byline` | `{ kind: "reviewed", text: "Reviewed 34 days ago" }` (A1: a check and the words, no Doc Drift) or `{ kind: "dds", state, from?, fromText?, at?, amber? }`: the real item "Verified · Doc Drift" with the app icon, slip-swapping from `from` (a state, or "reviewed" with `fromText`) to `state` in the window at - 3 to at + 3 (old gone at `at`, new readable at at + 3; see Byline swap timing) |
| `tooltip` | `{ text, at, out? }` under the byline item; `TOOLTIPS.flagged` = "PR #482 changed deploy/helm/values.yaml on Nov 13. Review.", also `unanchored`, `verified2`, `verified3`, `adrFlagged`. The item shows its hover background while it is open |
| `slip` | `{ at, back?, handoff?, amber? }`: the middle band slips one unit right (6 f) with its trace, a warm amber wash, an amber edge, glow and bloom; snaps home at `back` (8 f). `handoff`: the amber passes from the band to the byline item over 6 f, expo out (the band stays out of line, neutral; set it to `byline.at`). No `handoff`: the band keeps the amber. `amber: false`: it slips neutral |
| `explode` | 0..1: the cuts open and the bands move apart in Z (`explodeZ`, default [-90, 110, -180] px). Depth needs a perspective: pass `perspective` (+ `yaw`, `pitch`), or keep a preserve-3d chain under a camera that has one |
| `step2` | `"old"` (default), `"renamed"` (after the quick fix: `./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT`), `"new"` (`export ROLLBACK_TIMEOUT_SECS=300` / `./scripts/rollback-v2.sh --timeout $ROLLBACK_TIMEOUT_SECS`, as in p4-step2-fixed), or a slip morph `{ morphAt, dur? (8), from? ("old"), to? ("new") }`: the insertions open and the text after them slides right (no fade) |
| `scan` | `{ at, dur }`: a Current hairline scans down the card (P1 V11) |
| `mark` | `{ token, kind: "mist" \| "current" \| "amber", at }`: Mist (multiply on Day, screen on Night; the words untouched), Current underline, or the amber block (the drift only; it redraws the words on top) |
| `lift` | `{ token, at, dockAt? }`: the token rises off the page as a chip (elevation 4), its home keeps a trace. From `dockAt` the page stops drawing the chip, so your KineticDock carries it on (example below) |
| `enter` | `{ at, dur?, from? }`: lift in from elevation 1, rising 18 UI px |
| `elev` | card elevation, default 3 |

Token ids: `"scripts/rollback.sh"`, `"./scripts/rollback.sh"` (the whole command word, A1's Mist), `"ROLLBACK_TIMEOUT"`
(in `export ...`), `"PAY-6"`; on the ADR `"PAY-18"`. With `step2="new"` also `"scripts/rollback-v2.sh"` and
`"ROLLBACK_TIMEOUT_SECS"`.

**One amber per shot** is built in: the slipped band and the lit byline item are never amber together (use
`slip.handoff`). Pass `byline.amber: false` when something else in the shot is the amber.

### pageRects(props)

Same props as the page. Film-px rects of the resting layout (cuts closed, band home): `card`, `title`, `byline` (the
row), `badge` (the byline item in its final state), `badgeFrom`, `badgeSlipped`, `bands.top / middle / steps / bottom`,
`stepsSlipped` (= `middleSlipped`), `step2`, `step2Code` (the command line), `tokens[id]`, `tokensLifted[id]`,
`tooltip`, `nodes.top / nodes.steps` (right-edge points for connectors), `k`. Checked against the drawing in the
gallery (page 0 outlines them).

```tsx
const P: PageTwinProps = { world: "day", k: 1.8, x: 160, y: 90, byline: { kind: "dds", state: "possibly_stale", from: "verified", at: 48 } };
const r = pageRects(P);
// a camera push that lands on the byline item (Cam3 x, y = the stage point at the centre of the view)
<Camera3D keys={[{ at: 34, dur: 20, to: { x: r.badge.x + r.badge.w / 2, y: r.badge.y + r.badge.h / 2, zoom: 1.35 } }]}>
  <PageTwin {...P} slip={{ at: 20, handoff: 48 }} tooltip={{ text: TOOLTIPS.flagged, at: 56 }} />
</Camera3D>
// a token flies from step 2 to a suggestion row
<PageTwin {...P} lift={{ token: "scripts/rollback.sh", at: 104, dockAt: 116 }} />
<KineticDock at={116} dur={16} fromRect={r.tokensLifted["scripts/rollback.sh"]!} toRect={rowRect}>
  <TokenChip text="scripts/rollback.sh" k={P.k} />
</KineticDock>
```

## BylineItem

`state`, `from?`, `at?` (the swap window is at - 3 to at + 3: old gone at `at`, new readable at at + 3; see Byline swap
timing), `world?`, `k?` (1.8), `size?` (UI, 15), `lit?` (0..1 or boolean; default lit while Possibly stale), `slip?`
(true), `hover?`, `x?`, `y?`. Text plus the app icon, as the real item ("Possibly stale · Doc Drift");
never a coloured lozenge. Lit = the brand's slip: the words slip one unit right onto an amber block, with trace, glow
and bloom; the icon stays in line. `bylineItemSize(state, k)`. `ReviewedLine` is A1's check plus "Reviewed 34 days ago".

## TooltipTwin

`text`, `at`, `out?`, `world?`, `k?`, `maxW?` (UI, 330), `x?`, `y?`. Fathom with Paper text on Day, Paper with Fathom
text on Night; wraps at words (a path never breaks). `tooltipLayout(text, k)` gives its lines and size.

## AnchorRail

Chips and connectors from page bands (R2 section 4). Real labels (`anchorLabel()`): `payments-api: scripts/rollback.sh`,
`payments-api: deploy/helm/values.yaml`, and `PAY-6` with "Jira issue". A watched anchor: 2 px dashed Current curve; a
changed one: 2.5 px Fathom. Nodes are 6 px circles; chips are ordered by their source height, so lines never cross.
An "Anchors" label sits over the chips (`title={false}` hides it).

| Prop | Meaning |
| --- | --- |
| `anchors` | `{ label, kind: "code" \| "jira" }[]` |
| `draw` | frame each connector starts to draw (14 f, `drawDur`); its chip lifts in as the line arrives |
| `from` | the band rect, or one rect per anchor (e.g. `[r.bands.middle, r.bands.middle, r.bands.top]`) |
| `change` | `{ index, text, at }`: "PR #482 · scripts/rollback.sh -> scripts/rollback-v2.sh" docks on that chip (`->` draws the arrow icon), its connector turns solid; chips below move down |
| `changed` | indices drawn solid from the start |
| `pulse` | `{ index, at, dur?, dir? }` (or a list): a node runs along a connector, default from the chip to the page |
| `leave` | `{ at, dur? (9) }`: the curves retract toward the page while the chips slide right and drop |
| `x`, `y`, `gap`, `width`, `k`, `world` | placement (default: 200 px right of the source, centred on it). Chips are sized to their label and grow as a change docks (a fixed `width` turns that off) |

`anchorRailRects(props, frame?)` returns `chips[i]`, `srcNodes`, `chipNodes`, `paths[i]` (SVG `d`) for docking; with
`frame`, chip sizes at that frame, without it, after the change has docked.

## ChangeRecord

`label` ("PR #482 · 2 files": PR in mono, the count in sans), `at` (lifts in), and either `x`, `y` (its CENTRE), or
`along: { d, at, dur, ease? }` to ride a path with the kit's SignalLine travel (expo in-out, so it sits on the pulse),
or neither (it sits inline in the flow). `lit` (0..1 or boolean): amber edge, glow and bloom, the shot's amber.
`out`: drops into its target over 6 f. `k` (1.8), `world`. `changeRecordSize(label, k)`.

## TerminalTwin

The Fathom slab (R2 section 8): radius 28, dark elevation, a 66 px title bar over a 1.5 px divider, Spline Sans Mono;
keys Night link, strings Mist, punctuation muted, numbers and booleans teal.

| Prop | Meaning |
| --- | --- |
| `title`, `right?` | title bar text ("Coding agent · MCP") and its right side (mono, Night link) |
| `calls` | `{ cmd, at, output, collapse?, only?, focus?, streamAt?, cps?, typeFrames?, lps?, prompt?, clear? }[]` (`typeFrames: 0`: typed already when the call appears) |
| `output` | a toolOutput key from captures.json (`"findDocsFlaggedV2"`, `"checkFlaggedV2"`, `"checkVerified"`, ...: its `output` is printed), `{ json }`, `{ text }`, plain text, or any JSON value |
| `collapse` | dotted paths (`"url"`, `"openDrift"`, `"pages.0"`) or ids (`"2752731"`: the page with that pageId) shown as `{ … }`, `[ … ]` or `"…"` |
| `only` | keep these top-level keys; a `…` line stands for the rest |
| `focus` | the one amber value: a path (`"status"`) or a page id (`"2720100"`: that page's `status`), with a soft bloom |
| `cps`, `lps`, `streamAt` | typing (42 chars/s), streaming (45 lines/s), start of output (typing done + 8) |
| `clear` | a fresh screen when this call starts |
| `width` (920), `rows` (the tallest screen, at most 22), `fontSize` (26), `world`, `elev` (4), `x`, `y` | `x`, `y` are the slab's top-left |
| `maxArea` | size guide, default 0.35: fewer rows until the slab is at most 35% of the frame's area at zoom 1 (`terminalSize(props)` reports width, height, rows, area) |
| `tag`, `tagSize` | an ink tag over the slab's top-left (full text, for example "Real output: doc-drift MCP"), 28 px by default |
| `enter`, `dim` | lift in at full opacity (`{ at, dur? (14) }`); step back by blur and scale (0..1), never opacity |

Long strings wrap at words with a hanging indent. The view follows the newest line and scrolls by whole rows, so no row
is ever cut under the title bar. **Honesty guard:** an object whose title names a QA page ("DDS test", "(UX review)") and
any string naming one (find-docs-for-path's `guidance` does) are always collapsed.

```tsx
<TerminalTwin title="Coding agent · MCP" right="doc-drift" x={140} y={80} width={1100} calls={[
  { cmd: 'find-docs-for-path {"repo": "payments-api", "path": "scripts/rollback.sh"}', at: 8, output: "findDocsFlaggedV2", collapse: ["pages.1.url"], focus: "2720100" },
  { cmd: 'check-page-freshness {"pageId": "2720100"}', at: 150, output: "checkFlaggedV2", collapse: ["url", "openDrift"], focus: "status", clear: true },
]} />
```

## AgentPanelTwin

| Prop | Meaning |
| --- | --- |
| `variant` | `"drift-reviewer"` (Day by default: header "Drift Reviewer", our mark as a 48 px avatar, no Rovo marks, "Referencing" + the page chip, "Drift Reviewer is thinking." with the steps) or `"generic"` (Night by default: "AI assistant" with a plain chat glyph, the source chip under the answer) |
| `question` | `{ text, at, typeDur? }` types into the bubble |
| `steps` | `{ text, at }[]`: spinner, then a check. Real labels: "Analyzing: Reviewing your question.", "Invoking tool: Read Skills for agents", "Invoking tool: Check page freshness". They fold away when the answer starts, as in the real panel (`keepSteps` keeps them) |
| `answer` | `{ lines, at, cps? }`: paragraphs with `**bold**`, `` `code` `` and `{source}` (the inline page chip). A line that starts with `./` or `$ ` is set as code. Laid out once, revealed by characters, so words never jump lines |
| `source` | `{ text, at? }` or a string: "Payments rollback runbook" |
| `ghost` | `{ text, at, slipAt?, out }`: the old answer ghosts into the answer slot, slips one unit right in amber with trace and bloom, then falls away (P3 V17: the shot's one amber) |
| `prefilled` | the question is already in its bubble at arrival (no typing); also `question.prefilled` |
| `grow` | default true: the card is content-sized and grows as its parts arrive; `false` (or a fixed `height`) keeps the final height from the start |
| `avatarSize` | default 48 (match the real avatar's size in a morph) |
| `keepSteps` | keep the steps above the answer (default: the answer slides up over them) |
| `x`, `y`, `width` (780), `height` (content-sized), `size` (30), `elev` (3), `world` | |

`agentPanelRects(props)`: `panel` (at its final height), `header`, `avatar`, `question`, `referencing`, `thinking`,
`steps[i]`, `answer`, `answerLines[i]`, `source` (the chip, inline or under the answer), `ghost`, `fold`. Answer rects are
where it lands after the steps fold away. `agentPanelHeightAt(props, frame)` is the grown height at a frame.

The real v2 answer (P3): `["{source} is Possibly stale.", 'What it describes changed in PR #482 on 2026-11-13, after it
was last verified. The affected section is "Steps". Do not present steps from this page as current. The review is in
the Doc Drift badge on the page.']`.

---

## Known differences from the real UI (simplifications only; no word, control, state or step added)

- Byline: only "By Razvan Statescu" and our item; the real "2 min", "Listen" and "Add a reaction" are dropped. The
  "(Development)" suffix is not drawn (the captures mask it).
- Tooltips wrap at 330 UI px (2 lines where the real one wraps to 3); Fathom, not Atlassian grey.
- Runbook: the header table drops Owner (Dana), Severity and Last reviewed; step 1 keeps its first sentence and drops
  its code; step 2 keeps its first sentence and its code block; steps 3 to 5 are dropped; "If the script times out"
  keeps its first two sentences. Code wells have no line numbers or syntax colours.
- ADR: the table drops Deciders and Owner (people's names); Context keeps its first two sentences.
- Drift Reviewer panel: no header controls (back, menu, edit, more, close), no feedback icons, no suggested questions;
  the chip and link colour are our Day link teal, not Atlassian blue.
- Terminal: real JSON, with fields trimmed to `…` where asked; QA pages always trimmed.
