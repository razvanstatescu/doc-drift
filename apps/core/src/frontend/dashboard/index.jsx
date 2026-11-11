// Space dashboard (F8, UX flow 6), `confluence:spacePage` "Drift dashboard": KPI tiles, the pages
// with drift ranked by severity (sortable, filterable by state, a Review link per row), the owner
// backlog, and "Anchor this space" (R-1). The space key comes from the module context.
import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  DynamicTable,
  EmptyState,
  Heading,
  HelperMessage,
  Icon,
  Inline,
  Label,
  Link,
  LinkButton,
  SectionMessage,
  Select,
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
  STATE_FILTERS,
  anchoredPctText,
  anchoredText,
  driftedPages,
  emptyDashboardText,
  filterPagesByState,
  isConsentError,
  medianText,
  pageSortKeys,
  plural,
  relativeTime,
  sortOwners,
  sortPages,
  stateMeta,
} from '../shared/format';
import { AnchorSpaceFlow } from './anchor-space';

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

const filterStyle = xcss({ maxWidth: '240px' });

function Owner({ ownerId, ownerName }) {
  if (ownerId) return <User accountId={ownerId} />;
  return <Text>{ownerName || COPY.noOwner}</Text>;
}

// UX-7: every column but the action sorts. Rows arrive in rank order, so no default sort key.
const PAGE_HEAD = {
  cells: [
    { key: 'page', content: 'Page', isSortable: true },
    { key: 'state', content: 'State', isSortable: true },
    { key: 'severity', content: 'Severity', isSortable: true },
    { key: 'open', content: 'Open changes', isSortable: true },
    { key: 'since', content: 'Since', isSortable: true },
    { key: 'owner', content: 'Owner', isSortable: true },
    { key: 'review', content: 'Action' },
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
  const [filter, setFilter] = useState('all');
  const [anchoring, setAnchoring] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!spaceKey) return;
    setError(null);
    if (!quiet) setData(null);
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
          <ErrorState appearance="warning" title={COPY.consentTitle} body={COPY.consentBody} onRetry={() => load()} />
        ) : (
          <ErrorState title={COPY.dashboardFailed} body={body} onRetry={() => load()} />
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

  // R-1: offered while pages are unanchored. `canAnchorSpace: false` explains the refusal up front;
  // otherwise the resolver's permission check answers when the flow loads.
  const unanchored = kpis.total > 0 ? Math.max(0, kpis.total - kpis.anchored) : null;
  const canAnchor = data.canAnchorSpace !== false;
  const anchorFlow = anchoring ? (
    <AnchorSpaceFlow spaceKey={spaceKey} onClose={() => setAnchoring(false)} onSaved={() => load({ quiet: true })} />
  ) : null;
  const anchorEntry =
    !anchoring && unanchored !== 0 ? (
      <Stack space={SPACE.tight}>
        <Inline>
          <Button appearance={kpis.anchored === 0 ? 'primary' : 'default'} isDisabled={!canAnchor} onClick={() => setAnchoring(true)}>
            {COPY.anchorSpace}
          </Button>
        </Inline>
        <HelperMessage>
          {canAnchor
            ? unanchored
              ? `${plural(unanchored, 'page')} in ${spaceKey} ${unanchored === 1 ? 'is' : 'are'} not anchored. Get suggestions for all of them at once.`
              : 'Get anchor suggestions for every unanchored page at once.'
            : `${COPY.anchorSpaceForbidden} ${COPY.anchorSpaceForbiddenBody}`}
        </HelperMessage>
      </Stack>
    ) : null;

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
        {anchorFlow || (
          <Stack space={SPACE.group}>
            <EmptyState header={noAnchoredPages(spaceKey)} description={COPY.emptyAnchoredBody} headingLevel={2} />
            {anchorEntry}
          </Stack>
        )}
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
        {anchorFlow || anchorEntry}
        <EmptyState header={emptyDashboardText(spaceKey, kpis)} description={COPY.emptyDriftBody} headingLevel={2} />
      </Stack>
    );
  }

  const shown = filterPagesByState(pages, filter);
  // Cell `key`s are the sort values (see pageSortKeys). Review opens the page, where the badge
  // opens the review panel.
  const pageRows = shown.map((p) => {
    const k = pageSortKeys(p);
    return {
      key: String(p.pageId),
      cells: [
        { key: k.page, content: p.url ? <Link href={p.url}>{p.title}</Link> : <Text>{p.title}</Text> },
        { key: k.state, content: <StateBadge status={p.status} /> },
        { key: k.severity, content: <SeverityLozenge severity={p.maxSeverity} /> },
        { key: k.open, content: <Text>{String(p.openEvents ?? 0)}</Text> },
        { key: k.since, content: <Text>{relativeTime(p.since ?? p.lastChangeAt, now)}</Text> },
        { key: k.owner, content: <Owner ownerId={p.ownerId} ownerName={p.ownerName} /> },
        { key: k.review, content: p.url ? <LinkButton href={p.url}>{COPY.review}</LinkButton> : '' },
      ],
    };
  });
  const filterValue = STATE_FILTERS.find((f) => f.value === filter) || STATE_FILTERS[0];

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
      {anchorFlow || anchorEntry}
      <Stack space={SPACE.row}>
        <Heading size="medium" as="h2">
          {COPY.pagesWithDrift}
        </Heading>
        <Muted>{COPY.rankedBy}</Muted>
        <Stack space={SPACE.tight}>
          <Label labelFor="dds-state-filter">{COPY.stateFilter}</Label>
          <Box xcss={filterStyle}>
            <Select inputId="dds-state-filter" options={STATE_FILTERS} value={filterValue} onChange={(o) => setFilter(o?.value || 'all')} />
          </Box>
        </Stack>
        {shown.length ? (
          <DynamicTable label={pagesTableLabel(spaceKey)} head={PAGE_HEAD} rows={pageRows} rowsPerPage={10} />
        ) : (
          <Text>{COPY.noFilterMatch}</Text>
        )}
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
