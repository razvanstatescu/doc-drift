// The binding UI (F1): the page's anchors, suggestions from the page body, and a manual add form.
// Saving replaces the anchors and marks the page Verified. Used on its own when a page has no changes
// to review, and as the Anchors tab of the review panel otherwise.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Box,
  Checkbox,
  Code,
  DynamicTable,
  ErrorMessage,
  HelperMessage,
  Inline,
  Label,
  LoadingButton,
  Select,
  Stack,
  Text,
  Textfield,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { COPY, anchorsSavedTitle } from '../shared/copy';
import { Muted, SPACE, Section, SuggestionRow, cardStyle } from '../shared/components';
import { anchorInputError, plural } from '../shared/format';
import { defaultChecked, sortSuggestions, suggestionToAnchor } from '../shared/suggest';

// UX-10: the whole repository is demoted and labelled weak: it flags the page on every merge.
const TYPE_OPTIONS = [
  { label: 'File path or glob', value: 'path' },
  { label: 'Jira issue', value: 'jira' },
  { label: 'Whole repository (weak: flags on every merge)', value: 'repo' },
];

const EMPTY_MANUAL = { anchorType: 'path', repo: '', pattern: '', critical: false };

const keyOf = (a) => [a.anchorType, a.repo || '', a.pattern || '', a.jiraKey || ''].join('|');
const errorText = (e) => String(e?.message || e || 'Unknown error');
const sameAnchors = (a, b) =>
  a.length === b.length && a.every((x) => b.some((y) => keyOf(y) === x.key && (y.weight || 'normal') === (x.weight || 'normal')));

/**
 * Props: `bindings` and `suggestions` (from `getPageDrift`), `canEdit` (the `editAnchors` capability),
 * `gateNote` (why editing is off), `onSaved(message)` and `onError(message)`.
 */
