# Codegeist 2026: verified rules and Marketplace reference

Researched 2026-11-11 for Doc Drift Sentinel (core Confluence+Jira app plus Bitbucket relay app).

**How to read the labels**
- **Verified**: confirmed on the cited primary source.
- **Verified (index)**: the Devpost pages return HTTP 403 to direct fetches from our tooling. These facts come from search-engine excerpts of the official Devpost page at the URL shown. Quoted text is the excerpt as returned. Re-read the live page in a browser before relying on exact wording.
- **Unverified**: no primary source found. Community answers and third-party notes are marked as such.

Devpost URLs: rules `https://codegeist2026.devpost.com/rules`, overview `https://codegeist2026.devpost.com/`. The Updates, Resources and FAQ tabs could not be read (403, and no search excerpts). **Unverified**: whether those tabs add or change anything below. Check them by hand once a week.

---

## 1. Deadlines and dates (all Pacific Time unless noted)

| Event | Date and time | Status |
|---|---|---|
| Registration and Submission Period opens | Tue Oct 27, 2026, 9:00 AM PT | Verified (index), /rules |
| **Submission deadline** | **Tue Dec 22, 2026, 12:00 PM PT** (= 20:00 UTC, 3:00 PM ET). The entire Devpost form must be complete by then. | Verified (index), /rules and overview. Also Verified in the Atlassian launch post: https://community.developer.atlassian.com/t/heads-up-developers-codegeist-2026-is-officially-open/103506 |
| Build Session (Zoom): Danny Thompson and Adam Moore, "AI workflows with Forge and Rovo", live Q&A, recording on YouTube | Tue Nov 17, 2026, 12:00 to 12:45 PM ET | Verified (index), overview |
| Judging Period | Tue Jan 5, 2027, 1:00 PM PT to Wed Feb 3, 2027, 5:00 PM PT | Verified (index), /rules |
| Winners announced | On or around Mon Feb 15, 2027, 9:00 AM PT | Verified (index), /rules |
| Separate Marketplace cutoff | None found. The Marketplace bonus accepts a listing link **or** a review ticket link, so the ticket must exist by the Dec 22 deadline. | Verified (index) that the ticket is accepted. "No separate cutoff" is Unverified (absence of evidence). |

Practical deadlines derived from Atlassian docs (see section 6):
- Marketplace partner verification (one-time): 2 to 3 business days. Verified: https://developer.atlassian.com/platform/marketplace/app-approval-security-workflow/
- Forge demo sites expire 90 days after provisioning. A site provisioned before about Nov 6 expires before judging ends on Feb 3. Verified: https://developer.atlassian.com/platform/forge/provision-a-demo-development-site/

## 2. Submission requirements

- **Platform**: must be built on Forge and integrate with at least one of Jira, Confluence, Jira Service Management, Bitbucket, Teamwork Graph or Rovo. Verified (index), overview and /rules.
- **New and existing projects**: the project must be newly created and "not yet published prior to" the Submission Period. An older project must have been "updated or rebuilt in the Forge platform after the start of the Hackathon Submission Period". It must have a Forge manifest and at least one Forge module. Verified (index), /rules.
- **Installation link**: give judges and the review team "access ... to an installation link" plus "all necessary instructions", meaning every configuration step and any integrations to install. Create the link by following Forge's "Start sharing your app" instructions. Verified (index), /rules.
- **Multiple installation links**: the rules neither allow nor forbid them. **Unverified.** A community member (not staff) advised one entry with both links and separate setup steps for each: https://community.developer.atlassian.com/t/codegeist-2026-two-installation-links-and-which-bitbucket-plan-do-judges-test-on/103715 . No official answer as of Nov 11.
- **Demo video**: under 5 minutes. Judges are not required to watch beyond 3 minutes. It must be public on YouTube, linked on the form, and show the project running on the device it was built for. No third-party trademarks, copyrighted music or other material without permission. Verified (index), /rules.
- **Text**: a description of features and functionality, plus an explanation of how the project meets the technology requirement (Forge plus at least one Atlassian product). Verified (index), /rules.
- **Category and bonuses**: select one category and any bonus prizes, and provide each bonus's required write-up or link. The Sponsor and Devpost may move an entry to a different category or bonus. Verified (index), /rules.
- **Language**: the video, text description, testing instructions and all other materials must be in English or include an English translation. Verified (index), /rules.
- **Source repo**: no repository requirement was found. **Unverified** (absence of evidence).
- **Test credentials**: no rule requires a test account or credentials. Judges install the app on their own site through the link. **Unverified** (absence of evidence). A third-party summary says the link "must install on a judge's own site". Unverified.
- **Multiple entries**: allowed if each project is unique or substantially different. Verified (index), /rules.
- **Judge environment (Rovo, admin rights, Bitbucket plan)**: **Unverified.** Open community threads have no staff reply:
  - https://community.developer.atlassian.com/t/codegeist-2026-judges-environment-preview-modules-and-teamwork-graph-data-over-mcp/103763
  - https://community.developer.atlassian.com/t/codegeist-2026-will-judges-test-sites-have-rovo-enabled-and-is-the-forge-llm-module-available-on-them/103823
  - https://community.developer.atlassian.com/t/codegeist-2026-is-rovo-on-judges-test-sites-and-can-an-install-link-app-call-teamwork-graph-preview-without-eap/103827
