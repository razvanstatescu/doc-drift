import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Icon } from "../../brand/icons";
import { clamp, EASE, tween } from "../../lib/time";
import { textWidth, wrapText } from "../../v4/twins";
import { DAY, elevAt, FONT, ink, type Rect } from "../../v4/look";

/**
 * SuggestionsTwin (P1, V11 and V12): the anchors part of the Doc Drift badge modal for an unanchored page, rebuilt in
 * our Day look at film size. Every string is the app's own (apps/core/src/frontend/shared/copy.ts and
 * shared/suggest.ts) or the capture's (p1-suggestions, p1-suggestions-ticked, p1-saved):
 *
 *   Suggested from this page (2)                                  COPY.suggested + " (2)"
 *   Checked suggestions are added when you save. Weak ones start unchecked.   COPY.suggestedHelp
 *   Repository for suggested paths   [ payments-api ]             COPY.suggestRepo (placeholder "payments-api")
 *   [x] PAY-6  Jira issue                                         suggestionDisplay (jira)
 *   [ ] scripts/rollback.sh  Needs a repository  Weak             suggestionDisplay (needsRepo), COPY.weak
 *       -> "in payments-api" once the repository is typed
 *   [Save and mark verified]                                      COPY.saveAnchors
 *   You have unsaved changes. Saving replaces the anchors and marks this page Verified.   COPY.unsaved + saveHelp
 *
 * and, after the save (p1-saved): the notice "Saved 2 anchors. This page is Verified." (anchorsSavedTitle(2)) with
 * "Reload the page to see the new badge." (COPY.reloadBadge) and [Reload page] (COPY.reloadButton), then the 2 saved
 * anchors as the Anchors table shows them ("PAY-6", "payments-api: scripts/rollback.sh").
 *
 * Only two suggestions, as the real page had (R3 section 8, risk 3): never deploy/helm/values.yaml here.
 * The twin simplifies the modal (it drops the header, the explainer and "Add an anchor"); it adds no control, state,
 * step or word. Checkbox and focus colours are ours (no Atlassian blue).
 *
 * Coordinates: the panel's top-left is (x, y) on the stage, film px; `suggestionsLayout()` gives every rect the scene
 * aims at (the card for R2's morph, the row chips the flying tokens dock on, the field, the buttons, the notice and
 * the word "Verified" that flies to the byline). Widths come from the fonts' advance tables (twins metrics), so the
 * rects are the same before and after the fonts load.
 */

export const STRINGS = {
  suggested: "Suggested from this page (2)",
  suggestedHelp: "Checked suggestions are added when you save. Weak ones start unchecked.",
  suggestRepo: "Repository for suggested paths",
  repo: "payments-api",
  row1Code: "PAY-6",
  row1Note: "Jira issue",
  row2Code: "scripts/rollback.sh",
  row2Need: "Needs a repository",
  row2In: "in payments-api",
  weak: "Weak",
  saveAnchors: "Save and mark verified",
  saveHelp: "You have unsaved changes. Saving replaces the anchors and marks this page Verified.",
  savedTitleLead: "Saved 2 anchors. This page is ",
  savedTitleWord: "Verified",
  savedTitleTail: ".",
  reloadBadge: "Reload the page to see the new badge.",
  reloadButton: "Reload page",
  anchors: "Anchors",
  saved1: "PAY-6",
  saved2: "payments-api: scripts/rollback.sh",
} as const;

