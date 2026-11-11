// "Anchor this space" (R-1): suggestions for every unanchored page in one table, strong ones
// pre-checked, then one save. The resolvers check permissions per page (admins and page editors);
// a refusal is explained, never hidden. Restricted pages are skipped (D20).
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  DynamicTable,
  ErrorMessage,
  HelperMessage,
  Inline,
  Label,
  Link,
  LoadingButton,
  SectionMessage,
  Stack,
  Text,
  Textfield,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { COPY } from '../shared/copy';
import { ErrorState, Loading, Muted, SPACE, Section, SuggestionRow } from '../shared/components';
import { isConsentError, plural } from '../shared/format';
import {
  defaultSpaceChecked,
  needsTypedRepo,
  saveSpaceButton,
  skippedPages,
  spaceSaveItems,
  spaceSaveResults,
  spaceSaveSummary,
  spaceSuggestionPages,
} from '../shared/suggest';

const LIMIT = 25;
const errorText = (e) => String(e?.message || e?.error || e || 'Unknown error');
const isForbidden = (res) => res?.error === 'forbidden' || res?.error === 'not_allowed' || res?.error === 'no_permission';

const SUGGEST_HEAD = {
  cells: [
    { key: 'page', content: 'Page' },
    { key: 'anchors', content: 'Suggested anchors' },
  ],
};

const RESULT_HEAD = {
  cells: [
    { key: 'page', content: 'Page' },
    { key: 'result', content: 'Result' },
  ],
};

function Forbidden({ message }) {
  return (
    <SectionMessage appearance="information" title={COPY.anchorSpaceForbidden}>
      <Text>{message && message !== COPY.anchorSpaceForbidden ? `${message} ${COPY.anchorSpaceForbiddenBody}` : COPY.anchorSpaceForbiddenBody}</Text>
    </SectionMessage>
  );
}

