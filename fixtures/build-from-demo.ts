/**
 * Builds the M2 evaluation fixtures from the real demo content (D26).
 *
 *   node fixtures/build-from-demo.ts            (Node 24: runs the TypeScript directly)
 *
 * What it does:
 * 1. Rebuilds the payments-api history in a throwaway git repo: base/ (+ BASE-ADDITIONS.md when
 *    base/ lacks them), then scenarios 01 to 10 in order, each committed on top of the previous one,
 *    exactly as `bb_seed.py scenario` does. Every change record comes from `git diff -M` between two
 *    commits: the diffstat (`--numstat`, `--name-status`) and the unified diff, as the relay sends them.
 * 2. Takes the 24 PLAT pages (storage XHTML) and the anchors in confluence/index.json as bindings.
 * 3. Writes one fixture per scenario with the expected outcome from scenario.json and index.json,
 *    one per Jira beat in jira/issues.json, and synthetic edge cases built on the same repo and pages.
 *
 * Output goes to fixtures/scenarios/demo-*.json, jira-*.json and edge-*.json. The script never
 * edits demo/. Re-run it whenever demo/seed changes; fixtures are deterministic (fixed dates).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SEED = join(ROOT, 'demo/seed');
const REPO_SRC = join(SEED, 'payments-api');
const OUT = join(ROOT, 'fixtures/scenarios');
const SITE = 'one-atlas-jzzf.atlassian.net';
const WORKSPACE = 'nano-soft-dev';
const REPO_SLUG = 'payments-api';
const REPO_UUID = '{6f1d1c3e-0b8a-4e57-9f0a-2d5b1c7e4820}';
/** Scenario 01 is the hero PR, #482 in demo mode; the rest follow in merge order. */
const FIRST_PR = 482;
const GENERATED_BY = 'fixtures/build-from-demo.ts';

// ---------------------------------------------------------------------------------------------
// Types (a subset of the fixture format in packages/matcher/test/fixtures.ts)

type Severity = 'high' | 'medium';
interface ChangedFile { status: 'added' | 'modified' | 'removed' | 'renamed'; path: string; oldPath?: string; linesAdded: number; linesRemoved: number }
interface Binding { id: string; pageId: string; anchorType: string; repo?: string; pattern?: string; jiraKey?: string; weight: 'normal' | 'critical' }
interface Page { pageId: string; title: string; storage: string }
interface ExpectedFlag { pageId: string; severity?: Severity; minScore?: number; maxScore?: number; knownMiss?: string }
interface Expect {
  outcome: 'scored' | 'revert' | 'skipped';
  flagged: ExpectedFlag[];
  skipReason?: string;
  revertedTitle?: string;
  renameProposals?: { bindingId: string; from: string; to: string }[];
}
interface Step { change: Record<string, unknown>; expect: Expect }
interface Fixture {
  id: string;
  label: 'drift' | 'no_drift';
  title: string;
  notes: string;
  source: 'demo' | 'jira-beat' | 'edge';
  generatedBy: string;
  pages: Page[];
  bindings: Binding[];
  steps: Step[];
}

// ---------------------------------------------------------------------------------------------
// Demo content: issues, pages, bindings

interface Issue { ref: string; exampleKey?: string; key?: string; summary: string; status: string; fixVersions?: string[] }
const issues = JSON.parse(readFileSync(join(SEED, 'jira/issues.json'), 'utf8')) as {
  issues: Issue[];
  demo: Record<string, { ref?: string; exampleKey?: string; key?: string; from?: string; to?: string; flips: string[]; expectedSeverity: string }>;
};
/**
 * ref -> Jira key. Uses demo/seed/jira/keymap.json (git-ignored, written by `seed_jira.py seed`) when it
 * exists, so fixtures carry the keys of the live site; otherwise the illustrative `exampleKey`.
 */
const KEYMAP = join(SEED, 'jira/keymap.json');
const keymap = existsSync(KEYMAP) ? (JSON.parse(readFileSync(KEYMAP, 'utf8')) as { keys: Record<string, string> }).keys : undefined;
const keyByRef = new Map(issues.issues.map((i) => [i.ref, keymap?.[i.ref] ?? i.exampleKey ?? i.key ?? i.ref]));

/** Resolves seed templates: `{{PAY:ref}}` to the example key (D25) and `{{ATLASSIAN_SITE}}`. */
function resolveTemplates(text: string): string {
  return text
    .replace(/\{\{PAY:([a-z0-9-]+)\}\}/g, (whole, ref: string) => keyByRef.get(ref) ?? whole)
    .replaceAll('{{ATLASSIAN_SITE}}', SITE);
}

interface IndexAnchor { type: string; repo?: string; pattern?: string; key?: string; weight: 'normal' | 'critical' }
interface IndexPage { title: string; file: string; anchored: boolean; anchors: IndexAnchor[]; flaggedBy: { trigger: string; severity: string }[] }
const index = JSON.parse(readFileSync(join(SEED, 'confluence/index.json'), 'utf8')) as { pages: IndexPage[] };