- **Bitbucket judging notes**: the rules name no Bitbucket plan. **Unverified.** Community advice is to assume Free, and that Forge apps need a team workspace, not a personal one (thread 103715 above).
- **Rovo on free developer sites**: several participants report that Rovo Chat and agents do not appear on free developer sites. A Forge demo site (`forge site provision`) fixed it for one user on Nov 10. Community reports, **Unverified**: https://community.developer.atlassian.com/t/forge-rovo-agent-installed-but-rovo-not-visible-on-free-dev-site-codegeist-2026/103668 . Demo sites include "enterprise editions of Jira, Confluence, Jira Service Management, and Rovo", one active site per developer, 90 days. Verified: https://developer.atlassian.com/platform/forge/provision-a-demo-development-site/

## 3. Judging criteria

Verified (index), /rules.

- **Stage One** is pass/fail: does the project fit the theme and reasonably use the required APIs/SDKs (Forge plus an Atlassian product)?
- **Stage Two**: "All Submissions that pass Stage One will be evaluated in Stage Two based on the following equally weighted criteria". That is 5 criteria at **20% each**:

| Criterion | Published wording (excerpts) |
|---|---|
| Technological Implementation | How well the project uses Forge and at least one Atlassian product. "Does the project reflect genuine effort and a working, non-trivial implementation?" |
| Design | "Does the project deliver a complete, coherent product experience — not just a technical proof of concept?" |
| Potential Impact | "a credible, specific case for solving a real problem for a real audience". "Does the solution actually address that problem based on what's demonstrated?" |
| Innovation/Idea | "How creative and novel is the concept and does the project differ from existing concepts?" |
| Presentation | "Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is the overall presentation easy to follow?" |

- **Ties** are broken by comparing scores criterion by criterion in the order listed, starting with Technological Implementation. If still tied, the judges vote. Verified (index), /rules (excerpt is a paraphrase, not quoted).

## 4. Prizes

Total: $120,000 cash. Verified (index), overview, and the launch post.

**Categories.** One Grand Prize set per category. Verified (index), overview.
- *Apps for Software Teams*: "Give dev teams the context to ship with confidence. Think smarter code reviews, deployment awareness, issue triage that actually understands what matters."
- *Apps for Business Teams*: marketing, sales, HR, finance, support, legal.
- *Apps for Specialized Industries*: healthcare, finance, manufacturing, automotive and other fields.

**Grand prizes per category.** Each tier has 3 winners, one per category. Verified (index), overview.
- 1st: $15,000
- 2nd: $8,000
- 3rd: $5,000

Grand prizes total $84,000.

**Bonus prizes.** Each pays $1,500 to 6 winners ($36,000 total). Verified (index), overview.

