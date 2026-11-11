// The review panel (F5, UX flow 4). Hierarchy follows the canvas Interface kit board
// (brand/design-reference.md): What changed, Affected section, Proposed fix, then the footer actions
// (Dismiss · Snooze 7 days · Mark verified · Accept fix). The state summary sits above, in index.jsx.
import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Code,
  CodeBlock,
  Heading,
  HelperMessage,
  Inline,
  Label,
  Link,
  LoadingButton,
  Lozenge,
  RadioGroup,
  Stack,
  Strong,
  Text,
} from '@forge/react';
import { COPY, acceptAllHelp, dismissConfirm, dismissHelp, quickFixSource, showAll } from '../shared/copy';
import { CodeText, Muted, Notice, SPACE, Section, SeverityLozenge, cardStyle } from '../shared/components';
import { excerptBlocks } from '../shared/excerpt';
import { PROPOSE_FIX_HELP, diffText, fixAttribution, groupBySection, proposalSource } from '../shared/fix';
import {
  DISMISS_REASONS,
  clipLines,
  compactFile,
  gateNote,
  isViewOnly,
  jiraChangeLines,
  plural,
  quickFixButton,
  quickFixPlaces,
  refLabel,
  relativeTime,
  stopWatchTargets,
  stripGitHeaders,
} from '../shared/format';

const MAX_FILES = 5;
const MAX_EVENTS = 5;
const MAX_DIFF_LINES = 30;

function FileLine({ file }) {
  const f = compactFile(file);
  const counts = f.counts ? ` · ${f.counts}` : '';
  return (
    <Text size="small">
      {f.from ? (
        <>
          <Code>{f.from}</Code> → <Code>{f.path}</Code>
        </>
      ) : (
        <>
          <Code>{f.path}</Code>
          {f.status === 'changed' ? '' : ` ${f.status}`}
        </>
      )}
      {counts}
    </Text>
  );
}

/**
 * D30: hunks only reach editors (`evidenceLevel: 'full'`). UX-4: the diff sits behind Show diff,
 * without git plumbing lines, and long hunks are clipped, not scrolled.
 */
function DiffPreview({ text }) {
  const clip = clipLines(stripGitHeaders(text), MAX_DIFF_LINES);
  if (!clip.text) return null;
  return (
    <Stack space={SPACE.tight}>
      <CodeBlock text={clip.text} language="diff" shouldWrapLongLines />
      {clip.hidden > 0 ? <Muted tone="subtlest">{`${plural(clip.hidden, 'more line')} not shown.`}</Muted> : null}
    </Stack>
  );
}

/**
 * One change, summary first (UX-4): ref, who and when, severity; the why sentence; the files as a
 * compact list; the anchor; the reasons. The raw diff waits behind Show diff.
 */
