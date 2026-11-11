import type { IncomingHttpHeaders } from 'node:http';

export interface Request {
  method: string;
  path: string;
  params: Record<string, string>;
  headers: IncomingHttpHeaders;
  body: unknown;
  rawBody: string;
}

export interface Response {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type Handler = (req: Request) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

// Minimal path router: exact segments and :params only.
export class Router {
  private readonly routes: Route[] = [];

  get(path: string, handler: Handler): void {
    this.add('GET', path, handler);
  }

  post(path: string, handler: Handler): void {
    this.add('POST', path, handler);
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | undefined {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.pattern.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: route.handler, params };
    }
    return undefined;
  }

  private add(method: string, path: string, handler: Handler): void {
    const keys: string[] = [];
    const source = path.replace(/:(\w+)/g, (_, k: string) => {
      keys.push(k);
      return '([^/]+)';
    });
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
  }
}
