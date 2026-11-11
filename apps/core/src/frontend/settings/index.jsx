// Global settings (useAsConfig, F13): detection (sensitivity, ignore globs, branch filter), watched
// spaces, escalation and notifications, Jira, the Bitbucket relay connection (ingest URL, secret,
// connection status) and demo mode. UI Kit components only; copy follows brand/voice-and-copy.md.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  ButtonGroup,
  Code,
  ErrorMessage,
  Heading,
  HelperMessage,
  Inline,
  Label,
  LoadingButton,
  Lozenge,
  RadioGroup,
  SectionMessage,
  Select,
  Spinner,
  Stack,
  Strong,
  Text,
  TextArea,
  Textfield,
  Toggle,
  ValidMessage,
  useProductContext,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const SENSITIVITY = [
  { name: 'sensitivity', value: 'strict', label: 'Strict: flag at a score of 0.4. More flags, some noise.' },
  { name: 'sensitivity', value: 'balanced', label: 'Balanced: flag at 0.5. The default.' },
  { name: 'sensitivity', value: 'quiet', label: 'Quiet: flag at 0.65. Only strong matches.' },
];

const SPACE_MODES = [
  { name: 'spaceMode', value: 'all', label: 'All spaces' },
  { name: 'spaceMode', value: 'selected', label: 'Selected spaces only' },
];

const sectionStyle = xcss({
  borderColor: 'color.border',
  borderStyle: 'solid',
  borderWidth: 'border.width',
  borderRadius: 'radius.medium',
  padding: 'space.200',
});

function Section({ title, children }) {
  return (
    <Box xcss={sectionStyle}>
      <Stack space="space.150">
        <Heading size="small">{title}</Heading>
        {children}
      </Stack>
    </Box>
  );
}

function Field({ children }) {
  return <Stack space="space.050">{children}</Stack>;
}

const dateTime = (iso) =>
  iso ? new Date(String(iso).includes('T') ? iso : `${String(iso).replace(' ', 'T')}Z`).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Form state from stored settings. Text inputs keep strings until save. */
function toForm(s) {
  return {
    sensitivity: s.sensitivity,
    ignoreGlobs: s.ignoreGlobs.join('\n'),
    spaceMode: s.spaceMode,
    spaceKeys: s.spaceKeys,
    escalationDays: String(s.escalationDays),
    notifyEnabled: s.notifyEnabled,
    notifyDebounceMinutes: String(s.notifyDebounceMinutes),
    ignoreNonDefaultBranches: s.ignoreNonDefaultBranches,
    jiraEnabled: s.jiraEnabled,
  };
}

/** Inline checks before save; the resolver validates again and returns every bad field. */
function localErrors(f, limits) {
  const e = {};
  const whole = (v) => /^\d+$/.test(String(v).trim());
  if (!whole(f.escalationDays) || +f.escalationDays < 1 || +f.escalationDays > limits.maxEscalationDays) {
    e.escalationDays = `Enter a whole number of days from 1 to ${limits.maxEscalationDays}.`;
  }
  if (!whole(f.notifyDebounceMinutes) || +f.notifyDebounceMinutes > limits.maxNotifyDebounceMinutes) {
    e.notifyDebounceMinutes = `Enter a whole number of minutes from 0 to ${limits.maxNotifyDebounceMinutes}.`;
  }
  if (f.spaceMode === 'selected' && f.spaceKeys.length === 0) e.spaceKeys = 'Pick at least 1 space, or watch all spaces.';
  const globs = f.ignoreGlobs.split('\n').map((g) => g.trim()).filter(Boolean);
  if (globs.length > limits.maxIgnoreGlobs) e.ignoreGlobs = `Use at most ${limits.maxIgnoreGlobs} ignore globs. You have ${globs.length}.`;
  else if (globs.some((g) => /\s/.test(g))) e.ignoreGlobs = 'Globs cannot contain spaces. Put each glob on its own line.';
  return e;
}