export type SuggestionsTwinProps = {
  /** Panel top-left on the stage, film px. */
  x: number;
  y: number;
  /** UI px to film px (default 2: the capture's own scale, so a morph to the real card starts near 1:1). */
  k?: number;
  /** Panel width in UI px (default 480). */
  width?: number;
  /** The panel lifts in (elevation 1 to 4) at this frame; before it nothing shows. */
  appear: number;
  /** Frames the two rows dock (their chips land; the row text sets in just after). Row 1 is checked on arrival. */
  rows: [number, number];
  /** "payments-api" types into the repository field from `at` over `dur` frames (one character a frame by default). */
  typed?: { at: number; dur?: number };
  /** Row 2's checkbox ticks (the real click). */
  check2?: number;
  /** The primary button's press (the real "Save and mark verified" click). */
  savePress?: number;
  /** From this frame the panel shows the saved state (the notice and the 2 anchors). */
  saved?: number;
  /** The word "Verified" leaves the notice title at this frame (its home keeps a trace; the scene flies the copy). */
  verifiedLift?: number;
  /** Dims the whole panel (0..1 multiplier of opacity), for when a proof sits in front. */
  dim?: number;
  /** The panel leaves by moving (M3): it slides out to the right from this frame (12 frames, expo in). */
  leave?: number;
};

// ---- the layout, film px at k = 2 (UI px x k) ----

const PAD = 22; // panel padding, UI
const CARD_PAD = 16; // card padding, UI
const S = {
  title: { size: 18, weight: 600, line: 23 },
  help: { size: 14, weight: 400, line: 19 },
  label: { size: 14, weight: 600, line: 18 },
  field: { h: 40, size: 15 },
  row: { h: 26, gap: 7, box: 18, chip: 14, note: 14 },
  button: { h: 38, size: 15 },
  helper: { size: 13, line: 17 },
  notice: { title: 15, body: 14, line: 20, pad: 16, icon: 20 },
} as const;

export type SuggestionsRects = {
  panel: Rect;
  /** The suggestions card ("Suggested from this page (2)" to row 2): R2's morph element. */
  card: Rect;
  field: Rect;
  row1: Rect;
  row2: Rect;
  /** The chips the flying tokens dock on. */
  chip1: Rect;
  chip2: Rect;
  check2: Rect;
  save: Rect;
  notice: Rect;
  /** The word "Verified" in the notice title. */
  verifiedWord: Rect;
  /** The panel once saved (the notice and the 2 anchors; shorter than the suggest state). */
  panelSaved: Rect;
  /** Font size (film px) of the row chips' mono text, for the flying tokens. */
  chipFont: number;
  /** Font size (film px) of the notice title, for the flying word. */
  noticeFont: number;
};

const mono = (text: string, size: number) => textWidth(text, { size, mono: true, tracking: -0.01 });

