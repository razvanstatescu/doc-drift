// The review panel (F5, UX flow 4). Hierarchy follows the canvas Interface kit board
// (brand/design-reference.md): What changed, Affected section, Proposed fix, then the footer actions
// (Dismiss · Snooze 7 days · Mark verified · Accept fix). The state summary sits above, in index.jsx.
import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
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
import { COPY, acceptAllHelp, dismissConfirm, dismissHelp, showAll } from '../shared/copy';
import { Muted, Notice, SPACE, Section, SeverityLozenge, cardStyle } from '../shared/components';
import { excerptBlocks } from '../shared/excerpt';
import { PROPOSE_FIX_HELP, diffText, fixAttribution, groupBySection, proposalSource } from '../shared/fix';
import { DISMISS_REASONS, clipLines, compactFile, gateNote, isViewOnly, jiraChangeLines, plural, refLabel, relativeTime } from '../shared/format';

const MAX_FILES = 5;
const MAX_EVENTS = 5;
const MAX_DIFF_LINES = 40;

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

/** D30: hunks only reach editors (`evidenceLevel: 'full'`). Long hunks are clipped, not scrolled. */
function DiffPreview({ text }) {
  const clip = clipLines(text, MAX_DIFF_LINES);
  if (!clip.text) return null;
  return (
    <Stack space={SPACE.tight}>
      <CodeBlock text={clip.text} language="diff" shouldWrapLongLines />
      {clip.hidden > 0 ? <Muted tone="subtlest">{`${plural(clip.hidden, 'more line')} not shown.`}</Muted> : null}
    </Stack>
  );
}

/** One change: ref, who and when on the left, severity on the right; files compact; reasons muted. */
function EventRow({ event, now, evidence }) {
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
        {event.reasons?.length ? <Muted tone="subtlest">{event.reasons.join(' · ')}</Muted> : null}
        {hunks ? <DiffPreview text={hunks} /> : null}
        {isJira && event.changelog?.length
          ? jiraChangeLines(event.changelog).map((line, i) => (
              <Text key={i} size="small" maxLines={3}>
                {line}
              </Text>
            ))
          : null}
        {event.url ? (
          <Text size="small">
            <Link href={event.url} openNewTab>{`View ${ref} in Bitbucket`}</Link>
          </Text>
        ) : null}
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

/** Dismiss needs a reason: the footer's Dismiss opens this form, and the reason feeds the dampener. */
function DismissForm({ count, busy, onConfirm, onCancel }) {
  const [reason, setReason] = useState(null);
  const chosen = DISMISS_REASONS.find((r) => r.value === reason);
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
        <ButtonGroup label="Dismiss">
          <LoadingButton isLoading={busy === 'dismiss'} isDisabled={!chosen || Boolean(busy)} onClick={() => onConfirm(chosen.value, chosen.label)}>
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
  const footerKeys = ['dismiss', 'snooze', 'verify', hasDraft ? 'acceptFix' : 'proposeFix'];
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
            onCancel={() => setDismissing(false)}
            onConfirm={async (value, label) => {
              await onDismiss(value, label);
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
