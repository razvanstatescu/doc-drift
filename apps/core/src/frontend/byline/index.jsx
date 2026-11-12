// Byline modal. With changes to review (open or snoozed) it is the review panel (F5) with the anchors
// in a second tab; otherwise it is the binding UI (F1). The modal chrome already names the app, so the
// content starts with the page and its state (word and icon), never a second product heading.
import React, { useCallback, useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Heading,
  Inline,
  SectionMessage,
  SectionMessageAction,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  useProductContext,
} from '@forge/react';
import { invoke, rovo, view } from '@forge/bridge';
import { COPY, dismissedTitle, snoozedBody, stoppedWatching, tabLabel, unwatchedBody } from '../shared/copy';
import { CodeText, ErrorState, Loading, Muted, Notice, SPACE, StateBadge, UnwatchedNotice } from '../shared/components';
import { FIX_NOT_FOUND_BODY, FIX_NOT_FOUND_TITLE, acceptedTitle, fixPrompt, joinList, openProposals, pageOrder, proposalSource, rovoOpenPayload } from '../shared/fix';
import {
  capabilities,
  dismissedSinceVerified,
  evidenceLevel,
  gateNote,
  headerLine,
  isConsentError,
  isDraftPage,
  isViewOnly,
  lastVerifiedLine,
  plural,
  quickFixDoneTitle,
  reviewEvents,
  snoozedUntilOf,
  sortEvents,
  trustLine,
  usableQuickFixes,
  verifiedContextLine,
} from '../shared/format';
import { AnchorEditor } from './anchors';
import { ProposedFixSection, ReviewPanel } from './review';

const EMPTY = [];
const errorText = (e) => String(e?.message || e || 'Unknown error');

/** A resolver result counts as failed only when it says so (`ok: false` or an `error`). */
const failed = (res) => res?.ok === false || Boolean(res?.error);
const failMessage = (res) => res?.message || res?.error || COPY.tryLater;
const notFound = (res) => (res?.error === 'not_found' ? { appearance: 'warning', title: FIX_NOT_FOUND_TITLE, body: FIX_NOT_FOUND_BODY } : null);
// A fresh id per notice remounts it, so its Reload page button takes focus again (UX-8).
let noticeSeq = 0;
const withId = (n) => (n ? { id: ++noticeSeq, ...n } : n);

function ConsentNeeded({ onRetry }) {
  return <ErrorState appearance="warning" title={COPY.consentTitle} body={COPY.consentBody} onRetry={onRetry} />;
}