const pageIdOf = (p: IndexPage) => p.file.split('/').at(-1)!.replace(/\.xhtml$/, '');
const pageIdByTitle = new Map(index.pages.map((p) => [p.title, pageIdOf(p)]));

function pageId(title: string): string {
  const id = pageIdByTitle.get(title);
  if (!id) throw new Error(`no page titled "${title}" in index.json`);
  return id;
}

const PAGES: Page[] = index.pages.map((p) => ({
  pageId: pageIdOf(p),
  title: p.title,
  storage: resolveTemplates(readFileSync(join(SEED, 'confluence', p.file), 'utf8')),
}));

const BINDINGS: Binding[] = index.pages.flatMap((p) =>
  p.anchors.map((a, i): Binding => {
    const base = { id: `b-${pageIdOf(p)}-${i + 1}`, pageId: pageIdOf(p), anchorType: a.type, weight: a.weight };
    if (a.type === 'jira') return { ...base, jiraKey: resolveTemplates(a.key ?? '') };
    return { ...base, repo: a.repo ?? REPO_SLUG, ...(a.pattern !== undefined && { pattern: a.pattern }) };
  }),
);

const bindingFor = (title: string, pattern: string) => {
  const b = BINDINGS.find((x) => x.pageId === pageId(title) && x.pattern === pattern);
  if (!b) throw new Error(`no binding ${pattern} on "${title}"`);
  return b;
};

// ---------------------------------------------------------------------------------------------
// A throwaway git repo that replays the seed

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Sam Rivera',
  GIT_AUTHOR_EMAIL: 'sam@acme.dev',
  GIT_COMMITTER_NAME: 'Sam Rivera',
  GIT_COMMITTER_EMAIL: 'sam@acme.dev',
  GIT_AUTHOR_DATE: '2026-11-11T12:00:00Z',
  GIT_COMMITTER_DATE: '2026-11-11T12:00:00Z',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
};
const GIT_OPTS = ['-c', 'core.autocrlf=false', '-c', 'core.fileMode=false', '-c', 'core.quotepath=false', '-c', 'color.ui=false', '-c', 'commit.gpgsign=false', '-c', 'diff.renames=true'];

