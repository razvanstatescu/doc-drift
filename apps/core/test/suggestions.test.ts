import { describe, expect, it } from 'vitest';
import { suggestionsFor } from '../src/lib/suggestions';

const PAGE = `<p>Open <a href="https://bitbucket.org/nano-soft-dev/payments-api/src/main/scripts/rollback.sh">scripts/rollback.sh</a>.</p>
<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT]]></ac:plain-text-body></ac:structured-macro>
<p>Helm values live in <code>deploy/helm/values.yaml</code>. Tracked in PAY-142.</p>`;

describe('suggestionsFor', () => {
  it('suggests paths, the repo and Jira keys from the page body', () => {
    const labels = suggestionsFor(PAGE, []).map((s) => s.label);
    expect(labels).toEqual(
      expect.arrayContaining(['payments-api: scripts/rollback.sh', 'payments-api: deploy/helm/values.yaml', 'PAY-142', 'payments-api (whole repo)']),
    );
  });

  it('hides anchors the page already has, whatever repo form was used', () => {
    const labels = suggestionsFor(PAGE, [{ anchorType: 'path', repo: 'payments-api', pattern: 'scripts/rollback.sh' }]).map((s) => s.label);
    expect(labels).not.toContain('payments-api: scripts/rollback.sh');
    expect(labels).toContain('payments-api: deploy/helm/values.yaml');
  });

  it('flags paths that need a repo when the page links none', () => {
    const s = suggestionsFor('<p><code>scripts/rollback.sh</code></p>', []);
    expect(s).toEqual([expect.objectContaining({ anchorType: 'path', pattern: 'scripts/rollback.sh', needsRepo: true })]);
  });
});