function EventRow({ event, now, evidence }) {
  const [showDiff, setShowDiff] = useState(false);
  const isJira = event.source === 'jira';
  const when = relativeTime(event.at, now);
  const ref = refLabel(event.ref || '', event.source);
  const files = event.files || [];
  const who = isJira ? (event.summary ? ` ${event.summary}` : '') : event.author ? ` merged by ${event.author}` : '';
  const hunks = evidence === 'full' && !isJira ? event.diff || event.hunks : null;
  return (
    <Box xcss={cardStyle}>
      <Stack space="space.075">
        <Inline spread="space-between" alignBlock="start" space={SPACE.row}>
          <Text>
            <Code>{ref}</Code>
            {who}
            {when ? ` · ${when}` : ''}
          </Text>
          <Inline space={SPACE.tight} alignBlock="center">
            {event.status === 'snoozed' ? <Lozenge>{COPY.snoozedLozenge}</Lozenge> : null}
            <SeverityLozenge severity={event.severity} />
          </Inline>
        </Inline>
        {event.whySentence ? <CodeText text={event.whySentence} /> : null}
        {!isJira && event.title ? <Text color="color.text.subtle">{event.title}</Text> : null}
        {!isJira && files.length ? (
          <Stack space="space.025">
            {files.slice(0, MAX_FILES).map((f) => (
              <FileLine key={`${f.oldPath || ''}>${f.path}`} file={f} />
            ))}
            {files.length > MAX_FILES ? <Muted>{`and ${plural(files.length - MAX_FILES, 'more file')}`}</Muted> : null}
          </Stack>
        ) : null}
        {!isJira && !files.length && event.summary ? <Text size="small">{event.summary}</Text> : null}
        {event.anchor ? (
          <Text size="small">
            Anchor <Code>{event.anchor}</Code>
          </Text>
        ) : null}
        {event.reasons?.length && !event.whySentence ? (
          <Stack space="space.025">
            {event.reasons.map((r, i) => (
              <CodeText key={i} text={r} size="small" color="color.text.subtlest" />
            ))}
          </Stack>
        ) : null}
        {isJira && event.changelog?.length
          ? jiraChangeLines(event.changelog).map((line, i) => (
              <Text key={i} size="small" maxLines={3}>
                {line}
              </Text>
            ))
          : null}
        {hunks || event.url ? (
          <Inline space={SPACE.row} alignBlock="center" shouldWrap>
            {hunks ? (
              <Button appearance="subtle" onClick={() => setShowDiff((v) => !v)}>
                {showDiff ? COPY.hideDiff : COPY.showDiff}
              </Button>
            ) : null}
            {event.url ? (
              <Text size="small">
                <Link href={event.url} openNewTab>{`View ${ref} in Bitbucket`}</Link>
              </Text>
            ) : null}
          </Inline>
        ) : null}
        {hunks && showDiff ? <DiffPreview text={hunks} /> : null}
      </Stack>
    </Box>
  );
}

function InlineParts({ parts }) {
  return (
    <Text>
      {parts.map((p, i) =>
        p.kind === 'code' ? <Code key={i}>{p.text}</Code> : p.kind === 'match' ? <Strong key={i}>{p.text}</Strong> : <React.Fragment key={i}>{p.text}</React.Fragment>,
      )}
    </Text>
  );
}

// Matched code lines render in code style, not flattened into the prose.
function Excerpt({ section }) {
  const blocks = excerptBlocks(section.excerpt || '', section.matchedTokens || [], section.codeLines);
  return (
    <Box xcss={cardStyle}>
      <Stack space="space.075">
        {section.heading ? (
          <Heading size="xsmall" as="h4">
            {section.heading}
          </Heading>
        ) : null}
        {blocks.map((b, i) =>
          b.type === 'code' ? <CodeBlock key={i} text={b.text} language="text" shouldWrapLongLines /> : <InlineParts key={i} parts={b.parts} />,
        )}
      </Stack>
    </Box>
  );
}

/** One draft. Its buttons use the default appearance; the footer's Accept fix is the primary action. */
function ProposalRow({ proposal, events, canAccept, busy, onAccept, onReject, groupLabel }) {
  const source = proposalSource(proposal, events);
  const who = proposal.createdBy?.displayName;
  const when = relativeTime(proposal.createdAt);
  const requested = [who ? `Requested by ${who}` : '', when].filter(Boolean).join(' · ');
  const off = !canAccept || Boolean(busy);
  return (
    <Box xcss={cardStyle}>
      <Stack space={SPACE.row}>
        <CodeBlock text={diffText(proposal.originalText, proposal.proposedText)} language="diff" shouldWrapLongLines />
        {proposal.rationale ? <Text>{proposal.rationale}</Text> : null}
        <Muted>{fixAttribution(source)}</Muted>
        {requested ? <Muted tone="subtlest">{requested}</Muted> : null}
        <ButtonGroup label={groupLabel}>
          <LoadingButton isLoading={busy === `fix:${proposal.id}`} isDisabled={off} onClick={onAccept}>
            {COPY.acceptDraft}
          </LoadingButton>
          <LoadingButton appearance="subtle" isLoading={busy === `reject:${proposal.id}`} isDisabled={off} onClick={onReject}>
            {COPY.rejectDraft}
          </LoadingButton>
        </ButtonGroup>
      </Stack>
    </Box>
  );
}