class Repo {
  readonly dir: string;
  readonly workspace: string;
  readonly slug: string;
  readonly uuid: string;
  constructor(workspace: string, slug: string, uuid: string) {
    this.workspace = workspace;
    this.slug = slug;
    this.uuid = uuid;
    this.dir = mkdtempSync(join(tmpdir(), `dds-${slug}-`));
    this.git('init', '-q', '-b', 'main');
  }
  git(...args: string[]): string {
    return execFileSync('git', [...GIT_OPTS, ...args], { cwd: this.dir, env: GIT_ENV, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  }
  write(path: string, content: string): void {
    const full = join(this.dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  read(path: string): string {
    return readFileSync(join(this.dir, path), 'utf8');
  }
  edit(path: string, from: string | RegExp, to: string): void {
    const before = this.read(path);
    const after = before.replace(from, to);
    if (after === before) throw new Error(`edit of ${path} changed nothing (${String(from)})`);
    this.write(path, after);
  }
  remove(path: string): void {
    rmSync(join(this.dir, path), { force: true });
  }
  commit(message: string): string {
    this.git('add', '-A');
    this.git('commit', '-q', '--allow-empty', '-m', message);
    return this.head();
  }
  head(): string {
    return this.git('rev-parse', 'HEAD').trim();
  }
  checkout(rev: string): void {
    this.git('checkout', '-q', '-f', '-B', 'main', rev);
    this.git('clean', '-q', '-fdx');
  }
  /** The diffstat and unified diff between two commits, as the relay builds them. */
  diff(from: string, to: string): { files: ChangedFile[]; hunks: string } {
    const status = this.git('diff', '-M', '--name-status', '-z', from, to).split('\0').filter((s) => s !== '');
    const numstat = this.git('diff', '-M', '--numstat', '-z', from, to).split('\0');
    const counts = new Map<string, [number, number]>();
    for (let i = 0; i < numstat.length; i++) {
      const entry = numstat[i];
      if (!entry) continue;
      const [a, r, path] = entry.split('\t');
      const lines: [number, number] = [a === '-' ? 0 : Number(a), r === '-' ? 0 : Number(r)];
      if (path === '') {
        // Rename: "added\tremoved\t\0old\0new\0"
        const newPath = numstat[i + 2]!;
        counts.set(newPath, lines);
        i += 2;
      } else counts.set(path!, lines);
    }
    const files: ChangedFile[] = [];
    for (let i = 0; i < status.length; i++) {
      const code = status[i]!;
      if (code.startsWith('R')) {
        const oldPath = status[++i]!;
        const path = status[++i]!;
        const [linesAdded, linesRemoved] = counts.get(path) ?? [0, 0];
        files.push({ status: 'renamed', path, oldPath, linesAdded, linesRemoved });
        continue;
      }
      if (code.startsWith('C')) i++;
      const path = status[++i]!;
      const [linesAdded, linesRemoved] = counts.get(path) ?? [0, 0];
      const kind = code[0] === 'A' || code[0] === 'C' ? 'added' : code[0] === 'D' ? 'removed' : 'modified';
      files.push({ status: kind, path, linesAdded, linesRemoved });
    }
    return { files, hunks: this.git('diff', '-M', '--no-ext-diff', from, to) };
  }
  changeRecord(from: string, to: string, meta: { prId: number; title: string; sourceBranch: string; destinationBranch?: string; author?: string; withHunks?: boolean }): Record<string, unknown> {
    const { files, hunks } = this.diff(from, to);
    return {
      source: 'bitbucket',
      workspace: this.workspace,
      repoSlug: this.slug,
      repoUuid: this.uuid,
      prId: meta.prId,
      title: meta.title,
      author: meta.author ?? 'Sam Rivera',
      mergeCommit: to.slice(0, 12),
      sourceBranch: meta.sourceBranch,
      destinationBranch: meta.destinationBranch ?? 'main',
      defaultBranch: 'main',
      files,
      ...(meta.withHunks !== false && { hunks }),
    };
  }
  dispose(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(dir, join(d.parentPath, d.name)));
}

/** Files from BASE-ADDITIONS.md: `### Add|Replace: \`path\`` followed by a 4-backtick fence. */
function baseAdditions(): Map<string, string> {
  const md = readFileSync(join(REPO_SRC, 'BASE-ADDITIONS.md'), 'utf8');
  const out = new Map<string, string>();
  for (const m of md.matchAll(/^### (?:Add|Replace): `([^`]+)`\n\n````[^\n]*\n([\s\S]*?)\n````$/gm)) out.set(m[1]!, `${m[2]}\n`);
  return out;
}

/** Copies a seed folder into the repo with `{{PAY:ref}}` tokens resolved, as bb_seed.py does. */
function copyResolved(from: string, repo: Repo, skip: (path: string) => boolean = () => false): void {
  for (const f of listFiles(from)) if (!skip(f)) repo.write(f, resolveTemplates(readFileSync(join(from, f), 'utf8')));
}

function seedBase(repo: Repo): string {
  copyResolved(join(REPO_SRC, 'base'), repo);
  const additions = baseAdditions();
  const missing = [...additions.keys()].filter((p) => !existsSync(join(REPO_SRC, 'base', p)));
  const differs = [...additions].filter(([p, c]) => existsSync(join(REPO_SRC, 'base', p)) && readFileSync(join(REPO_SRC, 'base', p), 'utf8') !== c);
  if (missing.length > 0) {
    console.log(`base/ lacks ${missing.length} BASE-ADDITIONS files: applying all ${additions.size}`);
    for (const [p, c] of additions) repo.write(p, resolveTemplates(c));
  } else if (differs.length > 0) {
    console.warn(`warning: base/ differs from BASE-ADDITIONS.md in ${differs.map(([p]) => p).join(', ')}; using base/`);
  }
  return repo.commit('Import payments-api');
}

// ---------------------------------------------------------------------------------------------
// Demo scenarios 01 to 10

interface ScenarioJson {
  id: string;
  branch: string;
  title: string;
  description: string;
  kind?: 'drift' | 'non-drift';
  delete?: string[];
  revertOf?: string;
  expected: string | { alert: boolean; summary: string; pages: { title: string; severity: string }[]; mustNotFlag?: string[] };
}

function flagsFromIndex(scenarioId: string): ExpectedFlag[] {
  return index.pages.flatMap((p) =>
    p.flaggedBy
      .filter((f) => f.trigger === `bitbucket:${scenarioId}`)
      .map((f) => ({ pageId: pageIdOf(p), severity: f.severity.toLowerCase() as Severity })),
  );
}

function demoFixtures(repo: Repo, base: string): { fixtures: Fixture[]; titles: Map<string, string>; prIds: Map<string, number> } {
  const dirs = readdirSync(join(REPO_SRC, 'scenarios')).filter((d) => statSync(join(REPO_SRC, 'scenarios', d)).isDirectory()).sort();
  const fixtures: Fixture[] = [];
  const titles = new Map<string, string>();
  const prIds = new Map<string, number>();
  let prev = base;
  dirs.forEach((dir, n) => {
    const folder = join(REPO_SRC, 'scenarios', dir);
    const sc = JSON.parse(resolveTemplates(readFileSync(join(folder, 'scenario.json'), 'utf8'))) as ScenarioJson;
    copyResolved(folder, repo, (f) => f === 'scenario.json');
    for (const f of sc.delete ?? []) repo.remove(f);
    const head = repo.commit(sc.title);
    const prId = FIRST_PR + n;
    titles.set(sc.id, sc.title);
    prIds.set(sc.id, prId);
    const change = repo.changeRecord(prev, head, { prId, title: sc.title, sourceBranch: sc.branch });
    prev = head;

    // Expected outcome: index.json flaggedBy is the per-page source of truth; scenario.json must agree.
    const flagged = flagsFromIndex(sc.id);
    if (typeof sc.expected === 'object') {
      const fromScenario = sc.expected.pages.map((p) => `${pageId(p.title)}:${p.severity.toLowerCase()}`).sort().join(',');
      const fromIndex = flagged.map((f) => `${f.pageId}:${f.severity}`).sort().join(',');
      if (fromScenario !== fromIndex) console.warn(`warning: ${sc.id}: scenario.json expects [${fromScenario}], index.json [${fromIndex}]`);
      for (const t of sc.expected.mustNotFlag ?? []) pageId(t); // titles must resolve
    }
    const files = change.files as ChangedFile[];
    const relevant = files.filter((f) => !/(^|\/)__tests__\/|\.test\.|(^|\/)package-lock\.json$/.test(f.path));
    let expect: Expect;
    if (sc.revertOf) {
      expect = { outcome: 'revert', revertedTitle: titles.get(sc.revertOf)!, flagged: [] };
    } else if (relevant.length === 0) {
      expect = { outcome: 'skipped', skipReason: 'no_relevant_files', flagged: [] };
    } else {
      expect = { outcome: 'scored', flagged };
      const renames = files
        .filter((f) => f.status === 'renamed')
        .flatMap((f) => BINDINGS.filter((b) => b.anchorType === 'path' && b.pattern === f.oldPath).map((b) => ({ bindingId: b.id, from: f.oldPath!, to: f.path })));
      expect.renameProposals = renames;
    }
    const summary = typeof sc.expected === 'string' ? sc.expected : sc.expected.summary;
    const kind = sc.kind ?? (flagged.length > 0 ? 'drift' : 'non-drift');
    fixtures.push({
      id: `demo-${sc.id}`,
      label: kind === 'drift' ? 'drift' : 'no_drift',
      title: sc.title,
      notes: `Demo scenario ${sc.id} replayed on the real seed (24 PLAT pages, index.json anchors). ${summary}`,
      source: 'demo',
      generatedBy: GENERATED_BY,
      pages: PAGES,
      bindings: BINDINGS,
      steps: [{ change, expect }],
    });
  });
  return { fixtures, titles, prIds };
}

// ---------------------------------------------------------------------------------------------
// Jira beats (jira/issues.json `demo`)

function jiraFixtures(): Fixture[] {
  const flagsFor = (titles: string[], severity: string): ExpectedFlag[] =>
    titles.map((t) => ({ pageId: pageId(t), severity: severity.toLowerCase() as Severity }));
  const wont = issues.demo['wontDo']!;
  const fix = issues.demo['fixVersionChange']!;
  const keyOf = (b: { ref?: string; exampleKey?: string; key?: string }) => (b.ref && keyByRef.get(b.ref)) || b.key || b.exampleKey!;
  const wontKey = keyOf(wont);
  const fixKey = keyOf(fix);
  const wontIssue = issues.issues.find((i) => i.ref === wont.ref);
  return [
    {
      id: 'jira-01-epic-done-wont-do-beat',
      label: 'drift',
      title: `${wontKey} moved to Done (the won't-do beat)`,
      notes: `Jira beat wontDo (seed_jira.py wontdo). The PAY workflow has no Won't Do status, so the epic behind ADR-015 moves to plain Done (status category done, same 0.7 rule). Expected: ${wont.flips.join(', ')} flags ${wont.expectedSeverity}. edge-26 covers Done with resolution Won't Do.`,
      source: 'jira-beat',
      generatedBy: GENERATED_BY,
      pages: PAGES,
      bindings: BINDINGS,
      steps: [
        {
          change: { source: 'jira', issueKey: wontKey, changelogId: '10501', author: 'Priya Natarajan', statusCategory: 'done', changelog: [{ field: 'status', from: wontIssue?.status ?? 'To Do', to: 'Done' }] },
          expect: { outcome: 'scored', flagged: flagsFor(wont.flips, wont.expectedSeverity) },
        },
      ],
    },
    {
      id: 'jira-02-fix-version-slips',
      label: 'drift',
      title: `${fixKey} fix version ${fix.from} to ${fix.to}`,
      notes: `Jira beat fixVersionChange (seed_jira.py fixversion). Expected: ${fix.flips.join(', ')} flags ${fix.expectedSeverity}. The Refunds API guide only mentions the issue (no Jira anchor), so it stays quiet.`,
      source: 'jira-beat',
      generatedBy: GENERATED_BY,
      pages: PAGES,
      bindings: BINDINGS,
      steps: [
        {
          change: { source: 'jira', issueKey: fixKey, changelogId: '10502', author: 'Marco Bianchi', statusCategory: 'new', changelog: [{ field: 'Fix Version', from: fix.from, to: fix.to }] },
          expect: { outcome: 'scored', flagged: flagsFor(fix.flips, fix.expectedSeverity) },
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------------------------
// Synthetic edge cases on the same repo and pages (state: main after scenario 10)

interface EdgeCase {
  id: string;
  label: 'drift' | 'no_drift';
  title: string;
  notes: string;
  /** Mutates the working tree. Returns PR metadata overrides. */
  apply: (repo: Repo) => { branch?: string; destinationBranch?: string; withHunks?: boolean } | void;
  expect: (ctx: { files: ChangedFile[] }) => Expect;
}

const p = pageId;

function edgeCases(titles: Map<string, string>): EdgeCase[] {
  const t02 = titles.get('02-raise-db-pool')!;
  return [
    {
      id: 'edge-11-rename-only',
      label: 'drift',
      title: 'Rename drain-queue.sh to drain-settlement-queue.sh',
      notes: 'Pure rename, 100% similarity, no hunks. The drain runbook tells people to run ./scripts/drain-queue.sh, which no longer exists. Critical exact anchor renamed: High, with a rename proposal.',
      apply: (r) => {
        r.write('scripts/drain-settlement-queue.sh', r.read('scripts/drain-queue.sh'));
        r.remove('scripts/drain-queue.sh');
      },
      expect: () => ({
        outcome: 'scored',
        flagged: [{ pageId: p('Drain the settlement queue'), severity: 'high' }],
        renameProposals: [{ bindingId: bindingFor('Drain the settlement queue', 'scripts/drain-queue.sh').id, from: 'scripts/drain-queue.sh', to: 'scripts/drain-settlement-queue.sh' }],
      }),
    },
    {
      id: 'edge-12-delete-anchored-file',
      label: 'drift',
      title: 'Remove replay-webhooks.sh; replay moves to the admin console',
      notes: 'Deletes a critical anchored script. Only the replay runbook references it. High.',
      apply: (r) => r.remove('scripts/replay-webhooks.sh'),
      expect: () => ({ outcome: 'scored', flagged: [{ pageId: p('Replay failed PSP webhooks'), severity: 'high' }], renameProposals: [] }),
    },
    {
      id: 'edge-13-revert-of-revert',
      label: 'drift',
      title: `Revert "Revert "${t02}""`,
      notes: 'Re-applies scenario 02 after scenario 08 reverted it: PAYMENTS_DB_POOL 20 to 40 again. Not a revert: scores like 02 (failover runbook High via the quoted line, Helm page Medium).',
      apply: (r) => r.edit('deploy/helm/values.yaml', 'PAYMENTS_DB_POOL: "20"', 'PAYMENTS_DB_POOL: "40"'),
      expect: () => ({
        outcome: 'scored',
        flagged: [
          { pageId: p('Fail over the payments database'), severity: 'high' },
          { pageId: p('Payments deployment and Helm chart'), severity: 'medium' },
        ],
      }),
    },
    {
      id: 'edge-14-broad-glob-60-new-files',
      label: 'no_drift',
      title: 'Add generated PSP event types (60 files under src/generated/)',
      notes: 'A broad change under the src/** glob of 2 pages: 60 new generated files, nothing existing touched. No page describes them. Glob anchors alone must not alert.',
      apply: (r) => {
        for (let i = 1; i <= 60; i++) {
          const n = String(i).padStart(2, '0');
          r.write(
            `src/generated/psp/event-${n}.ts`,
            `// Generated from the PSP OpenAPI spec. Do not edit.\nexport interface PspEvent${n} {\n  id: string;\n  type: 'event.${n}';\n  created: number;\n  data: Record<string, unknown>;\n}\n`,
          );
        }
      },
      expect: () => ({ outcome: 'scored', flagged: [] }),
    },
    {
      id: 'edge-15-same-paths-other-repo',
      label: 'no_drift',
      title: 'ledger-service: rename rollback.sh and ROLLBACK_TIMEOUT',
      notes: 'Scenario 01 applied to a different repository (ledger-service) with the same file layout. Every PLAT anchor names payments-api, so nothing flags even though the runbook quotes ROLLBACK_TIMEOUT.',
      apply: () => undefined, // built separately (other repo)
      expect: () => ({ outcome: 'scored', flagged: [] }),
    },
    {
      id: 'edge-17-non-default-branch',
      label: 'no_drift',
      title: 'Hotfix failover-db.sh on release/2026.11',
      notes: 'A real change to a critical anchored script, merged into a release branch, not main. Skipped (non_default_branch); it raises drift when it reaches main.',
      apply: (r) => {
        r.edit('scripts/failover-db.sh', '--candidate) CANDIDATE="$2"; shift 2 ;;', '--to|--candidate) CANDIDATE="$2"; shift 2 ;;');
        return { branch: 'hotfix/failover-to-flag', destinationBranch: 'release/2026.11' };
      },
      expect: () => ({ outcome: 'skipped', skipReason: 'non_default_branch', flagged: [] }),
    },
    {
      id: 'edge-18-reindent-critical-script',
      label: 'no_drift',
      title: 'Reindent failover-db.sh to 4 spaces',
      notes: 'Whitespace-only change to a critical anchored script (every indented line). Behaviour and the commands the runbook quotes are unchanged.',
      apply: (r) => r.write('scripts/failover-db.sh', r.read('scripts/failover-db.sh').replace(/^( +)/gm, (s) => s + s)),
      expect: () => ({ outcome: 'scored', flagged: [] }),
    },
    {
      id: 'edge-19-license-headers',
      label: 'no_drift',
      title: 'Add license headers to every script',
      notes: 'Comment-only change: a 14-line license header in all 6 scripts, 4 of them critical anchors. No behaviour change.',
      apply: (r) => {
        const header = ['#', '# Copyright 2026 Acme Payments Ltd.', '#', '# Licensed under the Apache License, Version 2.0 (the "License");', '# you may not use this file except in compliance with the License.', '# You may obtain a copy of the License at', '#', '#     http://www.apache.org/licenses/LICENSE-2.0', '#', '# Unless required by applicable law or agreed to in writing, software', '# distributed under the License is distributed on an "AS IS" BASIS,', '# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.', '# See the License for the specific language governing permissions and', '# limitations under the License.'].join('\n');
        for (const f of readdirSync(join(r.dir, 'scripts'))) {
          const body = r.read(`scripts/${f}`);
          r.write(`scripts/${f}`, body.replace(/^(#![^\n]*\n)/, `$1${header}\n`));
        }
      },
      expect: () => ({ outcome: 'scored', flagged: [] }),
    },
    {
      id: 'edge-28-long-usage-comment',
      label: 'no_drift',
      title: 'Document scale-workers.sh with a 110-line usage comment',
      notes: 'Comment-only change of 110 lines to a critical anchored script. Magnitude saturates at 100 lines, so this is the largest a cosmetic change can score. Nothing the runbook quotes changes.',
      apply: (r) => {
        const lines = Array.from({ length: 110 }, (_, i) => `# ${i % 10 === 0 ? `Example ${i / 10 + 1}:` : `  step ${i % 10}: see the Scale payment workers runbook for when to scale by hand.`}`);
        r.edit('scripts/scale-workers.sh', 'set -euo pipefail\n', `${lines.join('\n')}\nset -euo pipefail\n`);
      },
      expect: () => ({ outcome: 'scored', flagged: [] }),
    },
    {
      id: 'edge-20-worker-max-raised',
      label: 'drift',
      title: 'Raise workers.max from 8 to 12',
      notes:
        'Helm value change. The scale runbook and the Helm page quote "max: 8" in code blocks. The failover runbook (connection budget: "up to 8 worker pods", 11 x 20) and the service overview ("2 to 8 pods") state the old bound in prose only: true drift that a path + identifier + snippet matcher cannot see. Kept as an honest hard case.',
      apply: (r) => r.edit('deploy/helm/values.yaml', /max: 8/, 'max: 12'),
      expect: () => ({
        outcome: 'scored',
        flagged: [
          { pageId: p('Scale payment workers') },
          { pageId: p('Payments deployment and Helm chart') },
          { pageId: p('Fail over the payments database'), knownMiss: 'States the old bound only in prose ("up to 8 worker pods", 11 x 20 connections); quotes no changed line or identifier.' },
          { pageId: p('Payments API service overview'), knownMiss: 'States the old bound only in prose ("2 to 8 pods").' },
        ],
      }),
    },
    {
      id: 'edge-21-charge-limit-lowered',
      label: 'drift',
      title: 'Lower the per-charge limit to 5,000,000 minor units',
      notes: 'One-line logic change in src/routes/charges.ts, a critical anchor. The Charges API guide documents 1 to 10,000,000. High. The src/** pages do not mention the limit.',
      apply: (r) => r.edit('src/routes/charges.ts', 'MAX_AMOUNT_MINOR = 10_000_000', 'MAX_AMOUNT_MINOR = 5_000_000'),
      expect: () => ({ outcome: 'scored', flagged: [{ pageId: p('Charges API guide'), severity: 'high' }] }),
    },
    {
      id: 'edge-22-large-pr-no-hunks',
      label: 'drift',
      title: 'Vendor the PSP SDK and add a drain timeout flag (320 files)',
      notes: 'Over 300 files, so the relay sends the diffstat only (no hunks). 316 vendored files under src/vendor/ plus a real change to scripts/drain-queue.sh (critical). Drain runbook High on paths alone; src/** pages stay quiet.',
      apply: (r) => {
        for (let i = 1; i <= 316; i++) r.write(`src/vendor/psp-sdk/m${String(i).padStart(3, '0')}.ts`, `export const m${i} = ${i};\n`);
        r.edit('scripts/drain-queue.sh', 'TIMEOUT=900', 'TIMEOUT="${DRAIN_TIMEOUT:-900}"');
        r.edit('scripts/drain-queue.sh', '--timeout) TIMEOUT="$2"; shift 2 ;;', '--timeout|-t) TIMEOUT="$2"; shift 2 ;;');
        return { withHunks: false };
      },
      expect: () => ({ outcome: 'scored', flagged: [{ pageId: p('Drain the settlement queue'), severity: 'high' }] }),
    },
    {
      id: 'edge-23-webhook-log-message',
      label: 'no_drift',
      title: 'Include the event type in the webhook dead-letter log',
      notes: 'One-line change to a log message in src/routes/webhooks.ts (normal anchor of 2 pages, src/** of 2 more). No page quotes the message. The narrow version of the scenario 10 precision check.',
      apply: (r) => r.edit('src/routes/webhooks.ts', '{ eventId: event.id, err }', '{ eventId: event.id, eventType: event.type, err }'),
      expect: () => ({ outcome: 'scored', flagged: [] }),
    },
  ];
}

/** Scenario 01 applied to another repo with the same layout (edge-15). */
function otherRepoChange(): Record<string, unknown> {
  const repo = new Repo(WORKSPACE, 'ledger-service', '{0c4e7b1a-55d2-4f0e-8d3b-6a9e2f1c7d10}');
  try {
    copyResolved(join(REPO_SRC, 'base'), repo);
    const base = repo.commit('Import ledger-service');
    copyResolved(join(REPO_SRC, 'scenarios/01-rename-rollback-script'), repo, (f) => f === 'scenario.json');
    repo.remove('scripts/rollback.sh');
    const head = repo.commit('Rename rollback script and timeout variable');
    return repo.changeRecord(base, head, { prId: 77, title: 'Rename rollback script and timeout variable', sourceBranch: 'chore/rollback-v2' });
  } finally {
    repo.dispose();
  }
}

/** edge-16: a monorepo with 2 services and their own small pages. */
function monorepoFixture(): Fixture {
  const repo = new Repo(WORKSPACE, 'platform', '{9a1f3c5e-7b2d-4e6f-8a0c-1d3e5f7a9b2c}');
  try {
    const script = (svc: string, varName: string) =>
      `#!/usr/bin/env bash\n# Roll ${svc} back to the previous Helm revision.\nset -euo pipefail\nTIMEOUT="\${${varName}:-300}"\nhelm rollback ${svc} --wait --timeout "\${TIMEOUT}s"\n`;
    repo.write('services/payments/scripts/rollback.sh', script('payments', 'PAYMENTS_ROLLBACK_TIMEOUT'));
    repo.write('services/ledger/scripts/rollback.sh', script('ledger', 'LEDGER_ROLLBACK_TIMEOUT'));
    repo.write('services/ledger/src/index.ts', "export const service = 'ledger';\n");
    const base = repo.commit('Import platform monorepo');
    repo.edit('services/ledger/scripts/rollback.sh', /LEDGER_ROLLBACK_TIMEOUT/g, 'LEDGER_ROLLBACK_TIMEOUT_SECS');
    const head = repo.commit('ledger: take the rollback timeout in seconds');
    const change = repo.changeRecord(base, head, { prId: 12, title: 'ledger: take the rollback timeout in seconds', sourceBranch: 'ledger/rollback-secs' });
    const page = (id: string, svc: string, varName: string): Page => ({
      pageId: id,
      title: `${svc} rollback (platform monorepo)`,
      storage: `<p>Roll ${svc} back from the root of the platform repo.</p><ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[${varName}=600 ./services/${svc.toLowerCase()}/scripts/rollback.sh]]></ac:plain-text-body></ac:structured-macro><p>Set <code>${varName}</code> for slow releases.</p>`,
    });
    return {
      id: 'edge-16-monorepo-service-scoping',
      label: 'drift',
      title: 'Monorepo: a change in one service flags only that service',
      notes: 'One repo, 2 services with the same script name. The ledger page (glob services/ledger/**) quotes LEDGER_ROLLBACK_TIMEOUT, which the change renamed: flags. The payments page (exact path, its own service glob, and a whole-repo anchor) must stay quiet: repo-wide anchors never alert alone.',
      source: 'edge',
      generatedBy: GENERATED_BY,
      pages: [page('mono-payments-rollback', 'Payments', 'PAYMENTS_ROLLBACK_TIMEOUT'), page('mono-ledger-rollback', 'Ledger', 'LEDGER_ROLLBACK_TIMEOUT')],
      bindings: [
        { id: 'b-mono-pay-1', pageId: 'mono-payments-rollback', anchorType: 'path', repo: 'nano-soft-dev/platform', pattern: 'services/payments/scripts/rollback.sh', weight: 'critical' },
        { id: 'b-mono-pay-2', pageId: 'mono-payments-rollback', anchorType: 'glob', repo: 'nano-soft-dev/platform', pattern: 'services/payments/**', weight: 'normal' },
        { id: 'b-mono-pay-3', pageId: 'mono-payments-rollback', anchorType: 'repo', repo: 'nano-soft-dev/platform', weight: 'normal' },
        { id: 'b-mono-led-1', pageId: 'mono-ledger-rollback', anchorType: 'glob', repo: 'nano-soft-dev/platform', pattern: 'services/ledger/**', weight: 'normal' },
      ],
      steps: [{ change, expect: { outcome: 'scored', flagged: [{ pageId: 'mono-ledger-rollback', severity: 'medium' }] } }],
    };
  } finally {
    repo.dispose();
  }
}

function jiraEdgeFixtures(): Fixture[] {
  const key = (ref: string) => keyByRef.get(ref) ?? ref;
  const jira = (id: string, label: Fixture['label'], title: string, notes: string, change: Record<string, unknown>, flagged: ExpectedFlag[]): Fixture => ({
    id, label, title, notes, source: 'edge', generatedBy: GENERATED_BY, pages: PAGES, bindings: BINDINGS,
    steps: [{ change: { source: 'jira', author: 'Dana Okafor', ...change }, expect: { outcome: 'scored', flagged } }],
  });
  const rollbackEpic = key('rollback-epic');
  const multiRegion = key('multi-region-epic');
  const settlementEpic = key('settlement-worker-epic');
  return [
    jira('edge-24-jira-summary-only', 'no_drift', `${rollbackEpic} summary edited`, 'Summary-only edit on the epic behind the rollback runbook (normal Jira anchor). Scores 0.3: needs another signal.',
      { issueKey: rollbackEpic, changelogId: '10601', statusCategory: 'indeterminate', changelog: [{ field: 'summary', from: 'Safer payments deploys and rollbacks', to: 'Safer payments deploys, rollbacks and canaries' }] }, []),
    jira('edge-25-jira-epic-done', 'drift', `${rollbackEpic} moved to Done`, 'The epic behind the rollback runbook (normal Jira anchor) is done: the runbook may describe the work as in progress. Detection.md scores Done 0.7: Medium.',
      { issueKey: rollbackEpic, changelogId: '10602', statusCategory: 'done', changelog: [{ field: 'status', from: 'In Progress', to: 'Done' }] }, [{ pageId: p('Payments rollback runbook'), severity: 'medium' }]),
    jira('edge-26-jira-done-resolution-wont-do', 'drift', `${multiRegion} Done with resolution Won't Do`, "The fallback the seed script uses when the workflow has no Won't Do status. Same outcome as jira-01.",
      { issueKey: multiRegion, changelogId: '10603', statusCategory: 'done', changelog: [{ field: 'status', from: 'To Do', to: 'Done' }, { field: 'resolution', from: null, to: "Won't Do" }] }, [{ pageId: p('ADR-015: Active-passive multi-region database'), severity: 'high' }]),
    jira('edge-27-jira-in-progress', 'no_drift', `${settlementEpic} To Do to In Progress`, 'A status move that is not Done or Won\'t Do, on the epic anchored by the settlement worker overview. No alert.',
      { issueKey: settlementEpic, changelogId: '10604', statusCategory: 'indeterminate', changelog: [{ field: 'status', from: 'To Do', to: 'In Progress' }] }, []),
  ];
}

// ---------------------------------------------------------------------------------------------

function main(): void {
  const repo = new Repo(WORKSPACE, REPO_SLUG, REPO_UUID);
  const fixtures: Fixture[] = [];
  try {
    const base = seedBase(repo);
    const demo = demoFixtures(repo, base);
    fixtures.push(...demo.fixtures, ...jiraFixtures());

    const final = repo.head();
    let pr = FIRST_PR + demo.fixtures.length;
    for (const ec of edgeCases(demo.titles)) {
      let change: Record<string, unknown>;
      if (ec.id === 'edge-15-same-paths-other-repo') {
        change = otherRepoChange();
      } else {
        repo.checkout(final);
        const meta = ec.apply(repo) ?? {};
        const head = repo.commit(ec.title);
        change = repo.changeRecord(final, head, {
          prId: pr++,
          title: ec.title,
          sourceBranch: meta.branch ?? `edge/${ec.id}`,
          ...(meta.destinationBranch !== undefined && { destinationBranch: meta.destinationBranch }),
          ...(meta.withHunks !== undefined && { withHunks: meta.withHunks }),
        });
      }
      fixtures.push({
        id: ec.id, label: ec.label, title: ec.title, notes: ec.notes, source: 'edge', generatedBy: GENERATED_BY,
        pages: PAGES, bindings: BINDINGS,
        steps: [{ change, expect: ec.expect({ files: change.files as ChangedFile[] }) }],
      });
    }
    fixtures.push(monorepoFixture(), ...jiraEdgeFixtures());
  } finally {
    repo.dispose();
  }

  for (const f of readdirSync(OUT)) if (/^(demo|jira|edge)-.*\.json$/.test(f)) rmSync(join(OUT, f));
  for (const fx of fixtures) writeFileSync(join(OUT, `${fx.id}.json`), `${JSON.stringify(fx, null, 2)}\n`);
  const counts = { demo: 0, 'jira-beat': 0, edge: 0 };
  for (const fx of fixtures) counts[fx.source]++;
  console.log(`wrote ${fixtures.length} fixtures to ${relative(ROOT, OUT)}: ${counts.demo} demo, ${counts['jira-beat']} Jira beats, ${counts.edge} edge cases`);
}

main();
