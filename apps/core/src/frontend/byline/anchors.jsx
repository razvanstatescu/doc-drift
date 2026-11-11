// The binding UI (F1): the page's anchors, suggestions from the page body, and a manual add form.
// Saving replaces the anchors and marks the page Verified. Used on its own when a page has no open
// changes, and as the Anchors tab of the review panel otherwise.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Code,
  DynamicTable,
  ErrorMessage,
  Heading,
  Inline,
  Label,
  LoadingButton,
  Select,
  Stack,
  Text,
  Textfield,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';
import { plural } from '../shared/format';

const TYPE_OPTIONS = [
  { label: 'File path or glob', value: 'path' },
  { label: 'Jira issue', value: 'jira' },
  { label: 'Whole repository', value: 'repo' },
];
const WEIGHT_OPTIONS = [
  { label: 'Critical', value: 'critical' },
  { label: 'Normal', value: 'normal' },
];

const sectionStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'radius.medium',
  padding: 'space.200',
});

const keyOf = (a) => [a.anchorType, a.repo || '', a.pattern || '', a.jiraKey || ''].join('|');
const errorText = (e) => String(e?.message || e || 'Unknown error');

/**
 * Props: `bindings` and `suggestions` (the shapes the M1 `load` resolver returned), `canEdit`,
 * `onSaved(message)` and `onError(message)`.
 */
