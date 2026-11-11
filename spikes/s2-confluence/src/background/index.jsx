// Background script for spike S2. Invisible. Two jobs:
// 1. Live refresh: on 'dds-byline-refresh', call updateBylineProperties (only works outside the byline module).
// 2. Spike-only beacon: read the byline property as the viewing user and log it via a resolver,
//    so `forge logs` shows which test pages were viewed and what the user could read.
import React, { useEffect } from 'react';
import ForgeReconciler, { Text, useProductContext } from '@forge/react';
import { events, invoke, requestConfluence } from '@forge/bridge';
import { updateBylineProperties } from '@forge/confluence-bridge';

const BYLINE_KEY = 'dds-byline-7f3c2a';

const App = () => {
  const context = useProductContext();
  const pageId = context?.extension?.content?.id;

  useEffect(() => {
    const sub = events.on('dds-byline-refresh', async (valueUpdate) => {
      try {
        await updateBylineProperties({ propertyKey: BYLINE_KEY, valueUpdate });
        await invoke('seen', { refresh: 'ok', valueUpdate });
      } catch (e) {
        await invoke('seen', { refresh: 'error', message: String(e?.message || e) });
      }
    });
    return () => {
      sub.then((s) => s.unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!pageId) return;
    (async () => {
      const res = await requestConfluence(`/wiki/api/v2/pages/${pageId}/properties?limit=50`, {
        headers: { Accept: 'application/json' },
      });
      const body = res.ok ? await res.json() : await res.text();
      const keys = res.ok ? body.results.map((p) => p.key) : null;
      const byline = res.ok ? body.results.find((p) => p.key === BYLINE_KEY)?.value : null;
      await invoke('seen', { status: res.status, keys, byline });
    })();
  }, [pageId]);

  return <Text> </Text>;
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