export function suggestionsLayout(p: Pick<SuggestionsTwinProps, "x" | "y" | "k" | "width">): SuggestionsRects {
  const k = p.k ?? 2;
  const u = (n: number) => n * k;
  const W = u(p.width ?? 480);
  const inner = W - 2 * u(PAD);
  const cardInner = inner - 2 * u(CARD_PAD);
  const helpLines = wrapText(STRINGS.suggestedHelp, cardInner, { size: u(S.help.size), weight: S.help.weight }).length;
  const x0 = p.x + u(PAD);
  let y = p.y + u(PAD);
  const cardY = y;
  y += u(CARD_PAD);
  y += u(S.title.line) + u(5);
  y += helpLines * u(S.help.line) + u(11);
  y += u(S.label.line) + u(6);
  const field: Rect = { x: x0 + u(CARD_PAD), y, w: cardInner, h: u(S.field.h) };
  y += u(S.field.h) + u(11);
  const rowX = x0 + u(CARD_PAD);
  const chipX = rowX + u(S.row.box) + u(8);
  const chipH = u(22);
  const chipW = (t: string) => mono(t, u(S.row.chip)) + 2 * u(5);
  const row1: Rect = { x: rowX, y, w: cardInner, h: u(S.row.h) };
  const chip1: Rect = { x: chipX, y: y + (u(S.row.h) - chipH) / 2, w: chipW(STRINGS.row1Code), h: chipH };
  y += u(S.row.h) + u(S.row.gap);
  const row2: Rect = { x: rowX, y, w: cardInner, h: u(S.row.h) };
  const chip2: Rect = { x: chipX, y: y + (u(S.row.h) - chipH) / 2, w: chipW(STRINGS.row2Code), h: chipH };
  const check2: Rect = { x: rowX, y: y + (u(S.row.h) - u(S.row.box)) / 2, w: u(S.row.box), h: u(S.row.box) };
  y += u(S.row.h) + u(CARD_PAD);
  const card: Rect = { x: x0, y: cardY, w: inner, h: y - cardY };
  y += u(15);
  const save: Rect = { x: x0, y, w: textWidth(STRINGS.saveAnchors, { size: u(S.button.size), weight: 600 }) + 2 * u(16), h: u(S.button.h) };
  y += u(S.button.h) + u(7);
  const helperLines = wrapText(STRINGS.saveHelp, inner, { size: u(S.helper.size) }).length;
  y += helperLines * u(S.helper.line) + u(PAD);
  const panel: Rect = { x: p.x, y: p.y, w: W, h: y - p.y };
  // the saved state: the notice where the card was
  const nTitle = u(S.notice.title);
  const noticeTextX = x0 + u(S.notice.pad) + u(S.notice.icon) + u(10);
  const noticeY = cardY;
  const notice: Rect = { x: x0, y: noticeY, w: inner, h: u(S.notice.pad) * 2 + u(S.notice.line) * 2 + u(8) + u(32) + u(6) };
  const lead = textWidth(STRINGS.savedTitleLead, { size: nTitle, weight: 600 });
  const word = textWidth(STRINGS.savedTitleWord, { size: nTitle, weight: 600 });
  const verifiedWord: Rect = { x: noticeTextX + lead, y: noticeY + u(S.notice.pad), w: word, h: u(S.notice.line) };
  // the saved view below the notice: "Anchors" (22) + 10 + chip (22) + 16 + chip (22), then the panel padding
  const savedBottom = notice.y + notice.h + u(18) + u(22) + u(10) + u(22) + u(16) + u(22) + u(PAD);
  const panelSaved: Rect = { x: p.x, y: p.y, w: W, h: savedBottom - p.y };
  return { panel, card, field, row1, row2, chip1, chip2, check2, save, notice, verifiedWord, panelSaved, chipFont: u(S.row.chip), noticeFont: nTitle };
}

// ---- pieces ----

const Chip: React.FC<{ text: string; size: number; k: number; style?: React.CSSProperties }> = ({ text, size, k, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 22 * k,
      padding: `0 ${5 * k}px`,
      borderRadius: 5 * k,
      background: DAY.surfaceSunk,
      color: DAY.text,
      fontFamily: FONT.mono,
      fontSize: size,
      letterSpacing: "-0.01em",
      whiteSpace: "pre",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {text}
  </span>
);

/** A checkbox in our colours: Fathom fill and a Paper check when on (no Atlassian blue). `on` is 0..1. */
const Check: React.FC<{ on: number; k: number }> = ({ on, k }) => {
  const s = 18 * k;
  const pop = on > 0 && on < 1 ? 0.86 + 0.14 * on : 1;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: s,
        height: s,
        borderRadius: 4.5 * k,
        boxSizing: "border-box",
        border: `${1.5 * k}px solid ${DAY.lineStrong}`,
        background: DAY.surface,
        flex: "none",
      }}
    >
      {on > 0 ? (
        <span
          style={{
            position: "absolute",
            inset: -1.5 * k,
            borderRadius: 4.5 * k,
            background: DAY.text,
            opacity: Math.min(1, on * 1.6),
            transform: `scale(${pop})`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="check" size={15 * k} color={DAY.ground} />
        </span>
      ) : null}
    </span>
  );
};

