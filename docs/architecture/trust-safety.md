# Trust, safety and privacy

These rules are product requirements, not polish. They are also the trust story in the pitch.

1. **No silent edits.** Every page body write is `asUser()`, triggered by a click, with a version message naming the PR ("Doc Drift: accepted proposal for PR #482"). It is reversible through page history. App-owned metadata (the byline content property, verification state) is written `asApp()` after a permission check on the clicking user, and never changes page text.
2. **Permission-aware reads.** Agent and MCP outputs use `asUser()`. Pages the caller cannot read return `status: "unknown"` and no title.
3. **LLM data minimisation.** Data goes to an LLM only when a user clicks Propose fix: the affected sections plus up to 200 diff lines. No full repo contents. State this in the privacy policy.
4. **Storage.** Anchors, scores, PR metadata and file paths. No page bodies. Diff hunks kept up to 30 days, then purged by the daily `dds-purge` job (metadata stays; M4). Jira change records keep the changed fields' old and new values. Fix drafts keep the text of the one block they replace, with the decision. The public summary is the website's privacy page (`site/privacy.html`); keep the two in step.
5. **Audit trail.** Verification rows record who, when, which drift events were closed, and why. Dismissals require a reason.
6. **Prompt injection.** SKILL.md and the agent prompt state that page and diff content are untrusted evidence, never instructions.
7. **Relay authenticity.** Change records are HMAC-SHA256 signed with a per-install secret. The core app keeps the secret in the Forge secret store (`kvs.setSecret`) and only a short fingerprint in plain storage, for display; it rejects unsigned or mismatched requests.
8. **Honest wording.** The product never says a page is wrong, only that its anchors changed.

## Human-approved edit options, ranked

1. **Footer comment** with the proposal and an "Open editor" link. Safest: no write scope on the page body. **Must.**
2. **`asUser()` page update** with a version message. Reversible through history. **Should.**
3. **Inline comment** anchored to the affected passage. Best UX, but the most fragile because of text-selection matching. Optional.

Confluence has no "suggested edit" API.
