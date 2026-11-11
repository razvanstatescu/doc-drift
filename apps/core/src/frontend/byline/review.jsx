// The review panel (F5, UX flow 4): what changed, the affected sections, rename proposals, and the
// footer actions. Layout follows the canvas Interface kit board (brand/design-reference.md).
import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Code,
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
import { DISMISS_REASONS, eventLead, fileChangeParts, plural, relativeTime, splitExcerpt } from '../shared/format';

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

function Excerpt({ section }) {
  const parts = splitExcerpt(section.excerpt || '', section.matchedTokens || []);
  return (
    <Box xcss={rowStyle}>
      <Stack space="space.050">
        {section.heading ? <Heading size="xsmall">{section.heading}</Heading> : null}
        <Text>
          {parts.map((p, i) => (p.match ? <Strong key={i}>{p.text}</Strong> : <React.Fragment key={i}>{p.text}</React.Fragment>))}
        </Text>
      </Stack>
    </Box>
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
 * Props: `events` (open only), `affectedSections`, `renameProposals`, `canEdit`, `busy` (the key of
 * the running action, or ''), and the action callbacks.
 */
export function ReviewPanel({ events, affectedSections, renameProposals, canEdit, busy, onVerify, onDismiss, onSnooze, onAcceptRename, onRejectRename }) {
  const [reason, setReason] = useState(null);
  const now = Date.now();
  const writesOff = !canEdit || Boolean(busy);

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
          <LoadingButton appearance="primary" isLoading={busy === 'verify'} isDisabled={writesOff} onClick={onVerify}>
            Mark verified
          </LoadingButton>
          <Button isDisabled>Propose fix</Button>
        </Inline>
        <HelperMessage>Drift Reviewer drafts fixes in the next release</HelperMessage>
      </Stack>
    </Stack>
  );
}
