// Shared UI Kit pieces for the byline modal and the space dashboard: state and severity lozenges,
// the spacing scale, section headings, and the loading, error and notice states.
import React from 'react';
import { Box, Heading, Icon, Inline, Lozenge, SectionMessage, SectionMessageAction, Spinner, Stack, Text, xcss } from '@forge/react';
import { COPY } from './copy';
import { normalizeSeverity, severityAppearance, severityLabel, stateMeta } from './format';

/**
 * One spacing scale for every surface (ADS space tokens on the 4 px grid):
 * `page` between top-level blocks, `section` between a heading's groups, `group` inside a card,
 * `row` between rows, `tight` between a label and its value.
 */
export const SPACE = {
  page: 'space.400',
  section: 'space.300',
  group: 'space.150',
  row: 'space.100',
  tight: 'space.050',
};

/** A flat card: a 1 px border, medium radius, and `space.150` padding. No left-border accents. */
export const cardStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'radius.medium',
  padding: 'space.150',
});

/**
 * A page state is always a word and an icon (brand/README.md status system), never colour alone.
 * The icon repeats the lozenge's word, so it is decorative (`label=""`) and screen readers read
 * the state once.
 */
export function StateBadge({ status }) {
  const ui = stateMeta(status);
  return (
    <Inline space="space.075" alignBlock="center">
      <Icon glyph={ui.glyph} label="" primaryColor={ui.color} size="small" />
      <Lozenge appearance={ui.lozenge}>{ui.label}</Lozenge>
    </Inline>
  );
}

/** "High" or "Medium" as a lozenge. The word carries the meaning; the tone only supports it. */
export function SeverityLozenge({ severity }) {
  const s = normalizeSeverity(severity);
  return <Lozenge appearance={severityAppearance(s)}>{severityLabel(s)}</Lozenge>;
}

/** A section: an `h3` heading in sentence case and its content, with the row spacing. */
export function Section({ title, children, as = 'h3', size = 'small', space = SPACE.row }) {
  return (
    <Stack space={space}>
      <Heading size={size} as={as}>
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

/** Secondary text: small and subtle. Reasons and hints use `subtlest`. */
export function Muted({ children, tone = 'subtle' }) {
  return (
    <Text size="small" color={tone === 'subtlest' ? 'color.text.subtlest' : 'color.text.subtle'}>
      {children}
    </Text>
  );
}

/** Loading: a labelled spinner and a line that says what is being checked. */
export function Loading({ text }) {
  return (
    <Box paddingBlock="space.200">
      <Inline space="space.100" alignBlock="center">
        <Spinner size="medium" label={text} />
        <Text>{text}</Text>
      </Inline>
    </Box>
  );
}

/**
 * An error with an optional retry inside the message (SectionMessageAction), so the retry sits with
 * the text it answers.
 */
export function ErrorState({ title, body, onRetry, appearance = 'error' }) {
  return (
    <SectionMessage
      appearance={appearance}
      title={title}
      actions={onRetry ? [<SectionMessageAction key="retry" onClick={onRetry}>{COPY.tryAgain}</SectionMessageAction>] : undefined}
    >
      {body ? <Text>{body}</Text> : null}
    </SectionMessage>
  );
}

/** The result of the last action (success, warning or error). */
export function Notice({ notice }) {
  if (!notice) return null;
  return (
    <SectionMessage appearance={notice.appearance} title={notice.title}>
      {notice.body ? <Text>{notice.body}</Text> : null}
    </SectionMessage>
  );
}

/**
 * "This space isn't watched yet." with a settings link for people who can turn watching on.
 * Renders nothing unless the resolver says `watched: false`.
 */
export function UnwatchedNotice({ space, body }) {
  if (!space || space.watched !== false) return null;
  const actions =
    space.canConfigure && space.settingsUrl
      ? [
          <SectionMessageAction key="settings" href={space.settingsUrl}>
            {COPY.openSettings}
          </SectionMessageAction>,
        ]
      : undefined;
  return (
    <SectionMessage appearance="information" title={COPY.unwatchedTitle} actions={actions}>
      <Text>{body}</Text>
    </SectionMessage>
  );
}