/**
 * "Proposed fix" (F11, D6): open drafts grouped by section (D29: one draft per block, so a section can
 * have several, with "Accept all for this section"). With no drafts and `onProposeFix`, it offers
 * Propose fix instead. Accepting writes the page `asUser()` with a version message naming the PR.
 */
export function ProposedFixSection({ proposals, events, caps, busy, onAccept, onReject, onAcceptAll, onProposeFix }) {
  const has = Boolean(proposals?.length);
  if (!has && !onProposeFix) return null;
  const canAccept = Boolean(caps?.acceptFix);
  if (!has) {
    return (
      <Section title={COPY.proposedFix}>
        <Muted>{PROPOSE_FIX_HELP}</Muted>
        <Inline>
          <LoadingButton isLoading={busy === 'propose'} isDisabled={!caps?.proposeFix || Boolean(busy)} onClick={onProposeFix}>
            {COPY.proposeFix}
          </LoadingButton>
        </Inline>
      </Section>
    );
  }
  const groups = groupBySection(proposals);
  return (
    <Section title={COPY.proposedFix} space={SPACE.group}>
      {groups.map((g) => {
        const name = g.heading || 'this section';
        return (
          <Stack key={g.key} space={SPACE.row}>
            {g.heading ? (
              <Heading size="xsmall" as="h4">
                {g.heading}
              </Heading>
            ) : null}
            {g.proposals.map((p, i) => (
              <ProposalRow
                key={p.id}
                proposal={p}
                events={events}
                canAccept={canAccept}
                busy={busy}
                groupLabel={g.proposals.length > 1 ? `Draft ${i + 1} of ${g.proposals.length} for ${name}` : `Draft for ${name}`}
                onAccept={() => onAccept(p)}
                onReject={() => onReject(p)}
              />
            ))}
            {g.proposals.length > 1 && onAcceptAll ? (
              <Inline>
                <LoadingButton isLoading={busy === `fixall:${g.key}`} isDisabled={!canAccept || Boolean(busy)} onClick={() => onAcceptAll(g.proposals, g.key)}>
                  {COPY.acceptAllSection}
                </LoadingButton>
              </Inline>
            ) : null}
          </Stack>
        );
      })}
    </Section>
  );
}

/**
 * R-4: "Replace `old` with `new` in 2 places", from a rename the matcher saw. No AI. Applying edits
 * the page asUser() with a version message naming the PR (backend), so it needs canAcceptFix.
 */
function QuickFixSection({ fixes, events, canAccept, busy, onApply }) {
  if (!fixes?.length) return null;
  return (
    <Section title={COPY.quickFix}>
      {fixes.map((fix) => {
        const event = (events || []).find((e) => e.id === fix.eventId);
        const ref = event ? refLabel(event.ref || '', event.source) : '';
        const n = quickFixPlaces(fix);
        return (
          <Box key={fix.eventId} xcss={cardStyle}>
            <Stack space={SPACE.row}>
              <Text>
                Replace <Code>{fix.from}</Code> with <Code>{fix.to}</Code>
                {n ? ` in ${plural(n, 'place')}.` : '.'}
              </Text>
              <Muted>{`${quickFixSource(ref)} ${COPY.quickFixHelp}`}</Muted>
              <Inline>
                <LoadingButton isLoading={busy === `qf:${fix.eventId}`} isDisabled={!canAccept || Boolean(busy)} onClick={() => onApply(fix)}>
                  {quickFixButton(fix)}
                </LoadingButton>
              </Inline>
            </Stack>
          </Box>
        );
      })}
    </Section>
  );
}

function RenameRow({ proposal, canEdit, busy, onAccept, onKeep }) {
  const off = !canEdit || Boolean(busy);
  return (
    <Box xcss={cardStyle}>
      <Stack space={SPACE.row}>
        <Text>
          <Code>{proposal.from}</Code> was renamed to <Code>{proposal.to}</Code>. Move the anchor?
        </Text>
        <ButtonGroup label={`Rename of ${proposal.from}`}>
          <LoadingButton isLoading={busy === `accept:${proposal.id}`} isDisabled={off} onClick={onAccept}>
            {COPY.acceptRename}
          </LoadingButton>
          <LoadingButton appearance="subtle" isLoading={busy === `keep:${proposal.id}`} isDisabled={off} onClick={onKeep}>
            {COPY.keepRename}
          </LoadingButton>
        </ButtonGroup>
      </Stack>
    </Box>
  );
}