const App = () => {
  const context = useProductContext();
  const pageId = context?.extension?.content?.id ? String(context.extension.content.id) : null;
  const [data, setData] = useState(null);
  const [proposals, setProposals] = useState(EMPTY);
  const [loadError, setLoadError] = useState(null);
  const [notice, setNoticeRaw] = useState(null);
  const setNotice = useCallback((n) => setNoticeRaw(withId(n)), []);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!pageId) return;
    setLoadError(null);
    // Drafts are optional: if they fail to load, the rest of the panel still works.
    const drafts = invoke('getProposals', { pageId }).catch(() => EMPTY);
    try {
      const res = await invoke('getPageDrift', { pageId });
      const list = await drafts;
      setProposals(openProposals(Array.isArray(list) ? list : Array.isArray(list?.proposals) ? list.proposals : EMPTY));
      setData(res || {});
    } catch (e) {
      setLoadError(e || new Error('Unknown error'));
    }
  }, [pageId]);

  const retry = useCallback(() => {
    setData(null);
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs one write action, then reloads the drift so the panel shows the new state.
  // `success` is a notice, or a function of the result that returns one. `onFail(res)` may return a
  // notice for a known error code; it reloads too, since the data moved.
  const run = async (key, call, success, onFail) => {
    setBusy(key);
    setNotice(null);
    try {
      const res = await call();
      if (failed(res)) {
        const known = onFail?.(res);
        setNotice(known || { appearance: 'error', title: COPY.actionFailed, body: failMessage(res) });
        if (known) await load();
        return;
      }
      setNotice({ appearance: 'success', ...(typeof success === 'function' ? success(res) : success) });
      await load();
    } catch (e) {
      setNotice({ appearance: 'error', title: COPY.actionFailed, body: errorText(e) });
    } finally {
      setBusy('');
    }
  };

  if (context && !pageId) return <Text>{COPY.notVisible}</Text>;

  if (loadError) {
    return isConsentError(loadError) ? <ConsentNeeded onRetry={retry} /> : <ErrorState title={COPY.loadFailed} body={errorText(loadError)} onRetry={retry} />;
  }

  if (!data) return <Loading text={COPY.loadingPage} />;

  if (isConsentError(data)) return <ConsentNeeded onRetry={retry} />;
  // UX-2: drafts are not restricted; the app only reads published pages.
  if (isDraftPage(data)) {
    return (
      <SectionMessage appearance="information" title={COPY.draftTitle}>
        <Text>{COPY.draftBody}</Text>
      </SectionMessage>
    );
  }
  if (data.error === 'not_visible' || data.error === 'no_page' || data.status === 'unknown' || data.state === 'unknown') {
    return <Text>{COPY.notVisible}</Text>;
  }
  if (data.error) return <ErrorState title={COPY.loadFailed} body={failMessage(data)} onRetry={retry} />;

  // D20: restricted pages are unsupported in v1. Show nothing else, and save nothing.
  if (data.restricted) {
    return (
      <SectionMessage
        appearance="warning"
        title={COPY.restrictedTitle}
        actions={[
          <SectionMessageAction key="close" onClick={() => view.close()}>
            {COPY.close}
          </SectionMessageAction>,
        ]}
      >
        <Text>{COPY.restrictedBody}</Text>
      </SectionMessage>
    );
  }

  const state = data.state || data.status || 'unanchored';
  const caps = capabilities(data);
  const viewOnly = isViewOnly(caps);
  const evidence = evidenceLevel(data.evidenceLevel);
  const bindings = data.bindings || data.anchors || EMPTY;
  const allEvents = data.events || EMPTY;
  // Open and snoozed events are the review list; a snoozed page keeps its review panel.
  const events = sortEvents(reviewEvents(allEvents));
  const snoozedUntil = snoozedUntilOf(data.snoozedUntil, allEvents);
  const reviewing = events.length > 0;
  const n = events.length;
  const quickFixes = usableQuickFixes(data.renameQuickFix);

  // F11: open Drift Reviewer in Rovo with a prefilled prompt. The agent drafts; it never writes (D6).
  const proposeFix = async () => {
    setBusy('propose');
    setNotice(null);
    try {
      const [info, enabled] = await Promise.all([invoke('getRovoAgentInfo'), rovo.isEnabled().catch(() => true)]);
      if (enabled === false || info?.enabled === false || info?.rovoEnabled === false) {
        setNotice({ appearance: 'warning', title: COPY.rovoOff, body: COPY.rovoOffBody });
        return;
      }
      const payload = rovoOpenPayload(info, fixPrompt(data.title, pageId));
      if (!payload) {
        setNotice({ appearance: 'error', title: COPY.rovoFailed, body: failMessage(info) });
        return;
      }
      await rovo.open(payload);
      // The chat opens beside the page; close the modal so it is not covered.
      view.close();
    } catch (e) {
      setNotice({ appearance: 'error', title: COPY.rovoFailed, body: errorText(e) });
    } finally {
      setBusy('');
    }
  };

  const acceptFix = (p) => {
    const source = proposalSource(p, allEvents);
    return run(`fix:${p.id}`, () => invoke('applyProposal', { proposalId: p.id }), { title: acceptedTitle(source), body: COPY.reloadPage, reload: true }, notFound);
  };

  // D29: a section can have one draft per block. Accept them in page order; stop at the first refusal.
  const acceptAllFix = (list, key) => {
    const source = joinList([...new Set(list.map((p) => proposalSource(p, allEvents)).filter(Boolean))]) || null;
    return run(
      `fixall:${key}`,
      async () => {
        let res = null;
        for (const p of list) {
          res = await invoke('applyProposal', { proposalId: p.id });
          if (failed(res)) return res;
        }
        return res;
      },
      { title: acceptedTitle(source), body: COPY.reloadPage, reload: true },
      notFound,
    );
  };

  const rejectFix = (p) => run(`reject:${p.id}`, () => invoke('rejectProposal', { proposalId: p.id }), { title: COPY.draftRejected, body: '' });

  // R-4: a deterministic rename fix. Edits the page asUser() with a version message (backend).
  const applyQuickFix = (fix) =>
    run(`qf:${fix.eventId}`, () => invoke('applyRenameQuickFix', { eventId: fix.eventId }), { title: quickFixDoneTitle(fix), body: COPY.reloadPage, reload: true }, notFound);

  // Header: the page, its state (word and icon), and one line on why. Verified pages also say what
  // the watch has seen since (R-8); after a dismiss-all they say nobody re-verified (UX-9).
  const why = state === 'possibly_stale' || state === 'stale' ? data.whySentence : null;
  const dismissedOnly = state === 'verified' && dismissedSinceVerified(allEvents, data.verifiedAt);
  const contextLine = state === 'verified' ? verifiedContextLine(data.verifiedContext) : '';
  const summary = why ? null : dismissedOnly
    ? `${lastVerifiedLine(data.verifiedBy, data.verifiedAt)} Watching ${plural(bindings.length, 'anchor')}.`
    : headerLine(state, { events, verifiedBy: data.verifiedBy, verifiedAt: data.verifiedAt, anchorCount: bindings.length, snoozedUntil });

  const header = (
    <Stack space={SPACE.row}>
      <Inline space="space.150" alignBlock="center" shouldWrap>
        {data.title ? (
          <Heading size="medium" as="h2">
            {data.title}
          </Heading>
        ) : null}
        <StateBadge status={state} />
      </Inline>
      {why ? (
        <Stack space={SPACE.tight}>
          <CodeText text={why} />
          <Muted>{trustLine(snoozedUntil)}</Muted>
        </Stack>
      ) : (
        <Text>{summary}</Text>
      )}
      {contextLine ? <Muted>{contextLine}</Muted> : null}
    </Stack>
  );

  const banners = (
    <>
      <UnwatchedNotice space={data.space} body={unwatchedBody(data.space?.key)} />
      {/* D15: view-only users see everything, and every write is off. One notice, not one per control. */}
      {viewOnly ? (
        <SectionMessage appearance="information" title={COPY.viewOnlyTitle}>
          <Text>{COPY.viewOnlyBody}</Text>
        </SectionMessage>
      ) : null}
    </>
  );

  const editor = (
    <AnchorEditor
      bindings={bindings}
      suggestions={data.suggestions || EMPTY}
      canEdit={caps.editAnchors}
      gateNote={viewOnly ? '' : gateNote(caps, ['editAnchors'])}
      onSaved={async (msg) => {
        setNotice({ appearance: 'success', reload: true, ...msg });
        await load();
      }}
      onError={(msg) => setNotice({ appearance: 'error', ...msg })}
    />
  );

  if (!reviewing) {
    return (
      <Stack space={SPACE.section}>
        {header}
        <Notice notice={notice} />
        {banners}
        <ProposedFixSection proposals={proposals} events={allEvents} caps={caps} busy={busy} onAccept={acceptFix} onReject={rejectFix} onAcceptAll={acceptAllFix} />
        {editor}
      </Stack>
    );
  }

  const review = (
    <ReviewPanel
      events={events}
      allEvents={allEvents}
      affectedSections={data.affectedSections || EMPTY}
      renameProposals={data.renameProposals || EMPTY}
      proposals={proposals}
      caps={caps}
      evidence={evidence}
      busy={busy}
      notice={notice}
      onProposeFix={proposeFix}
      onAcceptFix={acceptFix}
      onAcceptSectionFix={acceptAllFix}
      onAcceptAllFix={() => acceptAllFix(pageOrder(proposals), 'all')}
      onRejectFix={rejectFix}
      quickFixes={quickFixes}
      onQuickFix={applyQuickFix}
      pageId={pageId}
      followUps={data.followUps || EMPTY}
      onVerify={() => run('verify', () => invoke('markVerified', { pageId }), { title: COPY.verified, body: COPY.reloadBadge, reload: true })}
      onSnooze={() =>
        run('snooze', () => invoke('snoozePage', { pageId, days: 7 }), { title: COPY.snoozed, body: `${snoozedBody(n)} ${COPY.reloadBadge}`, reload: true })
      }
      onDismiss={(reason, reasonLabel, stops = []) =>
        run(
          'dismiss',
          async () => {
            for (const e of events) {
              const res = await invoke('dismissEvent', { eventId: e.id, reason });
              if (failed(res)) return res;
            }
            // R-7: after the dismiss, narrow each chosen anchor. A failure here keeps the dismiss.
            const stopped = [];
            const missed = [];
            for (const t of stops) {
              try {
                const res = await invoke('stopWatchingPath', { eventId: t.eventId });
                (failed(res) ? missed : stopped).push(t.path);
              } catch {
                missed.push(t.path);
              }
            }
            return { ok: true, stopped, missed };
          },
          (res) => ({
            ...(res.missed?.length ? { appearance: 'warning', title: COPY.stopWatchFailed } : { title: dismissedTitle(n, reasonLabel) }),
            body: [stoppedWatching(res.stopped || []), COPY.reloadBadge].filter(Boolean).join(' '),
            reload: true,
          }),
        )
      }
      onAcceptRename={(p) => run(`accept:${p.id}`, () => invoke('acceptRename', { proposalId: p.id }), { title: `Anchor moved to ${p.to}.`, body: '' })}
      onRejectRename={(p) => run(`keep:${p.id}`, () => invoke('rejectRename', { proposalId: p.id }), { title: `Kept the anchor on ${p.from}.`, body: '' })}
    />
  );

  return (
    <Stack space={SPACE.section}>
      {header}
      {banners}
      <Tabs id="dds-byline-tabs">
        <TabList>
          <Tab>{tabLabel('Review', n)}</Tab>
          <Tab>{tabLabel('Anchors', bindings.length)}</Tab>
        </TabList>
        <TabPanel>
          <Box paddingBlockStart="space.200">{review}</Box>
        </TabPanel>
        <TabPanel>
          <Box paddingBlockStart="space.200">
            <Stack space={SPACE.group}>
              <Notice notice={notice} />
              {editor}
            </Stack>
          </Box>
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
