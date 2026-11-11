# Marketplace submission (deferred: not doing it for the hackathon)

> **Status: deferred (D19, 2026-11-11).** For Codegeist we distribute only through the Forge share link: see [distribution.md](distribution.md). This file keeps the Marketplace research for a post-hackathon listing. Nothing here is on the hackathon timeline.

Goal (if revived): the "Best Marketplace published app" bonus requires an app "published to the Marketplace or submitted for listing", proven with the listing link or the Marketplace review ticket link. That bonus has the widest net (6 winners). Verified rules are in [codegeist-rules.md](codegeist-rules.md).

## Constraints

- Multi-app Forge apps listed on the Marketplace must be **paid** ("free listings are not supported"). The core app has Jira as an optional app, so its listing is paid. One Marketplace page still says multi-app listing is coming "soon": confirm in the Partner portal in week 1 (spike S9). **Fallback:** list a Confluence-only build. Whether that counts for the bonus is unverified.
- Bitbucket Forge apps get informational listings and keep developer-console distribution.
- **Confirmed in the Forge docs:** once an app is submitted for listing, **or has `licensing.enabled` in its manifest**, it cannot be shared via an installation link. Paid production installs are blocked until the listing is approved, and every production install is billed.
- **So there are two app IDs with the same code:**
  - *Listed app*: has `licensing`, is submitted to the Marketplace, and is never used for the demo.
  - *Judge copy*: **no licensing block in its manifest**. Used for the video, the demo site and the Devpost install link. Keep the manifests separate (for example, generate the licensing block at build time).
- Paid listing prerequisites:
  - a non-Gmail email matching the organisation
  - bank and tax details (W-8BEN if non-US, or face 30% withholding)
  - partner verification (2 to 3 business days)
  - the security questionnaire (fail signals block listing)
  - vulnerability scans
  - scope justifications and egress hosts
  - a reasonable price
- Review takes 1 to 3 weeks (sources disagree). A Dec 11 submission yields a ticket in time. **Do not promise a live listing link.**
- Brand rules for the listing and icon: [brand/README.md](../../brand/README.md#atlassian-partner-rules-that-affect-the-brand).

## Checklist

| Date | Item | Done |
| --- | --- | --- |
| Nov 14 | Partner profile created. Pricing decided (paid listing required for multi-app; check whether a free tier for small teams is allowed). | [ ] |
| Dec 1 | Privacy policy and support page (GitHub Pages), EULA, data-handling statement (no page bodies stored, LLM only on click) | [ ] |
| Dec 5 | Listing copy, **exactly 3 highlights** (each: title of 50 chars or fewer, summary of 220 or fewer, a 1840x900 screenshot, a 580x330 crop, a caption, and up to 5 extra screenshots), 144x144 logo, 1120x548 banner, tagline of 130 chars or fewer. Suggested highlights: badge + review panel, agents (Rovo chat + Claude Code), dashboard. Screenshots must show the app in the Atlassian UI. | [ ] |
| Dec 8 | Security self-assessment answers, data residency notes, scope justification. Production deploy of the core app. | [ ] |
| Dec 11 | Submit the listing, save the review ticket link. Bitbucket relay: informational listing (optional). | [ ] |
| Dec 12 | Judge-copy app registered, deployed, share link tested on a clean site | [ ] |

## Listing assets

- Name: Doc Drift Sentinel for Confluence (60 chars max; never lead with a product name; avoid "app", "plugin", "add-on", "beta"). The relay can be "Doc Drift Sentinel Relay for Bitbucket".
- Legal: privacy policy (required), EULA (Atlassian template is fine), DPA if personal data is processed, a documentation link, a support contact, and a personal-data reporting and erasure flow.
- Logo: 144 x 144 px PNG exported from [brand/logos/doc-drift-icon.svg](../../brand/logos/doc-drift-icon.svg)
- Summary: "Flags pages when the code or Jira work they describe changes, and tells agents which pages to trust."
- Categories (draft): Documentation, Developer tools, Rovo agents
- Vendor: [Partner name] (to decide)