/**
 * Dismiss needs a reason: the footer's Dismiss opens this form, and the reason feeds the dampener.
 * R-7: with "Not relevant", each anchored path can also stop being watched for this page.
 */
function DismissForm({ count, busy, targets, canNarrow, onConfirm, onCancel }) {
  const [reason, setReason] = useState(null);
  const [stops, setStops] = useState({});
  const chosen = DISMISS_REASONS.find((r) => r.value === reason);
  const narrowing = reason === 'not_relevant' && canNarrow && targets.length > 0;
  const picked = narrowing ? targets.filter((t) => stops[t.path]) : [];
  return (
    <Box xcss={cardStyle}>
      <Stack space={SPACE.group}>
        <Stack space={SPACE.tight}>
          <Label labelFor="dds-dismiss-reason" id="dds-dismiss-reason-label">
            {COPY.dismissReason}
          </Label>
          <RadioGroup
            name="dds-dismiss-reason"
            aria-labelledby="dds-dismiss-reason-label"
            options={DISMISS_REASONS.map((r) => ({ name: 'dds-dismiss-reason', label: r.label, value: r.value }))}
            value={reason}
            onChange={(e) => setReason(e?.target?.value ?? e?.value ?? null)}
            isDisabled={Boolean(busy)}
          />
          <HelperMessage>{dismissHelp(count)}</HelperMessage>
        </Stack>
        {narrowing ? (
          <Stack space={SPACE.tight}>
            {targets.map((t, i) => (
              <Inline key={t.path} space={SPACE.tight} alignBlock="center">
                <Checkbox
                  id={`dds-stop-watch-${i}`}
                  value={t.path}
                  isChecked={Boolean(stops[t.path])}
                  onChange={(e) => setStops((cur) => ({ ...cur, [t.path]: Boolean(e?.target?.checked) }))}
                  isDisabled={Boolean(busy)}
                />
                <Label labelFor={`dds-stop-watch-${i}`}>
                  Stop watching <Code>{t.path}</Code> for this page
                </Label>
              </Inline>
            ))}
            <HelperMessage>Changes to a path you check stop flagging this page. Other anchors keep watching.</HelperMessage>
          </Stack>
        ) : null}
        <ButtonGroup label="Dismiss">
          <LoadingButton isLoading={busy === 'dismiss'} isDisabled={!chosen || Boolean(busy)} onClick={() => onConfirm(chosen.value, chosen.label, picked)}>
            {dismissConfirm(count)}
          </LoadingButton>
          <Button appearance="subtle" isDisabled={busy === 'dismiss'} onClick={onCancel}>
            {COPY.cancel}
          </Button>
        </ButtonGroup>
      </Stack>
    </Box>
  );
}

/**
 * Props: `events` (the review list: open and snoozed, High first), `allEvents` (for draft attribution),
 * `affectedSections`, `renameProposals`, `proposals` (open drafts), `caps` (from `capabilities()`),
 * `evidence` ('summary' | 'full', D30), `busy` (the running action's key, or ''), `notice`, and the
 * action callbacks. `onAcceptAllFix()` with no arguments accepts every draft in page order.
 */
