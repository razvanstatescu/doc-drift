import type { RequestListener } from 'node:http';
import { log } from './logger.js';
import type { Router } from './router.js';

// HTTP request handling, moved out of src/server.ts.
export function createApp(router: Router): RequestListener {
  return async (req, res) => {
    const started = Date.now();
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const url = new URL(req.url ?? '/', 'http://localhost');
    const found = router.match(req.method ?? 'GET', url.pathname);
    if (!found) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = rawBody ? JSON.parse(rawBody) : undefined;
      const out = await found.handler({
        method: req.method ?? 'GET',
        path: url.pathname,
        params: found.params,
        headers: req.headers,
        body,
        rawBody,
      });
      res.writeHead(out.status, { 'content-type': 'application/json', ...out.headers });
      res.end(out.body === undefined ? undefined : typeof out.body === 'string' ? out.body : JSON.stringify(out.body));
      log.debug('request', { method: req.method, path: url.pathname, status: out.status, ms: Date.now() - started });
    } catch (err) {
      log.error('unhandled error', { method: req.method, path: url.pathname, err });
      res.writeHead(500, { 'content-type': 'application/json' }).end('{"error":"internal_error"}');
    }
  };
}
