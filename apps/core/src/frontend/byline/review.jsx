// The review panel (F5, UX flow 4): what changed, the affected sections, rename proposals, and the
// footer actions. Layout follows the canvas Interface kit board (brand/design-reference.md).
import React, { useState } from 'react';
import {
  Box,
  ButtonGroup,
  Code,
  CodeBlock,
  Heading,
  HelperMessage,
  Inline,
  Label,
  LoadingButton,
  Select,
  Stack,
  Strong,
  Text,
  xcss,
} from '@forge/react';
import { SeverityLozenge } from '../shared/components';
import { excerptBlocks } from '../shared/excerpt';
import { PROPOSE_FIX_HELP, diffText, fixAttribution, proposalSource } from '../shared/fix';
import { DISMISS_REASONS, eventLead, fileChangeParts, plural, relativeTime } from '../shared/format';

const rowStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'radius.medium',
  padding: 'space.150',
});

const MAX_FILES = 5;

function FileChangeLine({ file }) {
  const p = fileChangeParts(file);
  return (
    <Text size="small">
      {p.from ? (
        <>
          <Code>{p.from}</Code> {p.verb} <Code>{p.path}</Code>
        </>
      ) : (
        <>
          <Code>{p.path}</Code> {p.verb}
        </>
      )}
    </Text>
  );
}