export function ReviewPanel({
  events,
  allEvents,
  affectedSections,
  renameProposals,
  proposals,
  caps,
  evidence,
  busy,
  notice,
  quickFixes,
  onQuickFix,
  onVerify,
  onDismiss,
  onSnooze,
  onAcceptRename,
  onRejectRename,
  onProposeFix,
  onAcceptFix,
  onAcceptAllFix,
  onAcceptSectionFix,
  onRejectFix,
}) {
  const [dismissing, setDismissing] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const now = Date.now();
  const n = events.length;
  const draftCount = proposals?.length ?? 0;
  // One primary per view: with drafts open, Accept fix is the primary action, not Mark verified.
  const hasDraft = draftCount > 0;
  const shown = showAllEvents ? events : events.slice(0, MAX_EVENTS);
  const footerKeys = ['dismiss', 'snooze', 'verify', hasDraft || quickFixes?.length ? 'acceptFix' : 'proposeFix'];
  // A view-only user already sees one "View only" notice at the top; no per-control reasons then.
  const note = isViewOnly(caps) ? '' : gateNote(caps, renameProposals?.length ? [...footerKeys, 'editAnchors'] : footerKeys);

  return (
    <Stack space={SPACE.section}>
      <Section title={COPY.whatChanged}>
        {evidence !== 'full' ? <Muted tone="subtlest">{COPY.summaryOnly}</Muted> : null}
        {shown.map((e) => (
          <EventRow key={e.id} event={e} now={now} evidence={evidence} />
        ))}
        {n > MAX_EVENTS && !showAllEvents ? (
          <Inline>
            <Button appearance="subtle" onClick={() => setShowAllEvents(true)}>
              {showAll(n, 'change')}
            </Button>
          </Inline>
        ) : null}
      </Section>

      <Section title={COPY.affectedSection}>
        {affectedSections?.length ? (
          affectedSections.map((s, i) => <Excerpt key={`${s.heading || ''}-${i}`} section={s} />)
        ) : (
          <Text>{COPY.noAffectedSection}</Text>
        )}
      </Section>

      <QuickFixSection fixes={quickFixes} events={allEvents || events} canAccept={caps.acceptFix} busy={busy} onApply={onQuickFix} />

      <ProposedFixSection
        proposals={proposals}
        events={allEvents || events}
        caps={caps}
        busy={busy}
        onAccept={onAcceptFix}
        onReject={onRejectFix}
        onAcceptAll={onAcceptSectionFix}
        onProposeFix={onProposeFix}
      />

      {renameProposals?.length ? (
        <Section title={COPY.renamedAnchors}>
          {renameProposals.map((p) => (
            <RenameRow key={p.id} proposal={p} canEdit={caps.editAnchors} busy={busy} onAccept={() => onAcceptRename(p)} onKeep={() => onRejectRename(p)} />
          ))}
        </Section>
      ) : null}

      <Stack space={SPACE.group}>
        <Notice notice={notice} />
        {dismissing ? (
          <DismissForm
            count={n}
            busy={busy}
            targets={stopWatchTargets(events)}
            canNarrow={caps.editAnchors}
            onCancel={() => setDismissing(false)}
            onConfirm={async (value, label, stops) => {
              await onDismiss(value, label, stops);
              setDismissing(false);
            }}
          />
        ) : (
          <Inline space={SPACE.row} shouldWrap>
            <Button isDisabled={!caps.dismiss || Boolean(busy)} onClick={() => setDismissing(true)}>
              {COPY.dismiss}
            </Button>
            <LoadingButton isLoading={busy === 'snooze'} isDisabled={!caps.snooze || Boolean(busy)} onClick={onSnooze}>
              {COPY.snooze}
            </LoadingButton>
            <LoadingButton appearance={hasDraft ? 'default' : 'primary'} isLoading={busy === 'verify'} isDisabled={!caps.verify || Boolean(busy)} onClick={onVerify}>
              {COPY.markVerified}
            </LoadingButton>
            {hasDraft ? (
              <LoadingButton appearance="primary" isLoading={busy === 'fixall:all'} isDisabled={!caps.acceptFix || Boolean(busy)} onClick={() => onAcceptAllFix()}>
                {COPY.acceptFix}
              </LoadingButton>
            ) : null}
          </Inline>
        )}
        {hasDraft && !dismissing ? <HelperMessage>{acceptAllHelp(draftCount)}</HelperMessage> : null}
        {note ? <HelperMessage>{note}</HelperMessage> : null}
      </Stack>
    </Stack>
  );
}
