import { describe, expect, it } from 'vitest';
import { extractPageText, indexPage, suggestAnchors } from '../src/index.js';

const STORAGE = `<h1>Rollback &amp; recovery</h1>
<p>Run <code>scripts/rollback.sh</code> from <a href="https://bitbucket.org/nano-soft-dev/payments-api">the repo</a>. See PAY-142 and UTF-8 notes.</p>
<ac:structured-macro ac:name="code" ac:schema-version="1"><ac:parameter ac:name="language">bash</ac:parameter><ac:plain-text-body><![CDATA[#!/usr/bin/env bash
./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT
docker pull registry.acme.dev/payments-api:1.4.0
kubectl apply -f deploy/helm/
cat /etc/hosts]]></ac:plain-text-body></ac:structured-macro>
<pre>helm rollback payments 0 &lt;rev&gt;</pre>
<p>Values live in \`deploy/helm/values.yaml\`. Routes: <code>POST /v1/refunds</code>.</p>
<ac:structured-macro ac:name="info"><ac:parameter ac:name="title">hidden-param</ac:parameter><ac:rich-text-body><p>Owner&#58; Dana&nbsp;Okafor</p></ac:rich-text-body></ac:structured-macro>`;

describe('extractPageText', () => {
  const page = extractPageText(STORAGE);

  it('pulls out code macros and pre blocks with their raw text', () => {
    expect(page.codeBlocks).toEqual([
      '#!/usr/bin/env bash\n./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT\ndocker pull registry.acme.dev/payments-api:1.4.0\nkubectl apply -f deploy/helm/\ncat /etc/hosts',
      'helm rollback payments 0 <rev>',
    ]);
  });

  it('returns visible text with entities decoded and macro parameters dropped', () => {
    expect(page.text).toContain('Rollback & recovery');
    expect(page.text).toContain('Owner: Dana Okafor');
    expect(page.text).toContain('./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT');
    expect(page.text).not.toContain('hidden-param');
    expect(page.text).not.toMatch(/<\/?(?:p|h1|ac:|pre|code)\b/);
    expect(page.text).toContain('helm rollback payments 0 <rev>');
  });

  it('collects inline code, backticked spans and links', () => {
    expect(page.inlineCode).toEqual(['scripts/rollback.sh', 'POST /v1/refunds', 'deploy/helm/values.yaml']);
    expect(page.links).toEqual(['https://bitbucket.org/nano-soft-dev/payments-api']);
  });

  it('joins split CDATA sections', () => {
    const split = '<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[a ]]]]><![CDATA[> b]]></ac:plain-text-body></ac:structured-macro>';
    expect(extractPageText(split).codeBlocks).toEqual(['a ]]> b']);
  });
});

describe('suggestAnchors', () => {
  it('suggests repo paths, globs, Jira keys and the repo, and skips system paths and image refs', () => {
    const labels = suggestAnchors(extractPageText(STORAGE)).map((s) => `${s.anchorType} ${s.label} (${s.evidence})`);
    expect(labels).toEqual([
      'path payments-api: scripts/rollback.sh (code_block)',
      'glob payments-api: deploy/helm/** (code_block)',
      'path payments-api: deploy/helm/values.yaml (inline_code)',
      'jira PAY-142 (jira_key)',
      'repo payments-api (whole repo) (repo_url)',
    ]);
  });

  it('turns Bitbucket file and folder URLs into anchors, and leaves repo unset when several repos are linked', () => {
    const page = extractPageText(
      '<p><a href="https://bitbucket.org/acme/api/src/main/package.json">x</a> <a href="https://bitbucket.org/acme/web/src/main/deploy">y</a></p><p><code>src/app.ts</code></p>',
    );
    expect(suggestAnchors(page)).toEqual([
      { anchorType: 'path', pattern: 'package.json', repo: 'acme/api', evidence: 'repo_url', label: 'api: package.json' },
      { anchorType: 'glob', pattern: 'deploy/**', repo: 'acme/web', evidence: 'repo_url', label: 'web: deploy/**' },
      { anchorType: 'path', pattern: 'src/app.ts', evidence: 'inline_code', label: 'src/app.ts' },
      { anchorType: 'repo', repo: 'acme/api', evidence: 'repo_url', label: 'api (whole repo)' },
      { anchorType: 'repo', repo: 'acme/web', evidence: 'repo_url', label: 'web (whole repo)' },
    ]);
  });
});

describe('indexPage', () => {
  it('indexes tokens, code tokens and code line hashes', () => {
    const index = indexPage({ pageId: '1', title: 'Runbook', storage: STORAGE });
    expect(index.tokens.has('ROLLBACK_TIMEOUT')).toBe(true);
    expect(index.tokens.has('Owner')).toBe(true);
    expect(index.codeTokens.has('refunds')).toBe(true);
    expect(index.codeTokens.has('Owner')).toBe(false);
    expect(index.codeLineHashes.size).toBe(6);
  });
});
