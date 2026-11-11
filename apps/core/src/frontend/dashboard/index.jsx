// Space dashboard (F8, UX flow 6), `confluence:spacePage` "Drift dashboard": KPI tiles, the pages
// with drift ranked by severity, and the owner backlog. The space key comes from the module context.
import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  DynamicTable,
  EmptyState,
  Heading,
  Icon,
  Inline,
  Link,
  SectionMessage,
  Stack,
  Text,
  User,
  useProductContext,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { COPY, dashboardTitle, noAnchoredPages, pagesTableLabel, unwatchedBody } from '../shared/copy';
import { ErrorState, Loading, Muted, SPACE, SeverityLozenge, StateBadge, UnwatchedNotice } from '../shared/components';
import {
  anchoredPctText,
  anchoredText,
  driftedPages,
  emptyDashboardText,
  isConsentError,
  medianText,
  plural,
  relativeTime,
  sortOwners,
  sortPages,
  stateMeta,
} from '../shared/format';

// Responsive KPI tiles: `Grid` is not exported by @forge/react 12.5.0 and xcss has no flexBasis, so
// tiles grow to share a row and wrap below 200 px each.
const tileStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'radius.medium',
  padding: 'space.200',
  flexGrow: '1',
  minWidth: '200px',
});

/**
 * A KPI tile. State tiles carry the state icon beside the state word; the icon repeats the word, so
 * it is decorative.
 */
function Tile({ label, value, detail, status }) {
  const ui = status ? stateMeta(status) : null;
  return (
    <Box xcss={tileStyle}>
      <Stack space={SPACE.tight}>
        <Inline space="space.075" alignBlock="center">
          {ui ? <Icon glyph={ui.glyph} label="" primaryColor={ui.color} size="small" /> : null}
          <Text size="small" color="color.text.subtle">
            {label}
          </Text>
        </Inline>
        <Heading size="large" as="div">
          {value}
        </Heading>
        {detail ? <Muted>{detail}</Muted> : null}
      </Stack>
    </Box>
  );
}

function Owner({ ownerId, ownerName }) {
  if (ownerId) return <User accountId={ownerId} />;
  return <Text>{ownerName || COPY.noOwner}</Text>;
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
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!spaceKey) return;
    setError(null);
    setData(null);
    try {
      const res = await invoke('getSpaceDashboard', { spaceKey });
      if (res?.ok === false || res?.error) setError(res);
      else setData(res || {});
    } catch (e) {
      setError(e || new Error('Unknown error'));
    }
  }, [spaceKey]);

  useEffect(() => {
    load();
  }, [load]);

  const title = dashboardTitle(spaceKey);
  const heading = (
    <Heading size="large" as="h1">
      {title}
    </Heading>
  );

  if (context && !spaceKey) {
    return (
      <SectionMessage appearance="warning" title={COPY.noSpace}>
        <Text>{COPY.noSpaceBody}</Text>
      </SectionMessage>
    );
  }

  if (error) {
    const body = error?.error === 'not_visible' ? COPY.spaceNotVisible : String(error?.message || error?.error || error);
    return (
      <Stack space={SPACE.group}>
        {heading}
        {isConsentError(error) ? (
          <ErrorState appearance="warning" title={COPY.consentTitle} body={COPY.consentBody} onRetry={load} />
        ) : (
          <ErrorState title={COPY.dashboardFailed} body={body} onRetry={load} />
        )}
      </Stack>
    );
  }

  if (!data) {
    return (
      <Stack space={SPACE.group}>
        {heading}
        <Loading text={COPY.loadingDashboard} />
      </Stack>
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
  // Only drifted pages are listed; Verified pages stay out of the table.
  const pages = sortPages(driftedPages(data.pages));
  const owners = sortOwners(data.owners || []);
  const now = Date.now();
  const space = data.space || (typeof data.watched === 'boolean' ? { key: spaceKey, watched: data.watched } : null);
  const unwatched = <UnwatchedNotice space={space} body={unwatchedBody(spaceKey)} />;

  const tiles = (
    <Inline space={SPACE.group} rowSpace={SPACE.group} alignBlock="stretch" shouldWrap>
      <Tile label={COPY.kpiAnchored} value={anchoredText(kpis)} detail={kpis.total > 0 ? `${anchoredPctText(kpis)} of the space` : null} />
      <Tile label={COPY.kpiPossiblyStale} status="possibly_stale" value={String(kpis.possiblyStale)} detail={plural(kpis.possiblyStale, 'page')} />
      <Tile label={COPY.kpiStale} status="stale" value={String(kpis.stale)} detail={plural(kpis.stale, 'page')} />
      <Tile label={COPY.kpiMedian} value={medianText(kpis.medianTimeToVerifyDays)} />
    </Inline>
  );

  if (kpis.total === 0 || kpis.anchored === 0) {
    return (
      <Stack space={SPACE.section}>
        {heading}
        {unwatched}
        <EmptyState header={noAnchoredPages(spaceKey)} description={COPY.emptyAnchoredBody} headingLevel={2} />
      </Stack>
    );
  }

  const intro = (
    <Stack space={SPACE.row}>
      {heading}
      <Text>{COPY.dashboardLead}</Text>
    </Stack>
  );

  if (pages.length === 0) {
    return (
      <Stack space={SPACE.section}>
        {intro}
        {unwatched}
        {tiles}
        <EmptyState header={emptyDashboardText(spaceKey, kpis)} description={COPY.emptyDriftBody} headingLevel={2} />
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
    <Stack space={SPACE.page}>
      {intro}
      {unwatched}
      {tiles}
      <Stack space={SPACE.row}>
        <Heading size="medium" as="h2">
          {COPY.pagesWithDrift}
        </Heading>
        <Muted>{COPY.rankedBy}</Muted>
        <DynamicTable label={pagesTableLabel(spaceKey)} head={PAGE_HEAD} rows={pageRows} rowsPerPage={10} />
      </Stack>
      {owners.length ? (
        <Stack space={SPACE.row}>
          <Heading size="medium" as="h2">
            {COPY.ownerBacklog}
          </Heading>
          <DynamicTable label={COPY.ownerTable} head={OWNER_HEAD} rows={ownerRows} />
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