/** One suggestion row: checkbox, the literal (docked by the scene), its note and an optional Weak tag. */
const Row: React.FC<{
  k: number;
  rect: Rect;
  at: number;
  checked: number;
  code: string;
  note: React.ReactNode;
  weak?: boolean;
  frame: number;
}> = ({ k, rect, at, checked, code, note, weak, frame }) => {
  if (frame < at) return null;
  // the chip is there on the docking frame (the flying copy lands on it); the note and tag set in just after
  const noteIn = tween(frame, at + 1, at + 9, 0, 1, EASE.expoOut);
  const boxIn = tween(frame, at - 2, at + 6, 0, 1, EASE.expoOut);
  return (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, height: rect.h, display: "flex", alignItems: "center", gap: 8 * k, whiteSpace: "nowrap" }}>
      <span style={{ opacity: boxIn, transform: `scale(${0.8 + 0.2 * boxIn})`, display: "inline-flex" }}>
        <Check on={checked} k={k} />
      </span>
      <Chip text={code} size={14 * k} k={k} />
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 * k, opacity: noteIn, transform: `translateX(${(1 - noteIn) * -10 * k}px)` }}>
        {note}
        {weak ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 21 * k,
              padding: `0 ${6.5 * k}px`,
              borderRadius: 5 * k,
              background: DAY.unanchoredTint,
              boxShadow: `inset 0 0 0 ${1 * k}px ${ink(0.12)}`,
              color: DAY.unanchored,
              fontFamily: FONT.sans,
              fontWeight: 500,
              fontSize: 13 * k,
            }}
          >
            {STRINGS.weak}
          </span>
        ) : null}
      </span>
    </div>
  );
};

/** A note word that rolls from one text to another at `at` (old up and out, new up and in). */
const RollText: React.FC<{ from: string; to: string; at: number; frame: number; style: React.CSSProperties }> = ({ from, to, at, frame, style }) => {
  const out = tween(frame, at, at + 6, 0, 1, EASE.expoIn);
  const inn = tween(frame, at + 3, at + 11, 0, 1, EASE.expoOut);
  return (
    <span style={{ display: "inline-grid", ...style }}>
      {out < 1 ? <span style={{ gridArea: "1 / 1", opacity: 1 - out, transform: `translateY(${-out * 40}%)` }}>{from}</span> : null}
      {inn > 0 ? <span style={{ gridArea: "1 / 1", opacity: inn, transform: `translateY(${(1 - inn) * 40}%)` }}>{to}</span> : null}
    </span>
  );
};

