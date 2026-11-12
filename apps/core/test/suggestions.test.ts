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

describe('look-alike Jira keys (UX observation 10)', () => {
  const page = '<p>Runs on ARM-64, see COVID-19 notes. Tracked in PAY-142.</p>';
  it('drops keys whose project is not on the site', async () => {
    const { checkedSuggestions, withKnownProjects } = await import('../src/lib/suggestions');
    const list = await checkedSuggestions(page, [], async () => new Set(['PAY']));
    expect(list.filter((s) => s.anchorType === 'jira').map((s) => s.jiraKey)).toEqual(['PAY-142']);
    expect(withKnownProjects([{ anchorType: 'jira', jiraKey: 'ARM-64' }], null)).toHaveLength(1);
  });
  it('reads the project list only when a key was suggested', async () => {
    const { checkedSuggestions } = await import('../src/lib/suggestions');
    let calls = 0;
    await checkedSuggestions('<p>No keys here.</p>', [], async () => {
      calls += 1;
      return new Set();
    });
    expect(calls).toBe(0);
  });
});