export function AnchorEditor({ bindings, suggestions, canEdit, gateNote, onSaved, onError }) {
  const [draft, setDraft] = useState([]);
  const [checked, setChecked] = useState({});
  const [suggestRepo, setSuggestRepo] = useState('');
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [fieldError, setFieldError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => sortSuggestions(suggestions || []), [suggestions]);

  useEffect(() => {
    setDraft((bindings || []).map((a) => ({ ...a, key: keyOf(a) })));
    // A page's first anchors: strong suggestions start checked. Later, nothing is added unasked.
    setChecked((bindings || []).length === 0 ? defaultChecked(list) : {});
  }, [bindings, list]);

  const pickedSuggestions = list.filter((s) => checked[s.key]);
  const needsRepo = useMemo(() => list.some((s) => s.needsRepo), [list]);
  const repoMissing = pickedSuggestions.some((s) => s.needsRepo) && !suggestRepo.trim();
  const dirty = pickedSuggestions.length > 0 || !sameAnchors(draft, bindings || []);

  const setField = (patch) => {
    setManual((m) => ({ ...m, ...patch }));
    setFieldError(null);
  };

  const addManual = async () => {
    const local = anchorInputError(manual);
    if (local) {
      setFieldError(local);
      return;
    }
    const weight = manual.critical ? 'critical' : 'normal';
    const input =
      manual.anchorType === 'jira'
        ? { anchorType: 'jira', jiraKey: manual.pattern.trim(), weight }
        : { anchorType: manual.anchorType, repo: manual.repo.trim(), pattern: manual.pattern.trim(), weight };
    setAdding(true);
    try {
      const res = await invoke('checkAnchor', input);
      if (!res?.ok) {
        setFieldError({ field: manual.anchorType === 'repo' ? 'repo' : 'pattern', message: res?.message || res?.error || 'Check this anchor and try again.' });
        return;
      }
      const anchor = { ...res.anchor, key: keyOf(res.anchor) };
      if (draft.some((a) => a.key === anchor.key)) {
        setFieldError({ field: manual.anchorType === 'repo' ? 'repo' : 'pattern', message: COPY.duplicateAnchor });
        return;
      }
      setDraft((d) => [...d, anchor]);
      setManual((m) => ({ ...m, pattern: '', critical: false }));
    } catch (e) {
      setFieldError({ field: 'pattern', message: errorText(e) });
    } finally {
      setAdding(false);
    }
  };

  const removeAnchor = (key) => setDraft((d) => d.filter((a) => a.key !== key));
  const setCritical = (key, on) => setDraft((d) => d.map((a) => (a.key === key ? { ...a, weight: on ? 'critical' : 'normal' } : a)));

  const save = async () => {
    if (repoMissing) return;
    const fromSuggestions = pickedSuggestions.map((sg) => suggestionToAnchor(sg, suggestRepo));
    const anchors = [...draft, ...fromSuggestions].map(({ anchorType, repo, pattern, jiraKey, weight }) => ({ anchorType, repo, pattern, jiraKey, weight }));
    setSaving(true);
    try {
      const res = await invoke('save', { anchors });
      if (res?.ok) {
        onSaved({ title: anchorsSavedTitle(anchors.length, res.statusLabel || 'Verified'), body: COPY.reloadBadge });
      } else {
        const details = (res?.errors || []).map((e) => e.error).join(' ');
        onError({ title: res?.message || COPY.saveFailed, body: details });
      }
    } catch (e) {
      onError({ title: COPY.saveFailed, body: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  const head = {
    cells: [
      { key: 'anchor', content: 'Anchor' },
      { key: 'weight', content: 'Weight' },
      { key: 'actions', content: 'Actions' },
    ],
  };
  const rows = draft.map((a) => ({
    key: a.key,
    cells: [
      {
        key: 'anchor',
        content: (
          <Stack space="space.025">
            <Code>{a.label || a.pattern || a.jiraKey || a.repo}</Code>
            {a.dismissCount > 0 ? <Muted tone="subtlest">{`Dismissed ${plural(a.dismissCount, 'time')}`}</Muted> : null}
          </Stack>
        ),
      },
      {
        key: 'weight',
        content: (
          <Checkbox
            value={a.key}
            label={COPY.critical}
            isChecked={a.weight === 'critical'}
            onChange={(e) => setCritical(a.key, Boolean(e?.target?.checked))}
            isDisabled={!canEdit}
          />
        ),
      },
      {
        key: 'actions',
        content: (
          <Button appearance="subtle" onClick={() => removeAnchor(a.key)} isDisabled={!canEdit}>
            {COPY.remove}
          </Button>
        ),
      },
    ],
  }));

  const repoInvalid = fieldError?.field === 'repo';
  const patternInvalid = fieldError?.field === 'pattern';

  return (
    <Stack space={SPACE.section}>
      <Section title={COPY.anchors}>
        <Muted>{COPY.anchorExplainer}</Muted>
        {draft.length === 0 ? <Text>{COPY.noAnchors}</Text> : <DynamicTable label={COPY.anchorsTable} head={head} rows={rows} />}
        {draft.length ? <Muted tone="subtlest">{COPY.criticalHelp}</Muted> : null}
      </Section>

      {list.length ? (
        <Box xcss={cardStyle}>
          <Section title={`${COPY.suggested} (${list.length})`}>
            <Muted>{COPY.suggestedHelp}</Muted>
            {needsRepo ? (
              <Stack space={SPACE.tight}>
                <Label labelFor="dds-suggest-repo">{COPY.suggestRepo}</Label>
                <Textfield
                  id="dds-suggest-repo"
                  placeholder="payments-api"
                  value={suggestRepo}
                  isInvalid={repoMissing}
                  onChange={(e) => setSuggestRepo(e.target.value)}
                  isDisabled={!canEdit}
                />
                {repoMissing ? <ErrorMessage>{COPY.suggestRepoMissing}</ErrorMessage> : null}
              </Stack>
            ) : null}
            <Stack space={SPACE.tight}>
              {list.map((s, i) => (
                <SuggestionRow
                  key={s.key}
                  id={`dds-suggestion-${i}`}
                  suggestion={s}
                  typedRepo={suggestRepo}
                  isChecked={Boolean(checked[s.key])}
                  isDisabled={!canEdit}
                  onChange={(on) => setChecked((c) => ({ ...c, [s.key]: on }))}
                />
              ))}
            </Stack>
          </Section>
        </Box>
      ) : null}

      {canEdit ? (
        <Box xcss={cardStyle}>
          <Section title={COPY.addAnchor} space={SPACE.group}>
            <Inline space={SPACE.row} shouldWrap alignBlock="start">
              <Stack space={SPACE.tight}>
                <Label labelFor="dds-anchor-type">Type</Label>
                <Select
                  inputId="dds-anchor-type"
                  options={TYPE_OPTIONS}
                  value={TYPE_OPTIONS.find((o) => o.value === manual.anchorType)}
                  onChange={(o) => setField({ anchorType: o.value })}
                />
              </Stack>
              {manual.anchorType !== 'jira' ? (
                <Stack space={SPACE.tight}>
                  <Label labelFor="dds-anchor-repo">Repository</Label>
                  <Textfield id="dds-anchor-repo" placeholder="payments-api" value={manual.repo} isInvalid={repoInvalid} onChange={(e) => setField({ repo: e.target.value })} />
                  {repoInvalid ? <ErrorMessage>{fieldError.message}</ErrorMessage> : null}
                </Stack>
              ) : null}
              {manual.anchorType !== 'repo' ? (
                <Stack space={SPACE.tight}>
                  <Label labelFor="dds-anchor-pattern">{manual.anchorType === 'jira' ? 'Issue key' : 'Anchor path'}</Label>
                  <Textfield
                    id="dds-anchor-pattern"
                    placeholder={manual.anchorType === 'jira' ? 'PAY-142' : 'scripts/rollback.sh'}
                    value={manual.pattern}
                    isInvalid={patternInvalid}
                    onChange={(e) => setField({ pattern: e.target.value })}
                  />
                  {patternInvalid ? <ErrorMessage>{fieldError.message}</ErrorMessage> : null}
                </Stack>
              ) : null}
            </Inline>
            {manual.anchorType === 'path' ? (
              <Muted>
                {COPY.globHelp} <Code>deploy/helm/**</Code>
              </Muted>
            ) : null}
            <Checkbox value="critical" label={COPY.critical} isChecked={manual.critical} onChange={(e) => setField({ critical: Boolean(e?.target?.checked) })} />
            <Inline>
              <LoadingButton isLoading={adding} onClick={addManual}>
                {COPY.addAnchorButton}
              </LoadingButton>
            </Inline>
          </Section>
        </Box>
      ) : null}

      <Stack space={SPACE.tight}>
        <Inline>
          <LoadingButton appearance="primary" isLoading={saving} onClick={save} isDisabled={!canEdit || repoMissing}>
            {COPY.saveAnchors}
          </LoadingButton>
        </Inline>
        {canEdit ? <HelperMessage>{dirty ? `${COPY.unsaved} ${COPY.saveHelp}` : COPY.saveHelp}</HelperMessage> : gateNote ? <HelperMessage>{gateNote}</HelperMessage> : null}
      </Stack>
    </Stack>
  );
}