export const SuggestionsTwin: React.FC<SuggestionsTwinProps> = (props) => {
  const frame = useCurrentFrame();
  const { appear, rows, typed, check2, savePress, saved, verifiedLift, dim = 1, leave } = props;
  const k = props.k ?? 2;
  const u = (n: number) => n * k;
  const L = suggestionsLayout(props);
  if (frame < appear) return null;

  // arrival by lifting (M3): elevation 1 to 4 over 14 frames, rising 30 px; only the first 3 frames fade
  const up = tween(frame, appear, appear + 14, 0, 1, EASE.expoOut);
  const level = 1 + 3 * up;
  const fadeIn = tween(frame, appear, appear + 3, 0, 1, EASE.linear);

  const isSaved = saved !== undefined && frame >= saved;
  const savedIn = saved !== undefined ? tween(frame, saved, saved + 10, 0, 1, EASE.expoOut) : 0;

  // the repository field: placeholder, then the typed value with a caret
  const chars = typed ? Math.max(0, Math.min(STRINGS.repo.length, Math.floor((frame - typed.at + 1) * (STRINGS.repo.length / (typed.dur ?? STRINGS.repo.length))))) : 0;
  const typing = typed !== undefined && frame >= typed.at;
  const typedDone = typed !== undefined ? typed.at + (typed.dur ?? STRINGS.repo.length) : Infinity;
  const focus = typed !== undefined ? tween(frame, typed.at - 3, typed.at, 0, 1, EASE.linear) * (savePress !== undefined ? 1 - tween(frame, savePress - 4, savePress, 0, 1) : 1) : 0;
  const caretOn = typing && (frame < typedDone || Math.floor((frame - typedDone) / 8) % 2 === 0) && (savePress === undefined || frame < savePress - 4);

  const press = savePress !== undefined ? interpolate(frame - savePress, [-1, 0, 3, 6], [0, 1, 1, 0], clamp) : 0;
  const rel = (r: Rect) => ({ left: r.x - L.panel.x, top: r.y - L.panel.y, width: r.w, height: r.h });

  const c2 = check2 !== undefined ? tween(frame, check2, check2 + 5, 0, 1, EASE.expoOut) : 0;
  const repoNoteAt = typed ? typedDone : Infinity;

  const textStyle = (size: number, weight: number, color: string = DAY.text, line?: number): React.CSSProperties => ({
    fontFamily: FONT.sans,
    fontSize: u(size),
    fontWeight: weight,
    lineHeight: line ? `${u(line)}px` : 1.2,
    color,
  });

  const suggest = (
    <div style={{ position: "absolute", inset: 0, opacity: isSaved ? 1 - savedIn : 1, transform: isSaved ? `translateY(${-savedIn * u(10)}px)` : undefined }}>
      {/* the suggestions card */}
      <div style={{ position: "absolute", ...rel(L.card), borderRadius: u(10), boxShadow: `inset 0 0 0 ${u(1)}px ${DAY.line}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: L.card.x - L.panel.x + u(CARD_PAD), top: L.card.y - L.panel.y + u(CARD_PAD), width: L.card.w - 2 * u(CARD_PAD) }}>
        <div style={textStyle(S.title.size, S.title.weight, DAY.text, S.title.line)}>{STRINGS.suggested}</div>
        <div style={{ ...textStyle(S.help.size, S.help.weight, DAY.textMuted, S.help.line), marginTop: u(5) }}>{STRINGS.suggestedHelp}</div>
        <div style={{ ...textStyle(S.label.size, S.label.weight, DAY.text, S.label.line), marginTop: u(11) }}>{STRINGS.suggestRepo}</div>
      </div>
      {/* the repository field */}
      <div
        style={{
          position: "absolute",
          ...rel(L.field),
          borderRadius: u(6),
          boxSizing: "border-box",
          boxShadow: `inset 0 0 0 ${u(1) + u(0.5) * focus}px ${focus > 0.5 ? DAY.text : DAY.lineStrong}`,
          display: "flex",
          alignItems: "center",
          paddingLeft: u(12),
          ...textStyle(S.field.size, 400),
          whiteSpace: "pre",
        }}
      >
        {chars === 0 ? <span style={{ color: DAY.textMuted, opacity: 0.75 }}>{STRINGS.repo}</span> : <span>{STRINGS.repo.slice(0, chars)}</span>}
        {caretOn ? <span style={{ display: "inline-block", width: u(1), height: u(19), background: DAY.text, marginLeft: chars === 0 ? -textWidth(STRINGS.repo, { size: u(S.field.size) }) : u(1) }} /> : null}
      </div>
      {/* the two suggestions */}
      <Row k={k} frame={frame} rect={relRect(L.row1, L.panel)} at={rows[0]} checked={tween(frame, rows[0], rows[0] + 5, 0, 1, EASE.expoOut)} code={STRINGS.row1Code} note={<span style={textStyle(S.row.note, 600)}>{STRINGS.row1Note}</span>} />
      <Row
        k={k}
        frame={frame}
        rect={relRect(L.row2, L.panel)}
        at={rows[1]}
        checked={c2}
        code={STRINGS.row2Code}
        weak
        note={<RollText from={STRINGS.row2Need} to={STRINGS.row2In} at={repoNoteAt} frame={frame} style={textStyle(S.row.note, 600)} />}
      />
      {/* save */}
      <div
        style={{
          position: "absolute",
          ...rel(L.save),
          borderRadius: u(6),
          background: DAY.text,
          display: "grid",
          placeItems: "center",
          ...textStyle(S.button.size, 600, DAY.ground),
          transform: `scale(${1 - 0.035 * press})`,
          boxShadow: `0 ${u(1)}px ${u(3)}px ${ink(0.18 - 0.08 * press)}`,
          filter: press > 0 ? `brightness(${1 - 0.25 * press})` : undefined,
        }}
      >
        {STRINGS.saveAnchors}
      </div>
      <div style={{ position: "absolute", left: L.save.x - L.panel.x, top: L.save.y - L.panel.y + L.save.h + u(7), width: L.panel.w - 2 * u(PAD), ...textStyle(S.helper.size, 400, DAY.textMuted, S.helper.line) }}>
        {STRINGS.saveHelp}
      </div>
    </div>
  );

  const liftT = verifiedLift !== undefined ? tween(frame, verifiedLift, verifiedLift + 3, 0, 1, EASE.linear) : 0;
  const savedView = isSaved ? (
    <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, savedIn * 1.4), transform: `translateY(${(1 - savedIn) * u(14)}px)` }}>
      <div
        style={{
          position: "absolute",
          ...rel(L.notice),
          borderRadius: u(10),
          background: DAY.verifiedTint,
          boxSizing: "border-box",
          padding: `${u(S.notice.pad)}px ${u(S.notice.pad)}px`,
          display: "flex",
          gap: u(10),
        }}
      >
        <span style={{ width: u(S.notice.icon), height: u(S.notice.icon), borderRadius: "50%", background: DAY.verified, display: "grid", placeItems: "center", flex: "none", marginTop: u(0.5) }}>
          <Icon name="check" size={u(15)} color={DAY.surface} />
        </span>
        <div>
          <div style={{ ...textStyle(S.notice.title, 600, DAY.text, S.notice.line), whiteSpace: "pre" }}>
            {STRINGS.savedTitleLead}
            <span style={{ position: "relative", display: "inline-block" }}>
              {liftT > 0 ? <span style={{ position: "absolute", inset: `${u(1)}px ${-u(2)}px`, borderRadius: u(3), background: DAY.trace, opacity: liftT }} /> : null}
              <span style={{ opacity: 1 - liftT }}>{STRINGS.savedTitleWord}</span>
            </span>
            {STRINGS.savedTitleTail}
          </div>
          <div style={{ ...textStyle(S.notice.body, 400, DAY.text, S.notice.line), marginTop: u(4) }}>{STRINGS.reloadBadge}</div>
          <div
            style={{
              marginTop: u(8),
              display: "inline-flex",
              alignItems: "center",
              height: u(32),
              padding: `0 ${u(12)}px`,
              borderRadius: u(6),
              boxShadow: `inset 0 0 0 ${u(1)}px ${DAY.lineStrong}`,
              ...textStyle(S.notice.body, 600),
            }}
          >
            {STRINGS.reloadButton}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: L.notice.x - L.panel.x, top: L.notice.y - L.panel.y + L.notice.h + u(18), width: L.notice.w }}>
        <div style={textStyle(S.title.size - 2, 600, DAY.text, 22)}>{STRINGS.anchors}</div>
        {[STRINGS.saved1, STRINGS.saved2].map((t, i) => (
          <div key={t} style={{ marginTop: u(i === 0 ? 10 : 8), paddingTop: u(i === 0 ? 0 : 8), borderTop: i === 0 ? undefined : `${u(1)}px solid ${DAY.line}` }}>
            <Chip text={t} size={u(S.row.chip)} k={k} />
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const panelH = L.panel.h + (L.panelSaved.h - L.panel.h) * savedIn;
  const away = leave !== undefined ? tween(frame, leave, leave + 12, 0, 1, EASE.expoIn) : 0;
  if (away >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: L.panel.x,
        top: L.panel.y,
        width: L.panel.w,
        height: panelH,
        opacity: fadeIn * dim < 1 ? fadeIn * dim : undefined,
        transform: `translate(${away * 1500}px, ${(1 - up) * 30}px) scale(${0.975 + 0.025 * up})`,
        transformOrigin: "50% 100%",
      }}
    >
      <div style={{ position: "absolute", inset: 0, borderRadius: u(18), background: DAY.surface, boxShadow: elevAt(level) }} />
      {suggest}
      {savedView}
    </div>
  );
};

const relRect = (r: Rect, panel: Rect): Rect => ({ x: r.x - panel.x, y: r.y - panel.y, w: r.w, h: r.h });