function EventRow({ event, now }) {
  const when = relativeTime(event.at, now);
  const files = event.files || [];
  const isJira = event.source === 'jira';
  return (
    <Box xcss={rowStyle}>
      <Stack space="space.075">
        <Inline spread="space-between" alignBlock="start" space="space.100">
          <Text>
            {isJira ? (
              <>
                <Code>{event.ref}</Code>
                {event.summary ? ` ${event.summary}` : ''}
              </>
            ) : (
              <Strong>{eventLead(event)}</Strong>
            )}
            {when ? ` · ${when}` : ''}
          </Text>
          <SeverityLozenge severity={event.severity} />
        </Inline>
        {!isJira && event.title ? <Text color="color.text.subtle">{event.title}</Text> : null}
        {!isJira && files.length ? (
          <Stack space="space.025">
            {files.slice(0, MAX_FILES).map((f) => (
              <FileChangeLine key={`${f.oldPath || ''}>${f.path}`} file={f} />
            ))}
            {files.length > MAX_FILES ? <Text size="small">and {plural(files.length - MAX_FILES, 'more file')}</Text> : null}
          </Stack>
        ) : null}
        {!isJira && !files.length && event.summary ? <Text size="small">{event.summary}</Text> : null}
        {event.anchor ? (
          <Text size="small">
            Anchor <Code>{event.anchor}</Code>
          </Text>
        ) : null}
        {event.reasons?.length ? (
          <Text size="small" color="color.text.subtlest">
            {event.reasons.join(' · ')}
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

// Polish item 6: matched code lines render in code style, not flattened into the prose.
function Excerpt({ section }) {
  const blocks = excerptBlocks(section.excerpt || '', section.matchedTokens || [], section.codeLines);
  return (
    <Box xcss={rowStyle}>
      <Stack space="space.075">
        {section.heading ? <Heading size="xsmall">{section.heading}</Heading> : null}
        {blocks.map((b, i) =>
          b.type === 'code' ? <CodeBlock key={i} text={b.text} language="text" shouldWrapLongLines /> : <InlineParts key={i} parts={b.parts} />,
        )}
      </Stack>
    </Box>
  );
}

function ProposalRow({ proposal, events, canEdit, busy, onAccept, onReject }) {
  const source = proposalSource(proposal, events);
  const who = proposal.createdBy?.displayName;
  const when = relativeTime(proposal.createdAt);
  const requested = [who ? `Requested by ${who}` : '', when].filter(Boolean).join(' · ');
  const writesOff = !canEdit || Boolean(busy);
  return (
    <Box xcss={rowStyle}>
      <Stack space="space.100">
        {proposal.sectionHeading ? <Heading size="xsmall">{proposal.sectionHeading}</Heading> : null}
        <CodeBlock text={diffText(proposal.originalText, proposal.proposedText)} language="diff" shouldWrapLongLines />
        {proposal.rationale ? <Text>{proposal.rationale}</Text> : null}
        <Text size="small" color="color.text.subtle">
          {fixAttribution(source)}
        </Text>
        {requested ? (
          <Text size="small" color="color.text.subtlest">
            {requested}
          </Text>
        ) : null}
        <ButtonGroup label="Proposed fix">
          <LoadingButton appearance="primary" isLoading={busy === `fix:${proposal.id}`} isDisabled={writesOff} onClick={onAccept}>
            Accept fix
          </LoadingButton>
          <LoadingButton isLoading={busy === `reject:${proposal.id}`} isDisabled={writesOff} onClick={onReject}>
            Reject
          </LoadingButton>
        </ButtonGroup>
      </Stack>
    </Box>
  );
}

/**
 * The "Proposed fix" section (F11, D6): open proposals only. Accept writes the page `asUser()` with a
 * version message naming the PR; both buttons are off for view-only users (D15).
 */
export function ProposedFixSection({ proposals, events, canEdit, busy, onAccept, onReject }) {
  if (!proposals?.length) return null;
  return (
    <Stack space="space.100">
      <Heading size="small">Proposed fix</Heading>
      {proposals.map((p) => (
        <ProposalRow key={p.id} proposal={p} events={events} canEdit={canEdit} busy={busy} onAccept={() => onAccept(p)} onReject={() => onReject(p)} />
      ))}
    </Stack>
  );
}

function RenameRow({ proposal, canEdit, busy, onAccept, onKeep }) {
  return (
    <Box xcss={rowStyle}>
      <Inline spread="space-between" alignBlock="center" space="space.100" shouldWrap>
        <Text>
          <Code>{proposal.from}</Code> was renamed to <Code>{proposal.to}</Code>. Move the anchor?
        </Text>
        <ButtonGroup label="Rename proposal">
          <LoadingButton isLoading={busy === `accept:${proposal.id}`} isDisabled={!canEdit || Boolean(busy)} onClick={onAccept}>
            Accept
          </LoadingButton>
          <LoadingButton appearance="subtle" isLoading={busy === `keep:${proposal.id}`} isDisabled={!canEdit || Boolean(busy)} onClick={onKeep}>
            Keep
          </LoadingButton>
        </ButtonGroup>
      </Inline>
    </Box>
  );
}

/**
 * Props: `events` (open only, High first), `allEvents` (for proposal attribution), `affectedSections`,
 * `renameProposals`, `proposals` (open only), `canEdit`, `busy` (the key of the running action, or
 * ''), and the action callbacks.
 */
export function ReviewPanel({
  events,
  allEvents,
  affectedSections,
  renameProposals,
  proposals,
  canEdit,
  busy,
  onVerify,
  onDismiss,
  onSnooze,
  onAcceptRename,
  onRejectRename,
  onProposeFix,
  onAcceptFix,
  onRejectFix,
}) {
  const [reason, setReason] = useState(null);
  const now = Date.now();
  const writesOff = !canEdit || Boolean(busy);
  // One primary per view: with a draft open, Accept fix is the primary action, not Mark verified.
  const hasDraft = Boolean(proposals?.length);

  return (
    <Stack space="space.300">
      <Stack space="space.100">
        <Heading size="small">What changed</Heading>
        {events.map((e) => (
          <EventRow key={e.id} event={e} now={now} />
        ))}
      </Stack>

      <Stack space="space.100">
        <Heading size="small">Affected section</Heading>
        {affectedSections?.length ? (
          affectedSections.map((s, i) => <Excerpt key={`${s.heading || ''}-${i}`} section={s} />)
        ) : (
          <Text>No section on this page names the changed files. Read the whole page before you verify it.</Text>
        )}
      </Stack>

      <ProposedFixSection proposals={proposals} events={allEvents || events} canEdit={canEdit} busy={busy} onAccept={onAcceptFix} onReject={onRejectFix} />

      {renameProposals?.length ? (
        <Stack space="space.100">
          <Heading size="small">Renamed anchors</Heading>
          {renameProposals.map((p) => (
            <RenameRow key={p.id} proposal={p} canEdit={canEdit} busy={busy} onAccept={() => onAcceptRename(p)} onKeep={() => onRejectRename(p)} />
          ))}
        </Stack>
      ) : null}

      <Stack space="space.150">
        <Stack space="space.050">
          <Label labelFor="dismiss-reason">Dismiss reason</Label>
          <Select
            inputId="dismiss-reason"
            placeholder="Choose a reason to dismiss"
            options={DISMISS_REASONS.map((r) => ({ label: r.label, value: r.value }))}
            value={reason}
            onChange={(o) => setReason(o)}
            isDisabled={writesOff}
          />
          <HelperMessage>Dismissing closes {events.length === 1 ? 'this change' : `all ${events.length} changes`} without editing the page.</HelperMessage>
        </Stack>
        <Inline space="space.100" shouldWrap alignBlock="center">
          <LoadingButton isLoading={busy === 'dismiss'} isDisabled={writesOff || !reason} onClick={() => onDismiss(reason.value, reason.label)}>
            Dismiss
          </LoadingButton>
          <LoadingButton isLoading={busy === 'snooze'} isDisabled={writesOff} onClick={onSnooze}>
            Snooze 7 days
          </LoadingButton>
          <LoadingButton appearance={hasDraft ? 'default' : 'primary'} isLoading={busy === 'verify'} isDisabled={writesOff} onClick={onVerify}>
            Mark verified
          </LoadingButton>
          <LoadingButton isLoading={busy === 'propose'} isDisabled={writesOff} onClick={onProposeFix}>
            Propose fix
          </LoadingButton>
        </Inline>
        <HelperMessage>{PROPOSE_FIX_HELP}</HelperMessage>
      </Stack>
    </Stack>
  );
}