const App = () => {
  const context = useProductContext();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (context === undefined) return; // wait for the context so the settings location is saved
    invoke('load', { location: context?.extension?.location ?? null })
      .then((res) => {
        setData(res);
        if (res.ok) setForm(toForm(res.settings));
      })
      .catch((e) => setData({ ok: false, message: String(e?.message || e) }));
  }, [context === undefined]);

  if (!data) return <Spinner size="medium" label="Loading settings" />;
  if (!data.ok) {
    return (
      <SectionMessage appearance={data.error === 'forbidden' ? 'information' : 'warning'} title="Settings are for Confluence administrators">
        <Text>{data.message}</Text>
      </SectionMessage>
    );
  }

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const run = async (name, fn) => {
    setBusy(name);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice({ appearance: 'error', title: 'Something went wrong. Try again.', body: String(e?.message || e) });
    } finally {
      setBusy('');
    }
  };

  const save = () =>
    run('save', async () => {
      const local = localErrors(form, data.limits);
      if (Object.keys(local).length > 0) {
        setErrors(local);
        setSaved(false);
        return;
      }
      const res = await invoke('saveSettings', {
        ...form,
        escalationDays: Number(form.escalationDays),
        notifyDebounceMinutes: Number(form.notifyDebounceMinutes),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setSaved(false);
        if (!res.fieldErrors) setNotice({ appearance: 'error', title: res.message, body: '' });
        return;
      }
      setForm(toForm(res.settings));
      setData((d) => ({ ...d, settings: res.settings }));
      setErrors({});
      setSaved(true);
    });

  const rotate = () =>
    run('secret', async () => {
      const res = await invoke('rotateSecret');
      if (!res.ok) return setNotice({ appearance: 'error', title: res.message, body: '' });
      setNewSecret(res.secret);
      setData((d) => ({ ...d, secret: res.meta }));
    });

  const replay = () =>
    run('replay', async () => {
      const res = await invoke('replayDemo');
      if (!res.ok) return setNotice({ appearance: 'error', title: res.message, body: '' });
      setNotice({
        appearance: 'success',
        title: `Replayed PR #${data.demoPrId}.`,
        body: 'Pages anchored to scripts/rollback.sh or deploy/helm/values.yaml in payments-api update within a minute. Reload a page to see its badge.',
      });
    });

  const spaceOptions = data.spaces.map((s) => ({ label: `${s.name} (${s.key})`, value: s.key }));
  // Keep saved keys that the listing did not return (archived or not visible), so they are not lost.
  for (const key of form.spaceKeys) if (!spaceOptions.some((o) => o.value === key)) spaceOptions.push({ label: key, value: key });
  const selectedSpaces = spaceOptions.filter((o) => form.spaceKeys.includes(o.value));
  const conn = data.connection;
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <Stack space="space.300">
      <Text>
        Doc Drift Sentinel anchors Confluence pages to code and Jira work, flags them Possibly stale when those change, and tells agents which pages
        to trust. These settings apply to the next change it receives.
      </Text>

      {notice ? (
        <SectionMessage appearance={notice.appearance} title={notice.title}>
          {notice.body ? <Text>{notice.body}</Text> : null}
        </SectionMessage>
      ) : null}

      <Section title="Detection">
        <Field>
          <Label id="sensitivity-label" labelFor="sensitivity">Sensitivity</Label>
          <RadioGroup name="sensitivity" aria-labelledby="sensitivity-label" options={SENSITIVITY} value={form.sensitivity} onChange={(e) => set('sensitivity', e.target.value)} />
          <HelperMessage>How strongly a change must match a page's anchors before the page is flagged.</HelperMessage>
          {errors.sensitivity ? <ErrorMessage>{errors.sensitivity}</ErrorMessage> : null}
        </Field>
        <Field>
          <Label labelFor="ignore-globs">Ignore globs, one per line</Label>
          <TextArea
            id="ignore-globs"
            value={form.ignoreGlobs}
            onChange={(e) => set('ignoreGlobs', e.target.value)}
            resize="vertical"
            isMonospaced
            isInvalid={!!errors.ignoreGlobs}
          />
          {errors.ignoreGlobs ? (
            <ErrorMessage>{errors.ignoreGlobs}</ErrorMessage>
          ) : (
            <HelperMessage>Changes to matching files never flag a page. A glob without a slash matches a file name at any depth.</HelperMessage>
          )}
          <ButtonGroup>
            <Button appearance="subtle" onClick={() => set('ignoreGlobs', data.defaults.ignoreGlobs.join('\n'))}>
              Reset to defaults
            </Button>
          </ButtonGroup>
        </Field>
        <Field>
          <Inline space="space.100" alignBlock="center">
            <Toggle id="branch-filter" isChecked={form.ignoreNonDefaultBranches} onChange={() => set('ignoreNonDefaultBranches', !form.ignoreNonDefaultBranches)} />
            <Label labelFor="branch-filter">Only count merges into the main branch</Label>
          </Inline>
          <HelperMessage>Merges into release or feature branches never flag a page. The relay sends main-branch merges only.</HelperMessage>
        </Field>
      </Section>

      <Section title="Spaces">
        <Field>
          <Label id="space-mode-label" labelFor="space-mode">Watch pages in</Label>
          <RadioGroup name="spaceMode" aria-labelledby="space-mode-label" options={SPACE_MODES} value={form.spaceMode} onChange={(e) => set('spaceMode', e.target.value)} />
          {errors.spaceMode ? <ErrorMessage>{errors.spaceMode}</ErrorMessage> : null}
        </Field>
        {form.spaceMode === 'selected' ? (
          <Field>
            <Label labelFor="space-keys">Spaces to watch</Label>
            <Select
              inputId="space-keys"
              isMulti
              isSearchable
              options={spaceOptions}
              value={selectedSpaces}
              placeholder="Pick spaces"
              isInvalid={!!errors.spaceKeys}
              onChange={(v) => set('spaceKeys', (v ?? []).map((o) => o.value))}
            />
            {errors.spaceKeys ? (
              <ErrorMessage>{errors.spaceKeys}</ErrorMessage>
            ) : (
              <HelperMessage>Pages in other spaces keep their anchors, but new changes don't flag them.</HelperMessage>
            )}
            {data.spacesTruncated ? <HelperMessage>Showing the first 1000 spaces.</HelperMessage> : null}
          </Field>
        ) : (
          <HelperMessage>Every space is watched. Pick selected spaces to roll out space by space.</HelperMessage>
        )}
      </Section>

      <Section title="Escalation and notifications">
        <Field>
          <Label labelFor="escalation-days">Days before Possibly stale becomes Stale</Label>
          <Textfield
            id="escalation-days"
            type="number"
            min={1}
            max={data.limits.maxEscalationDays}
            width={120}
            value={form.escalationDays}
            isInvalid={!!errors.escalationDays}
            onChange={(e) => set('escalationDays', e.target.value)}
          />
          {errors.escalationDays ? (
            <ErrorMessage>{errors.escalationDays}</ErrorMessage>
          ) : (
            <HelperMessage>{`1 to ${data.limits.maxEscalationDays} days. 3 or more open changes also mark a page Stale.`}</HelperMessage>
          )}
        </Field>
        <Field>
          <Inline space="space.100" alignBlock="center">
            <Toggle id="notify-enabled" isChecked={form.notifyEnabled} onChange={() => set('notifyEnabled', !form.notifyEnabled)} />
            <Label labelFor="notify-enabled">Comment on flagged pages and mention the owner</Label>
          </Inline>
          <HelperMessage>At most 1 comment per page per day. Later changes that day are added to the same comment.</HelperMessage>
        </Field>
        {form.notifyEnabled ? (
          <Field>
            <Label labelFor="notify-debounce">Wait before commenting, in minutes</Label>
            <Textfield
              id="notify-debounce"
              type="number"
              min={0}
              max={data.limits.maxNotifyDebounceMinutes}
              width={120}
              value={form.notifyDebounceMinutes}
              isInvalid={!!errors.notifyDebounceMinutes}
              onChange={(e) => set('notifyDebounceMinutes', e.target.value)}
            />
            {errors.notifyDebounceMinutes ? (
              <ErrorMessage>{errors.notifyDebounceMinutes}</ErrorMessage>
            ) : (
              <HelperMessage>{`0 to ${data.limits.maxNotifyDebounceMinutes}. Changes in this window become 1 comment. Use 0 for demos.`}</HelperMessage>
            )}
          </Field>
        ) : null}
      </Section>

      <Section title="Jira">
        <Field>
          <Inline space="space.100" alignBlock="center">
            <Toggle id="jira-enabled" isChecked={form.jiraEnabled} onChange={() => set('jiraEnabled', !form.jiraEnabled)} />
            <Label labelFor="jira-enabled">Flag pages when an anchored Jira issue changes</Label>
          </Inline>
          <HelperMessage>Status, resolution, fix version, component, parent and description changes count. Off: Jira is ignored.</HelperMessage>
        </Field>
      </Section>

      <Stack space="space.100">
        <Inline space="space.150" alignBlock="center">
          <LoadingButton appearance="primary" isLoading={busy === 'save'} onClick={save}>
            Save settings
          </LoadingButton>
          {saved ? <ValidMessage>Saved</ValidMessage> : null}
        </Inline>
        {errorCount > 0 ? <ErrorMessage>{`${plural(errorCount, 'setting')} ${errorCount === 1 ? 'needs' : 'need'} a fix. Nothing was saved.`}</ErrorMessage> : null}
      </Stack>

      <Section title="Bitbucket relay">
        <Inline space="space.100" alignBlock="center">
          <Lozenge appearance={conn.lastPingAt || conn.lastRecord ? 'success' : 'default'}>{conn.lastPingAt || conn.lastRecord ? 'Connected' : 'Not connected'}</Lozenge>
          {conn.workspaceUuid ? (
            <Text>
              Workspace <Code>{conn.workspaceUuid}</Code>
            </Text>
          ) : null}
        </Inline>
        <Stack space="space.050">
          <Text>{conn.lastPingAt ? `Last test ping: ${dateTime(conn.lastPingAt)}` : 'No test ping yet. Use Send test ping in the relay settings.'}</Text>
          <Text>
            {conn.lastRecord
              ? `Last change: ${conn.lastRecord.repo ?? 'unknown repo'}${conn.lastRecord.prId ? ` PR #${conn.lastRecord.prId}` : ''}, ${dateTime(conn.lastRecord.receivedAt)}. ${plural(conn.records30d, 'change')} in the last 30 days.`
              : 'No merged pull requests received yet.'}
          </Text>
          {conn.repos.length > 0 ? (
            <Text>{`Repositories seen: ${conn.repos.map((r) => r.repo).join(', ')}`}</Text>
          ) : null}
        </Stack>
        <Text>Install the Doc Drift Sentinel Bitbucket relay in your workspace, then paste this URL and the secret into its settings.</Text>
        <Text>
          <Strong>Ingest URL</Strong>
        </Text>
        <Code>{data.ingestUrl}</Code>
        <Text>
          <Strong>Relay secret</Strong>
        </Text>
        {data.secret ? (
          <Text>
            Set on {new Date(data.secret.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}. Fingerprint{' '}
            <Code>{data.secret.fingerprint}</Code>
          </Text>
        ) : (
          <Text>No secret yet. The ingest URL rejects every request until you generate one.</Text>
        )}
        {newSecret ? (
          <SectionMessage appearance="warning" title="Copy this secret now. It is shown only once.">
            <Code>{newSecret}</Code>
          </SectionMessage>
        ) : null}
        <ButtonGroup>
          <LoadingButton isLoading={busy === 'secret'} onClick={rotate}>
            {data.secret ? 'Rotate secret' : 'Generate secret'}
          </LoadingButton>
        </ButtonGroup>
        {data.secret ? <HelperMessage>Rotating stops the old secret at once. Update the relay right after.</HelperMessage> : null}
      </Section>

      <Section title="Demo mode">
        <Text>
          Replays seeded PR #{data.demoPrId} from <Code>payments-api</Code>: <Code>scripts/rollback.sh</Code> renamed to <Code>scripts/rollback-v2.sh</Code>,
          and <Code>ROLLBACK_TIMEOUT</Code> renamed to <Code>ROLLBACK_TIMEOUT_SECS</Code>. It runs through the same path as the relay, with no Bitbucket
          needed.
        </Text>
        <ButtonGroup>
          <LoadingButton isLoading={busy === 'replay'} onClick={replay}>
            Replay seeded change
          </LoadingButton>
        </ButtonGroup>
      </Section>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