/** Props: `spaceKey`, `onClose()`, and `onSaved()` (reloads the dashboard counts). */
export function AnchorSpaceFlow({ spaceKey, onClose, onSaved }) {
  const [phase, setPhase] = useState('loading');
  const [pages, setPages] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [checked, setChecked] = useState({});
  const [repo, setRepo] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const res = await invoke('suggestSpaceAnchors', { spaceKey, limit: LIMIT });
      if (isForbidden(res)) {
        setError(res);
        setPhase('forbidden');
        return;
      }
      if (res?.ok === false || (res && !Array.isArray(res) && res.error)) {
        setError(res);
        setPhase('error');
        return;
      }
      const list = spaceSuggestionPages(res);
      setChecked(defaultSpaceChecked(list));
      setSkipped(skippedPages(res));
      setPages(list);
      setPhase('ready');
    } catch (e) {
      setError(e);
      setPhase('error');
    }
  }, [spaceKey]);

  useEffect(() => {
    load();
  }, [load]);

  const items = spaceSaveItems(pages, checked, repo);
  const repoMissing = needsTypedRepo(pages, checked, repo);
  const anyNeedsRepo = pages.some((p) => p.suggestions.some((s) => s.needsRepo));

  const save = async () => {
    if (!items.length || repoMissing) return;
    setPhase('saving');
    setError(null);
    try {
      const res = await invoke('saveSpaceAnchors', { items });
      if (isForbidden(res)) {
        setError(res);
        setPhase('forbidden');
        return;
      }
      if (res?.ok === false && !res.results && !res.pages) {
        setError(res);
        setPhase('ready');
        return;
      }
      setResults(spaceSaveResults(res, items, pages));
      setPhase('done');
      onSaved?.();
    } catch (e) {
      setError(e);
      setPhase('ready');
    }
  };

  const toggle = (pageId, key, on) => setChecked((c) => ({ ...c, [pageId]: { ...(c[pageId] || {}), [key]: on } }));
  const closeButton = (
    <Button appearance="subtle" onClick={onClose}>
      {COPY.cancel}
    </Button>
  );

  let body;
  if (phase === 'loading') body = <Loading text={COPY.loadingSuggestions} />;
  else if (phase === 'forbidden') {
    body = (
      <Stack space={SPACE.row}>
        <Forbidden message={error?.message} />
        <Inline>{closeButton}</Inline>
      </Stack>
    );
  } else if (phase === 'error') {
    body = isConsentError(error) ? (
      <ErrorState appearance="warning" title={COPY.consentTitle} body={COPY.consentBody} onRetry={load} />
    ) : (
      <ErrorState title={COPY.suggestionsFailed} body={errorText(error)} onRetry={load} />
    );
  } else if (phase === 'done') {
    const rows = results.map((r) => ({
      key: r.pageId,
      cells: [
        { key: 'page', content: <Text>{r.title}</Text> },
        { key: 'result', content: <Text color={r.ok ? 'color.text' : 'color.text.danger'}>{r.text}</Text> },
      ],
    }));
    const allOk = results.every((r) => r.ok);
    body = (
      <Stack space={SPACE.group}>
        <SectionMessage appearance={allOk ? 'success' : 'warning'} title={spaceSaveSummary(results)}>
          <Text>{COPY.reloadBadge}</Text>
        </SectionMessage>
        <DynamicTable label={COPY.saveResultsTable} head={RESULT_HEAD} rows={rows} rowsPerPage={10} />
        <Inline>
          <Button autoFocus onClick={onClose}>
            {COPY.anchorSpaceDone}
          </Button>
        </Inline>
      </Stack>
    );
  } else if (!pages.length) {
    body = (
      <Stack space={SPACE.row}>
        <Text>{COPY.noSuggestions}</Text>
        {skipped.length ? <Muted>{`${plural(skipped.length, 'page')} skipped: restricted pages and drafts can't be watched yet.`}</Muted> : null}
        <Inline>{closeButton}</Inline>
      </Stack>
    );
  } else {
    const rows = pages.map((p) => ({
      key: p.pageId,
      cells: [
        { key: 'page', content: p.url ? <Link href={p.url}>{p.title}</Link> : <Text>{p.title}</Text> },
        {
          key: 'anchors',
          content: (
            <Stack space={SPACE.tight}>
              {p.suggestions.map((s, i) => (
                <SuggestionRow
                  key={s.key}
                  id={`dds-space-${p.pageId}-${i}`}
                  suggestion={s}
                  typedRepo={repo}
                  isChecked={Boolean(checked[p.pageId]?.[s.key])}
                  isDisabled={phase === 'saving'}
                  onChange={(on) => toggle(p.pageId, s.key, on)}
                />
              ))}
            </Stack>
          ),
        },
      ],
    }));
    body = (
      <Stack space={SPACE.group}>
        {anyNeedsRepo ? (
          <Stack space={SPACE.tight}>
            <Label labelFor="dds-space-repo">{COPY.spaceRepo}</Label>
            <Textfield id="dds-space-repo" placeholder="payments-api" value={repo} isInvalid={repoMissing} onChange={(e) => setRepo(e.target.value)} />
            {repoMissing ? <ErrorMessage>{COPY.spaceRepoMissing}</ErrorMessage> : null}
          </Stack>
        ) : null}
        <DynamicTable label={COPY.suggestionsTable} head={SUGGEST_HEAD} rows={rows} rowsPerPage={10} />
        {skipped.length ? <Muted>{`${plural(skipped.length, 'page')} skipped: restricted pages and drafts can't be watched yet.`}</Muted> : null}
        {error ? <ErrorState title={COPY.spaceSaveFailed} body={errorText(error)} /> : null}
        <Stack space={SPACE.tight}>
          <Inline space={SPACE.row}>
            <LoadingButton appearance="primary" isLoading={phase === 'saving'} isDisabled={!items.length || repoMissing} onClick={save}>
              {saveSpaceButton(items.length)}
            </LoadingButton>
            {closeButton}
          </Inline>
          <HelperMessage>{`${plural(pages.length, 'unanchored page')} with suggestions. Saving marks each saved page Verified.`}</HelperMessage>
        </Stack>
      </Stack>
    );
  }

  return (
    <Section title={COPY.anchorSpace} as="h2" size="medium">
      <Muted>{COPY.anchorSpaceLead}</Muted>
      {body}
    </Section>
  );
}
