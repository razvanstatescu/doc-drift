// Spike page: (1) S11 rovo.isEnabled(), (2) asUser() probe that creates the
// user's Connected-apps consent entry (needed before the external MCP test).
import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Button, Code, Heading, Stack, Text } from '@forge/react';
import { invoke, rovo } from '@forge/bridge';

const App = () => {
  const [rovoEnabled, setRovoEnabled] = useState('checking');
  const [probe, setProbe] = useState(null);

  useEffect(() => {
    rovo
      .isEnabled()
      .then((v) => {
        setRovoEnabled(String(v));
        invoke('logRovo', { enabled: v });
      })
      .catch((e) => setRovoEnabled(`error: ${e?.message ?? e}`));
  }, []);

  const runProbe = async () => {
    setProbe('running');
    try {
      setProbe(JSON.stringify(await invoke('asUserProbe')));
    } catch (e) {
      setProbe(`error: ${e?.message ?? e}`);
    }
  };

  const openAgent = () =>
    rovo.open({
      type: 'forge',
      agentName: 'Drift Reviewer (spike)',
      agentKey: 'drift-reviewer-spike',
      prompt: 'Is this page still current? Use check-page-freshness with pageId 0.',
    });

  return (
    <Stack space="space.200">
      <Heading size="medium">Doc Drift spike S3/S4/S11</Heading>
      <Text>Rovo enabled on this site: {rovoEnabled}</Text>
      <Button onClick={runProbe}>Run asUser probe</Button>
      {probe && <Code>{probe}</Code>}
      <Button onClick={openAgent}>Open Drift Reviewer (spike)</Button>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