| Bonus | Exact eligibility text |
|---|---|
| Best Agents (Rovo/Assignable agents) | "$1500 to 6 projects that use a Forge app including the rovo:agent module, the rovo:agentConnector module, or apps with reusable rovo:skill and rovo:action modules that other agents can invoke as tools." |
| Best app with Atlassian MCP | "$1500 to 6 projects that use a Forge app exposing an MCP server." |
| Best apps with Teamwork Graph integration | "$1500 to 6 projects that connects data into the graph and/or consumes data from the TWG API." |
| Best Marketplace published app | "$1500 to 6 projects that must be published to the Marketplace or submitted for listing. Provide either the link to the listing or link to the Marketplace review ticket." |

- **No Runs on Atlassian bonus in 2026.** The 2024 and 2025 editions had one. The 2026 overview lists only the four bonuses above, and no 2026 excerpt mentions Runs on Atlassian. Verified (index) that only four bonuses are listed.
- **Participation Prize**: Atlassian Developer Swag Pack, 300 winners. It goes "first-come, first-serve" to Entrants of Eligible Submissions, while supplies last, max 4 per Submission, one per entrant. Verified (index), overview and /rules.
- **Stacking**: "The same Submission can win up to one Grand Prize and one Bonus Prize." You may enter several bonuses, but at most one pays out. Verified (index), /rules.

## 5. Runs on Atlassian (RoA)

**Requirements.** Verified: https://developer.atlassian.com/platform/forge/runs-on-atlassian/ (updated Aug 24, 2026) and https://developer.atlassian.com/platform/forge/runs-on-atlassian-apps/ (updated Jul 14, 2026).
- The app must use only Atlassian-hosted compute and storage. Storage must be data-residency-enabled Forge storage or Atlassian app entity properties.
- Data residency must match the host Atlassian app.
- The manifest must declare no external egress domains except analytics, and analytics must carry no in-scope End-User Data. Customers can control external egress through admin controls.
- These make an app ineligible: `remotes`, Connect modules, `providers`, **dynamic web triggers**, customer-managed egress, customer-managed remotes.
- **Web triggers are dynamic by default.** Only triggers with `response: { type: static }` qualify. "Web triggers are considered `dynamic` by default, unless configured otherwise". "only `static` web triggers are eligible for the Runs on Atlassian program". A static trigger can only egress data as configured in its `outputs`. Verified: https://developer.atlassian.com/platform/forge/manifest-reference/modules/web-trigger/ (updated Oct 13, 2026)

**How it is checked.** You do not apply. The badge is "automatically applied to eligible apps on the Atlassian Marketplace". Run `forge eligibility` to check, and deployment also checks automatically. Verified (same sources).

**Open question.** Does egress to another Forge app's web trigger host (`*.atlassian-dev.net`) count as external? Not documented. **Unverified.**

**Relevance to Codegeist 2026.** RoA is neither a judging criterion nor a prize. Its only value is as a Marketplace badge and a trust/privacy point in the pitch (Design and Impact).

## 6. Marketplace

**Steps to list a Forge app.** Verified: https://developer.atlassian.com/platform/marketplace/listing-forge-apps/ and https://developer.atlassian.com/platform/marketplace/onboarding-hub/launch/create-your-marketplace-listing-and-link-your-forge-app/ (updated May 19, 2026).
1. Create a Marketplace partner profile. An individual can use their own name. Verified: https://developer.atlassian.com/platform/marketplace/become-a-partner/
2. Publish the developer space and enable sharing (distribution) for the app in the developer console.
3. In the Partner portal, create a Cloud listing. Enter name, tagline, category, supported products and languages. Upload logo, screenshots and an optional video. Add links to the privacy policy, EULA/terms, documentation and support contact. Add license and pricing. Map the app key to the Forge app.
4. Complete the Privacy & Security tab, which is mandatory for cloud onboarding. Complete the app-specific security questionnaire: its "fail signals ... will block your app from listing". Resolve critical and some high vulnerabilities found by the scans. List every API scope with its justification, and every remote host or IP with the data sent and why. Verified: https://developer.atlassian.com/platform/marketplace/app-approval-security-workflow/ (updated Jul 24, 2025)
5. Submit and accept the Marketplace Partner Agreement. Review tickets live in the ECOHELP/AMS projects on ecosystem.atlassian.net. Ticket location: community source, Unverified.
6. "Test installation on a fresh site". "Reviewers test on clean sites". "Incomplete compliance information will block your review." Verified (onboarding hub page).

