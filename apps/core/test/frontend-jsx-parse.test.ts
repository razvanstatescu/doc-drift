// Every UI Kit entry point and component file parses as JSX (typecheck skips .jsx: checkJs is off),
// and every named import from '@forge/react' exists in the installed version (12.5.0 has no Grid).
// The names come from the package's typings, since importing @forge/react needs the UI Kit bridge.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const ROOT = join(__dirname, '..', 'src', 'frontend');
const OUT = join(__dirname, '..', 'node_modules', '@forge', 'react');
const typings = ['out/index.d.ts', 'out/components/index.d.ts', 'out/components/ui-kit-components.d.ts']
  .map((f) => readFileSync(join(OUT, f), 'utf8'))
  .join('\n');
const EXPORTED = new Set([...typings.matchAll(/export declare const (\w+)/g)].map((m) => m[1]!).concat([...typings.matchAll(/export \{ (\w+)/g)].map((m) => m[1]!)));
const ForgeReact = Object.fromEntries([...EXPORTED].map((n) => [n, true]));

function jsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return jsxFiles(full);
    return name.endsWith('.jsx') ? [full] : [];
  });
}

describe('frontend JSX', () => {
  for (const file of jsxFiles(ROOT)) {
    const rel = file.slice(ROOT.length + 1);
    it(`${rel} parses`, () => {
      const code = readFileSync(file, 'utf8');
      const out = ts.transpileModule(code, { fileName: file, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.React, allowJs: true } });
      expect((out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '))).toEqual([]);
    });
    it(`${rel} imports only components @forge/react exports`, () => {
      const code = readFileSync(file, 'utf8');
      const m = code.match(/import\s+(?:ForgeReconciler\s*,\s*)?\{([^}]*)\}\s+from\s+'@forge\/react'/);
      if (!m) return;
      const names = m[1]!.split(',').map((s) => s.trim()).filter(Boolean);
      const missing = names.filter((n) => !(n in ForgeReact));
      expect(missing).toEqual([]);
    });
  }
});
