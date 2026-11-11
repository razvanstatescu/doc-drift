// Byline modal: the binding UI (F1). Lists the page's anchors, suggests anchors from the page body,
// takes manual anchors, and saves them (which marks the page Verified). UI Kit components only.
import React, { useEffect, useMemo, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Code,
  DynamicTable,
  ErrorMessage,
  Heading,
  Icon,
  Inline,
  Label,
  LoadingButton,
  Lozenge,
  Select,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  Textfield,
  xcss,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

// Each state is always a word and an icon (CLAUDE.md naming rules).
const STATE_UI = {
  verified: { glyph: 'check-circle', color: 'color.icon.success', lozenge: 'success', label: 'Verified' },
  possibly_stale: { glyph: 'warning', color: 'color.icon.warning', lozenge: 'moved', label: 'Possibly stale' },
  stale: { glyph: 'recent', color: 'color.icon.danger', lozenge: 'removed', label: 'Stale' },
  unanchored: { glyph: 'unlink', color: 'color.icon.subtle', lozenge: 'default', label: 'Unanchored' },
};

const TYPE_OPTIONS = [
  { label: 'File path or glob', value: 'path' },
  { label: 'Jira issue', value: 'jira' },
  { label: 'Whole repository', value: 'repo' },
];
const WEIGHT_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Critical', value: 'critical' },
];

const sectionStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'border.radius',
  padding: 'space.200',
});

const keyOf = (a) => [a.anchorType, a.repo || '', a.pattern || '', a.jiraKey || ''].join('|');

function StateBadge({ status }) {
  const ui = STATE_UI[status] || STATE_UI.unanchored;
  return (
    <Inline space="space.075" alignBlock="center">
      <Icon glyph={ui.glyph} label={ui.label} primaryColor={ui.color} size="small" />
      <Lozenge appearance={ui.lozenge}>{ui.label}</Lozenge>
    </Inline>
  );
}

function shortDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const App = () => {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState([]);
  const [checked, setChecked] = useState({});
  const [suggestRepo, setSuggestRepo] = useState('');
  const [manual, setManual] = useState({ anchorType: 'path', repo: '', pattern: '', weight: 'normal' });
  const [manualError, setManualError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const res = await invoke('load');
    setData(res);
    setDraft((res.anchors || []).map((a) => ({ ...a, key: keyOf(a) })));
    setChecked({});
  };

  useEffect(() => {
    load().catch((e) => setData({ error: String(e?.message || e) }));
  }, []);

  const needsRepo = useMemo(() => (data?.suggestions || []).some((s) => s.needsRepo), [data]);

  if (!data) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner size="medium" label="Loading" />
        <Text>Loading anchors…</Text>
      </Inline>
    );
  }
  if (data.error === 'not_visible') return <Text>Page not found or not visible to you.</Text>;
  if (data.error) return <SectionMessage appearance="error" title="Doc Drift Sentinel could not load this page"><Text>{data.error}</Text></SectionMessage>;
  if (data.restricted) {
    return (
      <Stack space="space.200">
        <Heading size="medium">Doc Drift Sentinel</Heading>
        <SectionMessage appearance="warning" title="Restricted pages can't be watched yet.">
          <Text>This page has view restrictions, so Doc Drift Sentinel can't read it or receive its updates. Remove the restriction to add anchors.</Text>
        </SectionMessage>
        <ButtonGroup>
          <Button onClick={() => view.close()}>Close</Button>
        </ButtonGroup>
      </Stack>
    );
  }

  const suggestionToAnchor = (s) => {
    if (s.anchorType === 'jira') return { anchorType: 'jira', jiraKey: s.jiraKey, weight: 'normal', label: s.label };
    const repo = s.repo || suggestRepo.trim().toLowerCase();
    return { anchorType: s.anchorType, repo, pattern: s.pattern || '', weight: 'normal', label: s.repo ? s.label : `${repo.split('/').pop()}: ${s.pattern}` };
  };

  const toggleSuggestion = (s, isChecked) => {
    setChecked((c) => ({ ...c, [s.key]: isChecked }));
  };

  const addManual = async () => {
    setManualError('');
    const input =
      manual.anchorType === 'jira'
        ? { anchorType: 'jira', jiraKey: manual.pattern, weight: manual.weight }
        : { anchorType: manual.anchorType, repo: manual.repo, pattern: manual.pattern, weight: manual.weight };
    const res = await invoke('checkAnchor', input);
    if (!res.ok) {
      setManualError(res.error);
      return;
    }
    const anchor = { ...res.anchor, key: keyOf(res.anchor) };
    setDraft((d) => (d.some((a) => a.key === anchor.key) ? d : [...d, anchor]));
    setManual((m) => ({ ...m, pattern: '' }));
  };

  const removeAnchor = (key) => setDraft((d) => d.filter((a) => a.key !== key));
  const setWeight = (key, weight) => setDraft((d) => d.map((a) => (a.key === key ? { ...a, weight } : a)));

  const save = async () => {
    setMessage(null);
    const fromSuggestions = (data.suggestions || []).filter((s) => checked[s.key]).map(suggestionToAnchor);
    if (fromSuggestions.some((a) => a.anchorType !== 'jira' && !a.repo)) {
      setMessage({ appearance: 'warning', title: 'Add a repository for the suggested paths', body: 'This page links no repository, so enter one above the suggestions.' });
      return;
    }
    const anchors = [...draft, ...fromSuggestions].map(({ anchorType, repo, pattern, jiraKey, weight }) => ({ anchorType, repo, pattern, jiraKey, weight }));
    setSaving(true);
    try {
      const res = await invoke('save', { anchors });
      if (res.ok) {
        const n = anchors.length;
        setMessage({
          appearance: 'success',
          title: n === 0 ? 'Anchors removed. This page is Unanchored.' : `Saved ${n} anchor${n === 1 ? '' : 's'}. This page is ${res.statusLabel}.`,
          body: 'Reload the page to update the badge.',
        });
        await load();
      } else {
        const details = (res.errors || []).map((e) => e.error).join(' ');
        setMessage({ appearance: 'error', title: res.message || 'Could not save anchors.', body: details });
      }
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
            isDisabled={!data.canEdit}
          />
        ),
      },
      {
        key: 'actions',
        content: (
          <Button appearance="subtle" onClick={() => removeAnchor(a.key)} isDisabled={!data.canEdit}>
            Remove
          </Button>
        ),
      },
    ],
  }));

  return (
    <Stack space="space.300">
      <Stack space="space.100">
        <Heading size="medium">Doc Drift Sentinel</Heading>
        <Inline space="space.100" alignBlock="center">
          <StateBadge status={data.status} />
          {data.status === 'verified' && data.verifiedAt ? <Text>Verified {shortDate(data.verifiedAt)}. Watching {draft.length} anchor{draft.length === 1 ? '' : 's'}.</Text> : null}
          {data.status === 'unanchored' ? <Text>Not linked to code or Jira. Add anchors.</Text> : null}
        </Inline>
      </Stack>

      {message ? (
        <SectionMessage appearance={message.appearance} title={message.title}>
          <Text>{message.body}</Text>
        </SectionMessage>
      ) : null}

      {data.events?.length ? (
        <Stack space="space.100">
          <Heading size="small">What changed</Heading>
          {data.events.map((e) => (
            <Text key={e.id}>
              <Code>{e.ref}</Code> · {shortDate(e.at)} · {e.summary} · {e.severity === 'high' ? 'High' : 'Medium'}
              {e.anchor ? <> · anchor <Code>{e.anchor}</Code></> : null}
            </Text>
          ))}
          <Text>Agents are told not to trust this page until someone reviews it. Saving anchors marks it Verified.</Text>
        </Stack>
      ) : null}

      <Stack space="space.100">
        <Heading size="small">Anchors</Heading>
        {draft.length === 0 ? <Text>No anchors yet. Pick suggestions below or add one by hand.</Text> : <DynamicTable head={head} rows={rows} />}
      </Stack>

      {data.suggestions?.length ? (
        <Box xcss={sectionStyle}>
          <Stack space="space.100">
            <Heading size="small">Suggested from this page</Heading>
            {needsRepo ? (
              <Stack space="space.050">
                <Label labelFor="suggest-repo">Repository for suggested paths</Label>
                <Textfield id="suggest-repo" placeholder="payments-api" value={suggestRepo} onChange={(e) => setSuggestRepo(e.target.value)} />
              </Stack>
            ) : null}
            {data.suggestions.map((s) => (
              <Checkbox
                key={s.key}
                value={s.key}
                label={s.needsRepo && suggestRepo ? `${suggestRepo.split('/').pop()}: ${s.pattern}` : s.label}
                isChecked={Boolean(checked[s.key])}
                onChange={(e) => toggleSuggestion(s, e.target.checked)}
                isDisabled={!data.canEdit}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {data.canEdit ? (
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
            {manual.anchorType === 'path' ? <Text>Globs work too, for example <Code>deploy/helm/**</Code></Text> : null}
            {manualError ? <ErrorMessage>{manualError}</ErrorMessage> : null}
            <ButtonGroup>
              <Button onClick={addManual}>Add anchor</Button>
            </ButtonGroup>
          </Stack>
        </Box>
      ) : (
        <SectionMessage appearance="information" title="View only">
          <Text>You need edit rights on this page to change its anchors.</Text>
        </SectionMessage>
      )}

      <ButtonGroup>
        <LoadingButton appearance="primary" isLoading={saving} onClick={save} isDisabled={!data.canEdit}>
          Save anchors and mark verified
        </LoadingButton>
        <Button appearance="subtle" onClick={() => view.close()}>
          Close
        </Button>
      </ButtonGroup>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
