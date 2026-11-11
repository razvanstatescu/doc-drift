// Byline modal for spike S2. Lets a human drive the live-refresh, permission and prefixed-key tests.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Box, Button, ButtonGroup, Code, Heading, Stack, Text } from '@forge/react';
import { events, invoke } from '@forge/bridge';

const STATES = [
  ['verified', 'Verified'],
  ['possibly_stale', 'Possibly stale'],
  ['stale', 'Stale'],
  ['unanchored', 'Unanchored'],
];

const App = () => {
  const [ctx, setCtx] = useState(null);
  const [last, setLast] = useState(null);

  useEffect(() => {
    invoke('context').then(setCtx);
  }, []);

  const setState = async (state) => {
    const res = await invoke('setState', { state, iconMode: 'resource' });
    setLast(res);
    // The byline cannot refresh itself; the backgroundScript listens and calls updateBylineProperties.
    if (res.ok) await events.emit('dds-byline-refresh', res.value);
  };

  return (
    <Stack space="space.200">
      <Heading size="small">Doc Drift spike S2</Heading>
      <Text>Page {ctx?.pageId ?? '...'}, byline localId:</Text>
      <Code>{ctx?.localId ?? '...'}</Code>
      <Text>Set state (writes the content property asApp, then asks the background script to refresh):</Text>
      <ButtonGroup>
        {STATES.map(([k, label]) => (
          <Button key={k} onClick={() => setState(k)}>
            {label}
          </Button>
        ))}
      </ButtonGroup>
      <ButtonGroup>
        <Button onClick={async () => setLast(await invoke('myOperations'))}>Check my permissions</Button>
        <Button onClick={async () => setLast(await invoke('writePrefixed'))}>Write prefixed key</Button>
      </ButtonGroup>
      <Box>
        <Text>Result:</Text>
        <Code>{last ? JSON.stringify(last).slice(0, 1500) : 'none yet'}</Code>
      </Box>
      <Box>
        <Text>Properties on this page (asApp):</Text>
        <Code>{ctx ? JSON.stringify(ctx.props).slice(0, 1500) : '...'}</Code>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