**Paid listing requirement for multi-app apps.** Verified, with a conflict between sources.
- App compatibility doc: apps with a required Atlassian app "can only be listed on Marketplace as paid apps; free listings are not supported". Only Jira and Confluence are supported, and either can be the required app. https://developer.atlassian.com/platform/forge/app-compatibility/ (updated Oct 30, 2026). The migration guide says the same: https://developer.atlassian.com/platform/forge/migrating-a-forge-app-to-support-multiple-atlassian-apps/
- Distribution doc: "Apps with a required Atlassian app can be listed and distributed via the Atlassian Marketplace as paid apps." https://developer.atlassian.com/platform/forge/distribute-your-apps/ (updated Oct 30, 2026)
- **Conflict**: the listing page still says "soon you will be able to list and distribute apps that are compatible with multiple Atlassian apps." It may simply be out of date. Confirm in the Partner portal in week 1.
- Global Apps (EAP) support "Confluence, Jira and Bitbucket connections". Joining needs a sign-up form, the app must use `global:ui`, and required links are not allowed. Marketplace and install-link distribution for Global Apps is undocumented. **Unverified.** Do not depend on it.

**What paid-via-Atlassian implies.** Verified unless marked.
- Set `app.licensing.enabled: true` and deploy to production. "you won't be able to install the app from the production environment until your Marketplace listing is approved". "all installations of production paid apps are billed". Source: listing-forge-apps.
- No personal email domains: "Personal or generic domains (like Gmail or Yahoo) are not permitted for paid-via-Atlassian apps". The email must match the submitting organisation. Source: https://developer.atlassian.com/platform/marketplace/app-approval-guidelines/ (updated May 15, 2026)
- Add bank details and a tax ID to the Partner account to receive remittances. Source: https://developer.atlassian.com/platform/marketplace/creating-a-marketplace-listing/
- Without a W-8 on file, non-US partners face 30% withholding. Community report, **Unverified**: https://community.developer.atlassian.com/t/individual-developer-no-registered-company-whats-the-minimum-verification-needed-to-publish-a-paid-via-atlassian-app/102404
- "Your paid app should be reasonably and competitively priced." Source: app approval guidelines.

**Can a listed app still use an install link? No.** "Once your app has been submitted for listing on Marketplace, or has a license in the app manifest", it "can't be shared via installation link". To share it, copy the code into a new, unlicensed app and share that copy's link. Verified: distribute-your-apps and listing-forge-apps.
- Bitbucket Forge apps get **informational listings**: discoverable, but with no direct Marketplace install or licensing. They can still be distributed through the developer console. Verified: listing-forge-apps.

**Required assets.** Verified: https://developer.atlassian.com/platform/marketplace/building-your-presence-on-marketplace/ . That page was last updated Jun 5, 2020, so re-check the specs in the Partner portal.

| Asset | Spec |
|---|---|
| App logo | 144x144 px PNG/JPG. Transparent or bounded "chiclet" background. The icon is generated from it. No Atlassian product logos. |
| Partner logo | 144x144 px PNG/JPG/GIF, transparent background. |
| Banner | 1120x548 px (or 560x274) PNG/JPG, with app name, partner name and a short functionality line. |
| Highlights | **Exactly 3.** Each has a title of 50 chars or fewer, a summary of 220 or fewer, a 1840x900 screenshot (or 920x450), a 580x330 crop, and a caption of 220 or fewer. Up to 5 extra screenshots per highlight. |
| Screenshots | Hi-res, showing the app running in the Atlassian UI, not marketing graphics. |
| Video | Optional. YouTube link. 30 s or less recommended. |
| Text | Name 60 chars or fewer. Tagline 130 or fewer. More details 1000 or fewer. Partner name 40 or fewer. Release summary 80 or fewer. |
| Legal | Privacy policy (required), EULA/End User Terms (Atlassian offers a standard template), DPA if you process personal data, documentation link, support contact. |
| Compliance | Privacy & Security tab, security questionnaire, scope justifications, egress hosts, data-residency in-scope data list (if supported), personal data reporting and erasure. |

