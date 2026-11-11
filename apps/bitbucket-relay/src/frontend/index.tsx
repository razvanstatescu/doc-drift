// Workspace settings page (UI Kit). Admins paste the core ingest URL and shared secret from
// Doc Drift Sentinel settings in Confluence, then send a signed test ping.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  ErrorMessage,
  Form,
  FormFooter,
  FormSection,
  Heading,
  HelperMessage,
  Label,
  LoadingButton,
  SectionMessage,
  Spinner,
  Stack,
  Text,
  Textfield,
  ValidMessage,
} from '@forge/react';
import { invoke } from '@forge/bridge';

interface DeliveryStatus {
  at: string;
  prId: number;
  repo: string;
  result: 'sent' | 'ignored' | 'failed';
  files?: number;
  detail?: string;
}

interface SettingsView {
  ingestUrl: string;
  hasSecret: boolean;
  secretSavedAt?: string;
  updatedAt?: string;
  lastDelivery?: DeliveryStatus;
}

type LoadResult = { ok: true; settings: SettingsView } | { ok: false; error: string };
type SaveResult =
  | { ok: true; settings: SettingsView }
  | { ok: false; error?: string; fieldErrors?: { ingestUrl?: string; secret?: string } };
type PingResult =
  | { ok: true; status: number; elapsedMs: number; host: string }
  | { ok: false; status?: number; error: string };

/** invoke() is typed as T or T-with-metadata; our resolvers always return the plain object. */
async function call<T>(key: string, payload?: Record<string, unknown>): Promise<T> {
  return (await invoke(key, payload)) as unknown as T;
}

function ago(iso: string | undefined): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function LastDelivery({ status }: { status?: DeliveryStatus }) {
  if (!status) return <Text>No merged pull requests seen yet.</Text>;
  const what = `PR #${status.prId} in ${status.repo}`;
  const when = ago(status.at);
  if (status.result === 'sent') {
    return (
      <Text>
        {what} sent {when}
        {status.files !== undefined ? `, ${plural(status.files, 'changed file')}` : ''}. {status.detail ?? ''}
      </Text>
    );
  }
  if (status.result === 'ignored') return <Text>{what} ignored {when}. {status.detail ?? ''}</Text>;
  return <Text>{what} not sent {when}. {status.detail ?? ''}</Text>;
}

const App = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [ingestUrl, setIngestUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ ingestUrl?: string; secret?: string }>({});
  const [saved, setSaved] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [ping, setPing] = useState<PingResult | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await call<LoadResult>('getSettings');
      if (res.ok) {
        setSettings(res.settings);
        setIngestUrl(res.settings.ingestUrl);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    } catch {
      setLoadError('Could not load the settings. Reload the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    setFieldErrors({});
    setPing(null);
    try {
      const res = await call<SaveResult>('saveSettings', { ingestUrl, secret });
      if (res.ok) {
        setSettings(res.settings);
        setIngestUrl(res.settings.ingestUrl);
        setSecret('');
        setSaved(true);
      } else {
        setFieldErrors(res.fieldErrors ?? {});
        if (res.error) setSaveError(res.error);
      }
    } catch {
      setSaveError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendPing = async () => {
    setPinging(true);
    setPing(null);
    try {
      setPing(await call<PingResult>('sendPing'));
    } catch {
      setPing({ ok: false, error: 'The test ping did not complete. Try again.' });
    } finally {
      setPinging(false);
    }
  };

  if (loading && !settings) return <Spinner label="Loading settings" />;
  if (loadError) {
    return (
      <SectionMessage appearance="warning" title="Settings unavailable">
        <Text>{loadError}</Text>
      </SectionMessage>
    );
  }

  const configured = Boolean(settings?.ingestUrl && settings?.hasSecret);

  return (
    <Stack space="space.300">
      <Stack space="space.100">
        <Heading size="medium">Doc Drift Sentinel Relay</Heading>
        <Text>
          When a pull request merges into a repository's main branch, this app sends its changed files to Doc Drift
          Sentinel in Confluence. Doc Drift Sentinel then flags the pages anchored to those files. Merges into other
          branches are ignored.
        </Text>
      </Stack>

      <Form onSubmit={save}>
        <FormSection>
          <Stack space="space.200">
            <Box>
              <Label labelFor="ingest-url">Core ingest URL</Label>
              <Textfield
                id="ingest-url"
                name="ingestUrl"
                value={ingestUrl}
                onChange={(e) => setIngestUrl(e.target.value)}
                placeholder="https://….webtrigger.atlassian.app/public/…"
                isInvalid={Boolean(fieldErrors.ingestUrl)}
                isMonospaced
              />
              {fieldErrors.ingestUrl ? (
                <ErrorMessage>{fieldErrors.ingestUrl}</ErrorMessage>
              ) : (
                <HelperMessage>Copy it from Doc Drift Sentinel settings in Confluence.</HelperMessage>
              )}
            </Box>
            <Box>
              <Label labelFor="shared-secret">Shared secret</Label>
              <Textfield
                id="shared-secret"
                name="secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={settings?.hasSecret ? 'Saved. Leave blank to keep it.' : 'Paste the shared secret'}
                isInvalid={Boolean(fieldErrors.secret)}
                isMonospaced
              />
              {fieldErrors.secret ? (
                <ErrorMessage>{fieldErrors.secret}</ErrorMessage>
              ) : settings?.hasSecret ? (
                <ValidMessage>Secret saved {ago(settings.secretSavedAt)}. It is stored encrypted and never shown again.</ValidMessage>
              ) : (
                <HelperMessage>Copy it from the same settings page. It is stored encrypted and never shown again.</HelperMessage>
              )}
            </Box>
          </Stack>
        </FormSection>
        <FormFooter align="start">
          <LoadingButton type="submit" appearance="primary" isLoading={saving}>
            Save
          </LoadingButton>
        </FormFooter>
      </Form>

      {saveError ? (
        <SectionMessage appearance="error" title="Not saved">
          <Text>{saveError}</Text>
        </SectionMessage>
      ) : null}
      {saved ? (
        <SectionMessage appearance="success" title="Saved">
          <Text>Send a test ping to check the connection.</Text>
        </SectionMessage>
      ) : null}

      <Stack space="space.100">
        <Heading size="small">Connection</Heading>
        <Text>Sends a signed test record to Doc Drift Sentinel. Nothing is stored and no page changes.</Text>
        <Box>
          <LoadingButton onClick={sendPing} isLoading={pinging} isDisabled={!configured}>
            Send test ping
          </LoadingButton>
        </Box>
        {!configured ? <Text>Save the URL and secret first.</Text> : null}
        {ping?.ok ? (
          <SectionMessage appearance="success" title="Connected">
            <Text>
              {ping.host} accepted a signed test record (HTTP {ping.status}) in {(ping.elapsedMs / 1000).toFixed(1)} s.
            </Text>
          </SectionMessage>
        ) : null}
        {ping && !ping.ok ? (
          <SectionMessage appearance="error" title="Not connected">
            <Text>{ping.error}</Text>
          </SectionMessage>
        ) : null}
      </Stack>

      <Stack space="space.100">
        <Heading size="small">Last merged pull request</Heading>
        <LastDelivery {...(settings?.lastDelivery ? { status: settings.lastDelivery } : {})} />
        <Box>
          <Button appearance="subtle" onClick={() => void load()}>
            Refresh
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
