// Global settings (useAsConfig): the relay connection (ingest URL and secret), sensitivity,
// ignore globs, and demo mode. UI Kit components only.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  ButtonGroup,
  Code,
  Heading,
  Label,
  LoadingButton,
  RadioGroup,
  SectionMessage,
  Spinner,
  Stack,
  Strong,
  Text,
  TextArea,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const SENSITIVITY = [
  { name: 'sensitivity', value: 'strict', label: 'Strict: flag at a score of 0.4' },
  { name: 'sensitivity', value: 'balanced', label: 'Balanced: flag at 0.5 (default)' },
  { name: 'sensitivity', value: 'quiet', label: 'Quiet: flag at 0.65' },
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

const App = () => {
  const [data, setData] = useState(null);
  const [sensitivity, setSensitivity] = useState('balanced');
  const [globs, setGlobs] = useState('');
  const [newSecret, setNewSecret] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    invoke('load')
      .then((res) => {
        setData(res);
        if (res.ok) {
          setSensitivity(res.settings.sensitivity);
          setGlobs(res.settings.ignoreGlobs.join('\n'));
        }
      })
      .catch((e) => setData({ ok: false, message: String(e?.message || e) }));
  }, []);

  if (!data) return <Spinner size="medium" label="Loading settings" />;
  if (!data.ok) {
    return (
      <SectionMessage appearance="warning" title="Settings unavailable">
        <Text>{data.message}</Text>
      </SectionMessage>
    );
  }

  const run = async (name, fn) => {
    setBusy(name);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setNotice({ appearance: 'error', title: 'Something went wrong', body: String(e?.message || e) });
    } finally {
      setBusy('');
    }
  };

  const rotate = () =>
    run('secret', async () => {
      const res = await invoke('rotateSecret');
      if (!res.ok) return setNotice({ appearance: 'error', title: res.message, body: '' });
      setNewSecret(res.secret);
      setData((d) => ({ ...d, secret: res.meta }));
    });

  const save = () =>
    run('save', async () => {
      const res = await invoke('saveSettings', { sensitivity, ignoreGlobs: globs });
      if (!res.ok) return setNotice({ appearance: 'error', title: res.message, body: '' });
      setGlobs(res.settings.ignoreGlobs.join('\n'));
      setNotice({ appearance: 'success', title: 'Settings saved.', body: 'They apply to the next change Doc Drift Sentinel receives.' });
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

  return (
    <Stack space="space.300">
      <Text>Doc Drift Sentinel anchors Confluence pages to code and Jira work, flags them when those change, and tells agents which pages to trust.</Text>

      {notice ? (
        <SectionMessage appearance={notice.appearance} title={notice.title}>
          {notice.body ? <Text>{notice.body}</Text> : null}
        </SectionMessage>
      ) : null}

      <Section title="Bitbucket relay">
        <Text>Install the Doc Drift Sentinel Bitbucket relay in your workspace, then paste this URL and the secret into its settings.</Text>
        {data.ping ? (
          <Text>
            Connected: workspace <Code>{data.ping.workspaceUuid}</Code>, last ping {new Date(data.ping.receivedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : (
          <Text>Not connected yet. Use Send test ping in the relay settings to check the connection.</Text>
        )}
        <Text><Strong>Ingest URL</Strong></Text>
        <Code>{data.ingestUrl}</Code>
        <Text><Strong>Relay secret</Strong></Text>
        {data.secret ? (
          <Text>
            Secret set on {new Date(data.secret.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}. Fingerprint <Code>{data.secret.fingerprint}</Code>
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
        {data.secret ? <Text>Rotating stops the old secret at once. Update the relay right after.</Text> : null}
      </Section>

      <Section title="Sensitivity">
        <RadioGroup name="sensitivity" options={SENSITIVITY} value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} />
        <Label labelFor="ignore-globs">Ignore globs (one per line)</Label>
        <TextArea id="ignore-globs" value={globs} onChange={(e) => setGlobs(e.target.value)} resize="vertical" />
        <Text>Changes to files matching these never flag a page. Patterns without a slash match a file name at any depth.</Text>
        <ButtonGroup>
          <LoadingButton appearance="primary" isLoading={busy === 'save'} onClick={save}>
            Save settings
          </LoadingButton>
        </ButtonGroup>
      </Section>

      <Section title="Demo mode">
        <Text>
          Replays seeded PR #{data.demoPrId} from <Code>payments-api</Code>: <Code>scripts/rollback.sh</Code> renamed to <Code>scripts/rollback-v2.sh</Code>, and <Code>ROLLBACK_TIMEOUT</Code> renamed to <Code>ROLLBACK_TIMEOUT_SECS</Code>. It runs through the same ingest path as the relay, with no Bitbucket needed.
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