**Review time.** Verified, with conflicting figures.
- listing-forge-apps: "we aim to provide a decision within one week".
- Security workflow: new apps take "5-10 business days", longer if security issues need fixing.
- App approval guidelines (May 2026): "Approvals take 10-15 business days".
- For the bonus, only submission (the ticket link) matters, not approval.

## 7. Brand guidelines

Verified: https://developer.atlassian.com/platform/marketplace/atlassian-brand-guidelines-for-marketplace-partners/ (updated Jul 18, 2025) and https://developer.atlassian.com/platform/marketplace/app-approval-guidelines/

**Naming**
- The name must be 60 characters or fewer.
- An Atlassian app name must not come first. "*Jira App X* would be rejected, but *App X for Jira* would be approved".
- Allowed prepositions include "for", "in", "with" and "of".
- "&" and "and" may join two Atlassian apps.
- Avoid "Premium", "Atlassian", "plugin", "beta", "add-on" and "app".
- Use correct product casing (Confluence, Jira, Bitbucket, Rovo).
- Candidate names: "Doc Drift Sentinel for Confluence" (or "... for Confluence and Jira") and "Doc Drift Sentinel Relay for Bitbucket". Both comply.

**Logos and icons**
- "Do not use Atlassian logos or assets (illustrations, icons, fonts, wordmarks, etc.)".
- "Do not use design assets that resemble Atlassian's".
- No Atlassian "brand colors". There is no named "Atlassian blue" rule, but the brand-colors rule covers it. Pick a distinct palette.
- Show current product versions in screenshots and videos.
- "Trademark infringement is an automatic rejection". "If the UI breaks, your app will be rejected."
- Logos must be unique, but apps with the same function across products may share one. Source: building-your-presence.

---

## Differences from plan.md

1. **Video structure (sections 21, 22).** Judges are not required to watch past 3:00. The script puts the Claude Code and MCP proof (bonus evidence) at 2:45 to 3:25 and the Jira and dashboard beats after 3:25. Move the MCP/agent proof and the end-to-end flow inside the first 3:00, and treat 3:00 to 4:40 as optional. Also avoid third-party marks in the video without permission: the "Incident Slack mock" in the opening shot, and arguably the Claude Code or Cursor branding.
2. **Category not chosen.** The plan never names a Devpost category. Pick "Apps for Software Teams", whose examples ("deployment awareness") fit the app.
3. **Tie-break order.** Tie-breaks start with Technological Implementation, and all five criteria weigh 20%. The Devpost outline (section 22) maps correctly, but the plan should state the 20% weights and lead with Technological Implementation.
4. **Install-link rule is now official (section 2, Caveats).** The plan cites an unofficial GitHub note. The Forge docs (updated Oct 30) confirm it, and the rule is broader than the plan assumes. Submitting for listing **or** setting `licensing.enabled` in the manifest kills install-link sharing. The judge copy must be a separate app ID with **no licensing in its manifest**. Do not reuse the same manifest.
5. **Paid production installs are blocked until approval.** The listed core app cannot run in production on our own demo site until approved, and every production install is billed. The demo, video and judge testing must all use the unlicensed judge copy. Section 20's "Production deploy of core app" Dec 8 step should say which app ID.
6. **Paid listing prerequisites are missing from section 20.** Needed:
   - a non-Gmail, organisation-matching email domain
   - bank and tax details (and a W-8BEN if non-US)
   - partner verification (2 to 3 business days)
   - the security questionnaire (fail signals block listing)
   - vulnerability scans
   - a reasonable price

   Do all of these in week 1 or 2, not on Nov 14 alone.
