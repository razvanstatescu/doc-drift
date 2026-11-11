// Shared UI Kit pieces for the byline modal and the space dashboard.
import React from 'react';
import { Icon, Inline, Lozenge } from '@forge/react';
import { normalizeSeverity, severityAppearance, severityLabel, stateMeta } from './format';

/** A page state is always a word and an icon (brand/README.md status system), never colour alone. */
export function StateBadge({ status }) {
  const ui = stateMeta(status);
  return (
    <Inline space="space.075" alignBlock="center">
      <Icon glyph={ui.glyph} label="" primaryColor={ui.color} size="small" />
      <Lozenge appearance={ui.lozenge}>{ui.label}</Lozenge>
    </Inline>
  );
}

export function SeverityLozenge({ severity }) {
  const s = normalizeSeverity(severity);
  return <Lozenge appearance={severityAppearance(s)}>{severityLabel(s)}</Lozenge>;
}
