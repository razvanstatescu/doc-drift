# Distribution for judging: share links only

Decision D19: we do only what the Codegeist rules require. That is an installation link judges can use on their own site, plus every setup step. No Marketplace listing, no licensing, no paid plan. Source rules: [codegeist-rules.md](codegeist-rules.md) §2.

## What we ship to judges

| Item | Notes |
| --- | --- |
| Core app install link | Developer console > the app > Distribution > "Start sharing your app" (production environment). Confluence required, Jira optional. |
| Bitbucket relay install link | The same flow, for a Bitbucket team workspace. Optional for judges: demo mode covers it. |
| Setup guide | Step by step, including connecting Jira, enabling external MCP, the demo mode replay, and how to get a Rovo-enabled site. Draft outline in [demo-and-pitch.md](demo-and-pitch.md#judge-setup-guide-to-write). |
| Video | Public YouTube, under 5 minutes; planned at 2:30 ([../video/research.md](../video/research.md)) |
| Devpost text | Features, and how it meets the technology requirement |

## Rules for the apps

- **Never add `app.licensing` to either manifest.** A licensed app cannot be shared by install link.
- One app ID per app: core and relay. No judge copy is needed.
- Deploy to the **production** environment for the share links. Keep developing in `development`/`staging`, so judge installs never break mid-judging.
- After the Dec 21 submission, freeze production: no deploys from Jan 5 to Feb 15, 2027 unless something is broken, and if so, keep it a minor version. A major version (new scopes or modules) asks every judge's admin to re-approve.
- Keep the demo site alive through judging (90-day expiry, see [timeline.md](timeline.md)).
- **Never regenerate an install link after submitting.** It permanently disables the old link judges hold.
- **Never switch to "Sharing within organization".** Keep the status at "Sharing" until Feb 15, 2027.

## Findings (2026-11-11)

Labels: **Verified** means read on the cited page today. **Unverified** means inferred, community-only, or not found.

Sources used below:
- [distribute] https://developer.atlassian.com/platform/forge/distribute-your-apps/ (updated Oct 30, 2026)
- [compat] https://developer.atlassian.com/platform/forge/app-compatibility/ (updated Oct 30, 2026)
- [manage] https://support.atlassian.com/organization-administration/docs/managing-an-installed-app/
- [install] https://support.atlassian.com/organization-administration/docs/installing-and-managing-app-access/
- [versions] https://developer.atlassian.com/platform/forge/versions/ (updated Oct 6, 2026)

### 1. Share link for Confluence required, Jira optional

- **Yes, it is supported.** For apps compatible with several Atlassian apps, "When admins install the app, it will be installed in the required Atlassian app." Admins "can also choose to connect it to any additional supported Atlassian apps during installation." Verified: [distribute].
- **What the installer sees.** The install screen shows the app and the permissions it requests. The admin picks a site, then reviews permissions and selects **Install**. Only a site admin can install. Verified: [distribute], [install].
- **Optional Jira at install.** For an app compatible with several Atlassian apps, the screen lets the admin "select which Atlassian apps to connect the app to". Verified: [install]. That page describes the Marketplace pop-up. That the link flow shows the same choice is **Unverified**. Test it on a second site.
- **Connecting Jira after install (UI path).** Verified: [manage].
  1. Atlassian Administration. Pick the organization.
  2. **Apps** > **Sites** > the site > **Connected apps**.
  3. **View app details** on our app > **Connections** tab.
  4. Under "App connections", Jira shows "Not connected". Select **Connect**, then review the new permissions.
- Disconnecting Jira keeps the app data. To uninstall, remove the app from the optional apps first. Verified: [manage], [compat].
- **Preview label.** The current docs show no Preview label for required/optional compatibility. Only Global Apps are EAP. Verified: [compat].
- **Old wording on the distribute page.** In the sharing steps, if you "select both Jira and Confluence", the link only installs "on sites running both". That text predates required/optional compatibility. How the sharing screen treats a `compatibility` manifest is **Unverified**. Check it in the console before submitting.
- **Known bugs.** A Jira-required, Confluence-optional app saw resolver calls from `jira:fullPage` fail with "Failed to validate FCT: 'contextIds' claim mismatch". It was fixed and the fix was confirmed on Jul 6, 2026. That app had the mirror setup of ours (Jira required). Verified (community, fix posted by an Atlassian-side reply): https://community.developer.atlassian.com/t/multi-platform-app-throws-failed-to-validate-fct-on-jira-fullpage/101308 . No open bug for our setup was found. **Unverified**.

### 2. Bitbucket relay share link

- **Yes, now supported.** Bitbucket Forge apps "use informational listings", so "you can continue to distribute them via the developer console after you list them". Verified: https://developer.atlassian.com/platform/marketplace/listing-forge-apps/ (updated Aug 26, 2026). The Bitbucket Connect-to-Forge guide also says to "Share your Forge app" to get its installation link. Verified: https://developer.atlassian.com/cloud/bitbucket/link-connect-to-its-equivalent-forge-app/ (updated Jun 15, 2026).
- An Oct 2023 reply said Bitbucket links were "currently not possible". That is outdated. https://community.developer.atlassian.com/t/how-do-i-generate-an-installation-link-for-my-forge-ui-app-for-bitbucket/74025
- **Team workspaces only.** "Forge apps are not supported on personal workspaces." Installing on one gives an "insufficient permissions" error. Verified: https://support.atlassian.com/bitbucket-cloud/kb/forge-installation-error-insufficient-permissions-to-install-app-in-bitbucket-cloud/
- Upgrade or uninstall happens in Bitbucket workspace settings. Verified: [distribute].
- **Plan.** No paid plan is needed to install Forge apps. **Unverified** (search excerpt of a staff post, not read directly). Required merge checks need Premium, but the relay does not use them.
- **Still open:** what the Bitbucket installer screen looks like (workspace picker). Test it with the production link on a second team workspace.

### 3. Relay function calling the core web trigger

- **No doc covers app-to-app web trigger calls.** **Unverified.** The web trigger, egress and permissions pages are all silent on it.
- Calls to any domain not in the manifest "will be rejected". Verified: https://developer.atlassian.com/platform/forge/manifest-reference/permissions/ (updated Sep 16, 2026).
- The Atlassian domains the egress page treats as internal are API redirects such as `api.media.atlassian.com`. Web trigger hosts are not listed. Verified: https://developer.atlassian.com/platform/forge/runtime-egress-permissions/ (updated Oct 7, 2026). So the relay must declare `*.webtrigger.atlassian.app` in `permissions.external.fetch.backend`. The wildcard covers the per-install subdomain. Verified: permissions page.
- A 2022 reply from an Atlassian engineer says egress "must be declared for web triggers". Allowlisting all web trigger domains by default would weaken the CSP for everyone. Verified (community, 2022): https://community.developer.atlassian.com/t/forge-webtrigger-url/57130
- **Reports of the pattern.** Community members suggest web triggers for app-to-app calls. Nobody reports testing it, and no report of it being blocked was found. https://community.developer.atlassian.com/t/forge-inter-app-communication/96264 . Atlassian has an internal item for inter-app communication with no date. **Unverified** (community report).
- A blocked call returns HTTP 403 with a `BLOCKED_EGRESS` error, not an exception. **Unverified** (third-party tutorial). Check `response.status` in the relay.
- **Still open: does it work end to end?** Run the week-1 spike now: relay in a team workspace, core on the demo site, production on both.

### 4. Judging environment and the Devpost entry

- **Rovo on judge sites: no official answer.** Threads 103715, 103763, 103823, 103827 and 103668 have no staff reply as of Nov 11. Related threads 103526 and 103575 have none either. https://community.developer.atlassian.com/tag/codegeist-2026/1687
- The launch post tells entrants to get a "free Atlassian Cloud developer site". Free dev sites are reported to lack Rovo Chat. So judges may lack Rovo. **Unverified** (inference). https://community.developer.atlassian.com/t/heads-up-developers-codegeist-2026-is-officially-open/103506
- **Two install links in one entry: no official answer.** The only reply on 103715 is from a participant. **Unverified.**
- **Devpost Updates, Resources and FAQ** still return HTTP 403 to our tools. No search excerpt shows a new update since Nov 1. **Unverified.** Check them by hand.
- **Still open:** Rovo on judge sites, judge admin rights, two links, judge Bitbucket plan. Ask at the Nov 17 Build Session Q&A.

### 5. Share-link mechanics

- **Environment.** The documented sharing steps deploy to **production**. Nothing documents sharing a development or staging environment. Verified: [distribute]. Keep D19's production rule.
- **Minor versions auto-update.** "Forge automatically updates all installed apps to the latest minor version of their major version". This includes link installs. Verified: [versions]. The page does not name link installs. **Unverified** that they behave differently, and nothing suggests it.
- **Major versions.** "By default, a new major version won't be applied to a site until its admin consents". The admin selects **Update** under Connected apps. Verified: [versions], [manage]. New permissions wait for approval. "the app continues running with its previously approved permission set". Verified: [distribute].
- **Bulk upgrades.** A developer can bulk-upgrade a major version "without site admin approval" in some cases. The target must be in the same environment and have a higher version. It must add no scopes or egress that escalate privilege. Licensing must stay the same. Verified: [distribute]. This is a fallback if a judging-period fix must be a major version.
- **Links do not expire.** No expiry is documented. **Unverified** (absence of evidence). A link dies only in two cases:
  - Generating a new link "disables the previous installation link". This "can't be undone". Existing installs keep working and keep getting updates. Verified: [distribute].
  - Stopping sharing blocks new installs. Existing users "can generally continue" but the app "might stop working" in some cases. Verified: [distribute].
- **Org-level sharing (new Oct 28).** It would block judges. Switching an app to it later stops upgrades for sites outside our org. Verified: https://developer.atlassian.com/platform/forge/changelog/
- **Install cap for unlisted apps.** None found on the distribute, Marketplace listing or changelog pages. **Unverified** (absence of evidence).

### Plan changes from these findings

- **Never regenerate the install link** after we submit. It kills the link judges have.
- **Never switch to "Sharing within organization".** Keep the status at "Sharing" until Feb 15, 2027.
- The setup guide gives the exact Connected apps path above for connecting Jira.
- Run the relay-to-core web trigger spike this week. It is the one unverified link in the relay design.
- Test the Bitbucket link on a second team workspace. Test the core link on a second site with Jira, to see whether the Jira option appears.