7. **Multi-app listing availability conflicts.** One Marketplace page still says multi-app listing is coming "soon". Week-1 spike 9 must confirm in the Partner portal that a Confluence-required, Jira-optional app can be submitted as paid. Fallback: list a Confluence-only build, which can be free, as the "submitted for listing" project. Whether that variant counts for the bonus is Unverified.
8. **Multi-app scope is outdated (TL;DR, section 1).** The plan says "Jira, Confluence, Compass". The current doc says only Jira and Confluence for the required-app model. Separately, Global Apps (EAP) now support Bitbucket connections. Note it, but keep the two-app design: it is EAP, needs `global:ui`, and its distribution is undocumented.
9. **Runs on Atlassian has no prize in 2026.** The plan (sections 6 and 17) treats RoA as worth protecting. It is only a Marketplace badge. Also, the core manifest's `webtrigger: ingest-change` has no `response.type: static`, so it is dynamic by default and the **core app is not RoA-eligible as written**. Either add a static response config, if the ingest handler can work with static outputs, or drop the "core stays RoA" claim. Run `forge eligibility` in week 1.
10. **Review time (sections 16, 20).** The approval guidelines say 10 to 15 business days, and other pages say one week or 5 to 10 days. Submitting Dec 11 still yields a ticket in time, which is all the bonus needs. Approval before the Dec 22 deadline is not guaranteed, so do not promise a live listing link.
11. **Demo environment (section 19).** The plan uses a free dev site (go.atlassian.com/cloud-dev). Participants report Rovo missing on free dev sites, so use a Forge demo site (`forge site provision`) for Rovo work. Demo sites last 90 days: one provisioned Nov 10 dies around Feb 8, just after judging ends on Feb 3. Do not let it lapse, and do not re-provision late. The judges' Rovo access is unknown, so the setup guide should tell judges how to get a Rovo-enabled site, and the app should degrade gracefully without Rovo.
12. **Multiple install links are still unconfirmed.** The plan's "They don't say how many" comes from a non-staff reply. Post the question in the codegeist-2026 tag, or ask at the Nov 17 Build Session Q&A.
13. **Marketplace listing assets (section 20).** The plan lists "5 screenshots". Marketplace wants **exactly 3 highlights**: each with a 1840x900 and a 580x330 image, plus up to 5 extra screenshots per highlight. It also needs a 144x144 logo, a 1120x548 banner, a tagline of 130 chars or fewer, a DPA if applicable, and a personal-data reporting and erasure flow.
14. **Naming.** The listing name must follow "X for Confluence" or "X for Confluence and Jira". Never start with a product name or use "app" or "plugin". Keep the icon free of Atlassian blues, Atlassian-like shapes and product logos.
15. **New items to add to the timeline:**
    - Nov 17 Build Session (12:00 PM ET).
    - Participation swag goes to the first 300 eligible entrants, so earlier submission helps marginally. Unverified whether "first" is measured at submission time.
    - Winners are announced around Feb 15, 2027, so keep the judge copy alive until then.

## Update (2026-11-11, afternoon)

- **No staff answers yet.** Threads 103715, 103763, 103823, 103827 and 103668 have no Atlassian staff reply as of Nov 11. Related threads 103526 and 103575 (Rovo missing on dev sites) have none either. Verified: https://community.developer.atlassian.com/tag/codegeist-2026/1687
- **Launch post wording.** It tells entrants they need a "free Atlassian Cloud developer site". It says nothing about judge sites. Verified: https://community.developer.atlassian.com/t/heads-up-developers-codegeist-2026-is-officially-open/103506 . If judges also use free dev sites, they may lack Rovo Chat. **Unverified** (inference).
- **Devpost Updates, Resources and FAQ** still return 403. No search excerpt shows a new update since Nov 1. **Unverified.**
- **Bitbucket judges.** Bitbucket Forge apps can be shared by install link, but only into team workspaces. See [distribution.md](distribution.md#findings-2026-11-11).
