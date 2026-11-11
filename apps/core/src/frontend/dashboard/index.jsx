// Space dashboard (F8, UX flow 6), `confluence:spacePage` "Drift dashboard": KPI tiles, the pages
// with drift ranked by severity, and the owner backlog. The space key comes from the module context.
import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  DynamicTable,
  EmptyState,
  Heading,
  Icon,
  Inline,
  Link,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  User,
  useProductContext,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { SeverityLozenge, StateBadge } from '../shared/components';
import {
  anchoredPctText,
  anchoredText,
  emptyDashboardText,
  hasDrift,
  medianText,
  plural,
  relativeTime,
  sortOwners,
  sortPages,
  stateMeta,
} from '../shared/format';

const tileStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'radius.medium',
  padding: 'space.200',
  minWidth: '180px',
});

/** A KPI tile. State tiles carry the state icon next to the state word. */
function Tile({ label, value, detail, status }) {
  const ui = status ? stateMeta(status) : null;
  return (
    <Box xcss={tileStyle}>
      <Stack space="space.050">
        <Inline space="space.075" alignBlock="center">
          {ui ? <Icon glyph={ui.glyph} label="" primaryColor={ui.color} size="small" /> : null}
          <Text size="small" color="color.text.subtle">
            {label}
          </Text>
        </Inline>
        <Heading size="large" as="div">
          {value}
        </Heading>
        {detail ? <Text size="small">{detail}</Text> : null}
      </Stack>
    </Box>
  );
}

function Owner({ ownerId, ownerName }) {
  if (ownerId) return <User accountId={ownerId} />;
  return <Text>{ownerName || 'No owner'}</Text>;
}

const PAGE_HEAD = {
  cells: [
    { key: 'page', content: 'Page' },
    { key: 'state', content: 'State' },
    { key: 'severity', content: 'Severity' },
    { key: 'open', content: 'Open changes' },
    { key: 'since', content: 'Since' },
    { key: 'owner', content: 'Owner' },
  ],
};

const OWNER_HEAD = {
  cells: [
    { key: 'owner', content: 'Owner' },
    { key: 'open', content: 'Open changes' },
  ],
};

const App = () => {
  const context = useProductContext();
  const spaceKey = context?.extension?.space?.key || null;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!spaceKey) return;
    setError('');
    setData(null);
    try {
      const res = await invoke('getSpaceDashboard', { spaceKey });
      if (res?.ok === false || res?.error) setError(res.message || res.error);
      else setData(res || {});
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, [spaceKey]);

  useEffect(() => {
    load();
  }, [load]);

  const title = spaceKey ? `Drift in ${spaceKey}` : 'Drift dashboard';

  if (context && !spaceKey) {
    return (
      <SectionMessage appearance="warning" title="No space in context">
        <Text>Open the Drift dashboard from a space's sidebar.</Text>
      </SectionMessage>
    );
  }

  if (error) {
    return (
      <Stack space="space.200">
        <Heading size="large">{title}</Heading>
        <SectionMessage appearance="error" title="Couldn't load the dashboard.">
          <Text>{error}</Text>
        </SectionMessage>
        <Inline>
          <Button onClick={load}>Try again</Button>
        </Inline>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner size="medium" label="Loading" />
        <Text>Counting drift{spaceKey ? ` in ${spaceKey}` : ''}…</Text>
      </Inline>
    );
  }

  const kpis = {
    anchored: 0,
    total: 0,
    possiblyStale: 0,
    stale: 0,
    medianTimeToVerifyDays: null,
    ...(data.kpis || {}),
  };
  const pages = sortPages(data.pages || []);
  const owners = sortOwners(data.owners || []);
  const now = Date.now();

  const tiles = (
    <Inline space="space.200" shouldWrap>
      <Tile label="Pages anchored" value={anchoredText(kpis)} detail={kpis.total > 0 ? `${anchoredPctText(kpis)} of the space` : null} />
      <Tile label="Possibly stale" status="possibly_stale" value={String(kpis.possiblyStale)} detail={kpis.possiblyStale > 0 ? plural(kpis.possiblyStale, 'page') : null} />
      <Tile label="Stale" status="stale" value={String(kpis.stale)} detail={kpis.stale > 0 ? plural(kpis.stale, 'page') : null} />
      <Tile label="Median time to verify" value={medianText(kpis.medianTimeToVerifyDays)} />
    </Inline>
  );

  if (kpis.total === 0) {
    return (
      <Stack space="space.300">
        <Heading size="large">{title}</Heading>
        <EmptyState
          header={`No pages in ${spaceKey} are anchored yet.`}
          description="Open a page and click the Doc Drift badge to anchor it to code or Jira work."
        />
      </Stack>
    );
  }

  if (!hasDrift(kpis, pages.length)) {
    return (
      <Stack space="space.300">
        <Heading size="large">{title}</Heading>
        {tiles}
        <EmptyState header={emptyDashboardText(spaceKey, kpis)} description="Pages show up here when the code or Jira work they describe changes." />
      </Stack>
    );
  }

  const pageRows = pages.map((p) => ({
    key: String(p.pageId),
    cells: [
      { key: 'page', content: p.url ? <Link href={p.url}>{p.title}</Link> : <Text>{p.title}</Text> },
      { key: 'state', content: <StateBadge status={p.status} /> },
      { key: 'severity', content: <SeverityLozenge severity={p.maxSeverity} /> },
      { key: 'open', content: <Text>{String(p.openEvents ?? 0)}</Text> },
      { key: 'since', content: <Text>{relativeTime(p.since, now)}</Text> },
      { key: 'owner', content: <Owner ownerId={p.ownerId} ownerName={p.ownerName} /> },
    ],
  }));

  const ownerRows = owners.map((o, i) => ({
    key: String(o.ownerId || `none-${i}`),
    cells: [
      { key: 'owner', content: <Owner ownerId={o.ownerId} ownerName={o.ownerName} /> },
      { key: 'open', content: <Text>{plural(o.open, 'open change')}</Text> },
    ],
  }));

  return (
    <Stack space="space.400">
      <Stack space="space.100">
        <Heading size="large">{title}</Heading>
        <Text>Agents are told not to trust Possibly stale and Stale pages until someone reviews them.</Text>
      </Stack>
      {tiles}
      <Stack space="space.100">
        <Heading size="medium">Pages to review</Heading>
        <Text size="small" color="color.text.subtle">
          Ranked by severity, then state and open changes.
        </Text>
        <DynamicTable caption={`Pages with drift in ${spaceKey}`} head={PAGE_HEAD} rows={pageRows} rowsPerPage={10} />
      </Stack>
      {owners.length ? (
        <Stack space="space.100">
          <Heading size="medium">Owner backlog</Heading>
          <DynamicTable caption="Open changes by page owner" head={OWNER_HEAD} rows={ownerRows} />
        </Stack>
      ) : null}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