export function AnchorEditor({ bindings, suggestions, canEdit, onSaved, onError }) {
  const [draft, setDraft] = useState([]);
  const [checked, setChecked] = useState({});
  const [suggestRepo, setSuggestRepo] = useState('');
  const [manual, setManual] = useState({ anchorType: 'path', repo: '', pattern: '', weight: 'normal' });
  const [manualError, setManualError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft((bindings || []).map((a) => ({ ...a, key: keyOf(a) })));
    setChecked({});
  }, [bindings]);

  const needsRepo = useMemo(() => (suggestions || []).some((s) => s.needsRepo), [suggestions]);

  const suggestionToAnchor = (s) => {
    if (s.anchorType === 'jira') return { anchorType: 'jira', jiraKey: s.jiraKey, weight: 'normal', label: s.label };
    const repo = s.repo || suggestRepo.trim().toLowerCase();
    return { anchorType: s.anchorType, repo, pattern: s.pattern || '', weight: 'normal' };
  };

  const addManual = async () => {
    setManualError('');
    const input =
      manual.anchorType === 'jira'
        ? { anchorType: 'jira', jiraKey: manual.pattern, weight: manual.weight }
        : { anchorType: manual.anchorType, repo: manual.repo, pattern: manual.pattern, weight: manual.weight };
    try {
      const res = await invoke('checkAnchor', input);
      if (!res?.ok) {
        setManualError(res?.error || 'Check this anchor and try again.');
        return;
      }
      const anchor = { ...res.anchor, key: keyOf(res.anchor) };
      setDraft((d) => (d.some((a) => a.key === anchor.key) ? d : [...d, anchor]));
      setManual((m) => ({ ...m, pattern: '' }));
    } catch (e) {
      setManualError(errorText(e));
    }
  };

  const removeAnchor = (key) => setDraft((d) => d.filter((a) => a.key !== key));
  const setWeight = (key, weight) => setDraft((d) => d.map((a) => (a.key === key ? { ...a, weight } : a)));

  const save = async () => {
    const fromSuggestions = (suggestions || []).filter((s) => checked[s.key]).map(suggestionToAnchor);
    if (fromSuggestions.some((a) => a.anchorType !== 'jira' && !a.repo)) {
      onError({ title: 'Add a repository for the suggested paths', body: 'This page links no repository, so enter one above the suggestions.' });
      return;
    }
    const anchors = [...draft, ...fromSuggestions].map(({ anchorType, repo, pattern, jiraKey, weight }) => ({ anchorType, repo, pattern, jiraKey, weight }));
    setSaving(true);
    try {
      const res = await invoke('save', { anchors });
      if (res?.ok) {
        const n = anchors.length;
        onSaved({
          title: n === 0 ? 'Anchors removed. This page is Unanchored.' : `Saved ${plural(n, 'anchor')}. This page is ${res.statusLabel || 'Verified'}.`,
          body: 'Reload the page to update the badge.',
        });
      } else {
        const details = (res?.errors || []).map((e) => e.error).join(' ');
        onError({ title: res?.message || "Couldn't save the anchors.", body: details });
      }
    } catch (e) {
      onError({ title: "Couldn't save the anchors.", body: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  const head = {
    cells: [
      { key: 'anchor', content: 'Anchor' },
      { key: 'weight', content: 'Weight' },
      { key: 'actions', content: '' },
    ],
  };
  const rows = draft.map((a) => ({
    key: a.key,
    cells: [
      { key: 'anchor', content: <Code>{a.label}</Code> },
      {
        key: 'weight',
        content: (
          <Select
            inputId={`weight-${a.key}`}
            options={WEIGHT_OPTIONS}
            value={WEIGHT_OPTIONS.find((o) => o.value === a.weight)}
            onChange={(o) => setWeight(a.key, o.value)}
            isDisabled={!canEdit}
            spacing="compact"
          />
        ),
      },
      {
        key: 'actions',
        content: (
          <Button appearance="subtle" onClick={() => removeAnchor(a.key)} isDisabled={!canEdit}>
            Remove
          </Button>
        ),
      },
    ],
  }));

  return (
    <Stack space="space.300">
      <Stack space="space.100">
        <Heading size="small">Anchors</Heading>
        {draft.length === 0 ? <Text>No anchors yet. Pick suggestions below or add one by hand.</Text> : <DynamicTable head={head} rows={rows} />}
      </Stack>

      {suggestions?.length ? (
        <Box xcss={sectionStyle}>
          <Stack space="space.100">
            <Heading size="small">Suggested from this page</Heading>
            {needsRepo ? (
              <Stack space="space.050">
                <Label labelFor="suggest-repo">Repository for suggested paths</Label>
                <Textfield id="suggest-repo" placeholder="payments-api" value={suggestRepo} onChange={(e) => setSuggestRepo(e.target.value)} isDisabled={!canEdit} />
              </Stack>
            ) : null}
            {suggestions.map((s) => (
              <Checkbox
                key={s.key}
                value={s.key}
                label={s.needsRepo && suggestRepo ? `${suggestRepo.split('/').pop()}: ${s.pattern}` : s.label}
                isChecked={Boolean(checked[s.key])}
                onChange={(e) => setChecked((c) => ({ ...c, [s.key]: e.target.checked }))}
                isDisabled={!canEdit}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {canEdit ? (
        <Box xcss={sectionStyle}>
          <Stack space="space.100">
            <Heading size="small">Add an anchor</Heading>
            <Inline space="space.100" shouldWrap>
              <Stack space="space.050">
                <Label labelFor="anchor-type">Type</Label>
                <Select inputId="anchor-type" options={TYPE_OPTIONS} value={TYPE_OPTIONS.find((o) => o.value === manual.anchorType)} onChange={(o) => setManual((m) => ({ ...m, anchorType: o.value }))} />
              </Stack>
              {manual.anchorType !== 'jira' ? (
                <Stack space="space.050">
                  <Label labelFor="anchor-repo">Repository</Label>
                  <Textfield id="anchor-repo" placeholder="payments-api" value={manual.repo} onChange={(e) => setManual((m) => ({ ...m, repo: e.target.value }))} />
                </Stack>
              ) : null}
              {manual.anchorType !== 'repo' ? (
                <Stack space="space.050">
                  <Label labelFor="anchor-pattern">{manual.anchorType === 'jira' ? 'Issue key' : 'Anchor path'}</Label>
                  <Textfield
                    id="anchor-pattern"
                    placeholder={manual.anchorType === 'jira' ? 'PAY-142' : 'scripts/rollback.sh'}
                    value={manual.pattern}
                    onChange={(e) => setManual((m) => ({ ...m, pattern: e.target.value }))}
                  />
                </Stack>
              ) : null}
              <Stack space="space.050">
                <Label labelFor="anchor-weight">Weight</Label>
                <Select inputId="anchor-weight" options={WEIGHT_OPTIONS} value={WEIGHT_OPTIONS.find((o) => o.value === manual.weight)} onChange={(o) => setManual((m) => ({ ...m, weight: o.value }))} />
              </Stack>
            </Inline>
            {manual.anchorType === 'path' ? (
              <Text size="small">
                Globs work too, for example <Code>deploy/helm/**</Code>
              </Text>
            ) : null}
            {manualError ? <ErrorMessage>{manualError}</ErrorMessage> : null}
            <ButtonGroup label="Anchor form">
              <Button onClick={addManual}>Add anchor</Button>
            </ButtonGroup>
          </Stack>
        </Box>
      ) : null}

      <ButtonGroup label="Save anchors">
        <LoadingButton appearance="primary" isLoading={saving} onClick={save} isDisabled={!canEdit}>
          Save anchors and mark verified
        </LoadingButton>
      </ButtonGroup>
    </Stack>
  );
}
