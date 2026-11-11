// Byline modal. With open changes it is the review panel (F5) with the anchors in a second tab;
// otherwise it is the binding UI (F1). The modal chrome already names the app, so the content
// starts with the page and its state (word and icon), never a second product heading.
import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  ButtonGroup,
  Heading,
  Inline,
  SectionMessage,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';
import { StateBadge } from '../shared/components';
import { headerLine, openEvents, plural } from '../shared/format';
import { AnchorEditor } from './anchors';
import { ReviewPanel } from './review';

const EDIT_RIGHTS = 'You need edit rights on this page to change its anchors.';
const RELOAD = 'Reload the page to update the badge.';
const EMPTY = [];
const errorText = (e) => String(e?.message || e || 'Unknown error');

/** A resolver result counts as failed only when it says so (`ok: false` or an `error`). */
const failed = (res) => res?.ok === false || Boolean(res?.error);
const failMessage = (res) => res?.message || res?.error || 'Try again in a minute.';

function Notice({ notice }) {
  if (!notice) return null;
  return (
    <SectionMessage appearance={notice.appearance} title={notice.title}>
      {notice.body ? <Text>{notice.body}</Text> : null}
    </SectionMessage>
  );
}

const App = () => {
  const context = useProductContext();
  const pageId = context?.extension?.content?.id ? String(context.extension.content.id) : null;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!pageId) return;
    setLoadError('');
    try {
      const res = await invoke('getPageDrift', { pageId });
      setData(res || {});
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs one write action, then reloads the drift so the panel shows the new state.
  const run = async (key, call, success) => {
    setBusy(key);
    setNotice(null);
    try {
      const res = await call();
      if (failed(res)) {
        setNotice({ appearance: 'error', title: "That didn't go through.", body: failMessage(res) });
        return;
      }
      setNotice({ appearance: 'success', ...success });
      await load();
    } catch (e) {
      setNotice({ appearance: 'error', title: "That didn't go through.", body: errorText(e) });
    } finally {
      setBusy('');
    }
  };

  if (context && !pageId) return <Text>Page not found or not visible to you.</Text>;

  if (loadError) {
    return (
      <Stack space="space.200">
        <SectionMessage appearance="error" title="Couldn't load the drift for this page.">
          <Text>{loadError}</Text>
        </SectionMessage>
        <ButtonGroup label="Retry">
          <Button onClick={load}>Try again</Button>
          <Button appearance="subtle" onClick={() => view.close()}>
            Close
          </Button>
        </ButtonGroup>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner size="medium" label="Loading" />
        <Text>Checking this page's anchors…</Text>
      </Inline>
    );
  }

  if (data.error === 'not_visible' || data.error === 'no_page' || data.status === 'unknown' || data.state === 'unknown') {
    return <Text>Page not found or not visible to you.</Text>;
  }
  if (data.error) {
    return (
      <SectionMessage appearance="error" title="Couldn't load the drift for this page.">
        <Text>{failMessage(data)}</Text>
      </SectionMessage>
    );
  }

  // D20: restricted pages are unsupported in v1. Show nothing else, and save nothing.
  if (data.restricted) {
    return (
      <Stack space="space.200">
        <SectionMessage appearance="warning" title="Restricted pages can't be watched yet.">
          <Text>This page has view restrictions, so Doc Drift Sentinel can't read it or receive its updates. Remove the restriction to add anchors.</Text>
        </SectionMessage>
        <ButtonGroup label="Close">
          <Button onClick={() => view.close()}>Close</Button>
        </ButtonGroup>
      </Stack>
    );
  }

  const state = data.state || data.status || 'unanchored';
  const canEdit = Boolean(data.canEdit);
  const bindings = data.bindings || data.anchors || EMPTY;
  const events = openEvents(data.events);
  const reviewing = events.length > 0;

  const header = (
    <Stack space="space.100">
      <Inline space="space.150" alignBlock="center" shouldWrap>
        {data.title ? <Heading size="medium">{data.title}</Heading> : null}
        <StateBadge status={state} />
      </Inline>
      <Text>{headerLine(state, { events, verifiedBy: data.verifiedBy, verifiedAt: data.verifiedAt, anchorCount: bindings.length })}</Text>
    </Stack>
  );

  // D15: view-only users see everything, and every write is disabled.
  const viewOnly = canEdit ? null : (
    <SectionMessage appearance="information" title="View only">
      <Text>{EDIT_RIGHTS}</Text>
    </SectionMessage>
  );

  const editor = (
    <AnchorEditor
      bindings={bindings}
      suggestions={data.suggestions || EMPTY}
      canEdit={canEdit}
      onSaved={async (msg) => {
        setNotice({ appearance: 'success', ...msg });
        await load();
      }}
      onError={(msg) => setNotice({ appearance: 'error', ...msg })}
    />
  );

  if (!reviewing) {
    return (
      <Stack space="space.300">
        {header}
        <Notice notice={notice} />
        {viewOnly}
        {editor}
      </Stack>
    );
  }

  const n = events.length;
  const review = (
    <ReviewPanel
      events={events}
      affectedSections={data.affectedSections || EMPTY}
      renameProposals={data.renameProposals || EMPTY}
      canEdit={canEdit}
      busy={busy}
      onVerify={() =>
        run('verify', () => invoke('markVerified', { pageId }), {
          title: 'Marked Verified. Agents can cite this page again.',
          body: RELOAD,
        })
      }
      onSnooze={() =>
        run('snooze', () => invoke('snoozePage', { pageId, days: 7 }), {
          title: 'Snoozed for 7 days.',
          body: `The ${plural(n, 'open change')} stay on the page until someone reviews them. ${RELOAD}`,
        })
      }
      onDismiss={(reason, reasonLabel) =>
        run(
          'dismiss',
          async () => {
            for (const e of events) {
              const res = await invoke('dismissEvent', { eventId: e.id, reason });
              if (failed(res)) return res;
            }
            return { ok: true };
          },
          { title: `Dismissed ${plural(n, 'change')} as ${reasonLabel.toLowerCase()}.`, body: RELOAD },
        )
      }
      onAcceptRename={(p) =>
        run(`accept:${p.id}`, () => invoke('acceptRename', { proposalId: p.id }), {
          title: `Anchor moved to ${p.to}.`,
          body: '',
        })
      }
      onRejectRename={(p) =>
        run(`keep:${p.id}`, () => invoke('rejectRename', { proposalId: p.id }), {
          title: `Kept the anchor on ${p.from}.`,
          body: '',
        })
      }
    />
  );

  return (
    <Stack space="space.300">
      {header}
      <Notice notice={notice} />
      {viewOnly}
      <Tabs id="dds-byline-tabs">
        <TabList>
          <Tab>{`Review (${n})`}</Tab>
          <Tab>{`Anchors (${bindings.length})`}</Tab>
        </TabList>
        <TabPanel>
          <Box paddingBlockStart="space.200">{review}</Box>
        </TabPanel>
        <TabPanel>
          <Box paddingBlockStart="space.200">{editor}</Box>
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
