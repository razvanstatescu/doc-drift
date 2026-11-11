import { describe, expect, it } from 'vitest';
import { excerptBlocks, isCodeWord } from '../src/frontend/shared/excerpt';

// The demo runbook's "Steps" section as the resolver flattens it.
const STEPS =
  '…Run the rollback script from the root of the payments-api repo. ROLLBACK_TIMEOUT is in seconds and defaults to 300. ' +
  'Raise it to 600 if the cluster is under load. export ROLLBACK_TIMEOUT=300 ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT ' +
  'The script calls helm rollback payments 0 --wait, so it returns only when the previous release is ready…';

describe('isCodeWord', () => {
  it('spots paths, flags, assignments, variables and file names', () => {
    for (const w of ['./scripts/rollback.sh', '--timeout', '-n', 'ROLLBACK_TIMEOUT=300', '$ROLLBACK_TIMEOUT', 'values.yaml', 'ROLLBACK_TIMEOUT', '`rollback.sh`']) {
      expect(isCodeWord(w), w).toBe(true);
    }
  });

  it('leaves plain words, numbers and abbreviations alone', () => {
    for (const w of ['The', 'script', '300', 'e.g', 'i.e.', 'a', 'payments']) expect(isCodeWord(w), w).toBe(false);
  });
});

describe('excerptBlocks (flattened excerpt)', () => {
  it('lifts the matched command onto its own code line', () => {
    const blocks = excerptBlocks(STEPS, ['scripts/rollback.sh', 'rollback.sh']);
    expect(blocks.map((b) => b.type)).toEqual(['prose', 'code', 'prose']);
    expect(blocks[1]).toEqual({ type: 'code', text: 'export ROLLBACK_TIMEOUT=300 ./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT' });
    const before = blocks[0]!.type === 'prose' ? blocks[0]!.parts.map((p) => p.text).join('') : '';
    expect(before.trimEnd().endsWith('under load.')).toBe(true);
  });

  it('keeps a lone path inside a sentence as inline code', () => {
    const blocks = excerptBlocks('Run scripts/rollback.sh from the repo root.', ['scripts/rollback.sh']);
    expect(blocks).toEqual([
      {
        type: 'prose',
        parts: [
          { text: 'Run ', kind: 'text' },
          { text: 'scripts/rollback.sh', kind: 'code' },
          { text: ' from the repo root.', kind: 'text' },
        ],
      },
    ]);
  });

  it('keeps trailing punctuation in the prose', () => {
    const blocks = excerptBlocks('See values.yaml. Then deploy.', ['values.yaml']);
    expect(blocks[0]!.type === 'prose' && blocks[0]!.parts).toEqual([
      { text: 'See ', kind: 'text' },
      { text: 'values.yaml', kind: 'code' },
      { text: '. Then deploy.', kind: 'text' },
    ]);
  });

  it('keeps bold emphasis for a token that is not code, like a Jira key', () => {
    const blocks = excerptBlocks('Tracked in PAY-142 until the release.', ['PAY-142']);
    expect(blocks[0]!.type === 'prose' && blocks[0]!.parts.find((p) => p.kind !== 'text')).toEqual({ text: 'PAY-142', kind: 'match' });
  });

  it('returns plain prose when nothing matches, and nothing for an empty excerpt', () => {
    expect(excerptBlocks('Nothing here.', ['rollback.sh'])).toEqual([{ type: 'prose', parts: [{ text: 'Nothing here.', kind: 'text' }] }]);
    expect(excerptBlocks('', ['x'])).toEqual([]);
  });
});

describe('excerptBlocks (resolver code lines)', () => {
  it('cuts the code lines out of the excerpt and merges neighbours into one block', () => {
    const blocks = excerptBlocks(STEPS, ['scripts/rollback.sh'], ['export ROLLBACK_TIMEOUT=300', './scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT']);
    expect(blocks.map((b) => b.type)).toEqual(['prose', 'code', 'prose']);
    expect(blocks[1]).toEqual({ type: 'code', text: 'export ROLLBACK_TIMEOUT=300\n./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT' });
  });

  it('emphasises at most one token across the prose', () => {
    const blocks = excerptBlocks('Use rollback.sh first. x=1 Then rollback.sh again.', ['rollback.sh'], ['x=1']);
    const matches = blocks.flatMap((b) => (b.type === 'prose' ? b.parts.filter((p) => p.kind === 'match') : []));
    expect(matches).toHaveLength(1);
  });

  it('appends code lines the excerpt cut off', () => {
    const blocks = excerptBlocks('Short excerpt…', [], ['helm history payments']);
    expect(blocks.at(-1)).toEqual({ type: 'code', text: 'helm history payments' });
  });
});
