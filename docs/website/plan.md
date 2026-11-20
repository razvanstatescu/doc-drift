# Website v2: plan

Status: built 2026-11-20 (D42). Copy follows R2 (accuracy audit), layout and motion follow R1 (reference sites), and three rounds of fixes followed two visitor tests (visitor-test/round1 and round2 SUMMARY.md). Where this plan and the shipped page differ, the page and the visitor-test summaries are current.

R1 changed six things in the first draft:
1. The hero body is cut to 20 words, and the proof row moves under the hero picture. The median hero on the 12 sites is 20 words.
2. The agents section becomes one answer with a "Without Doc Drift / With Doc Drift" switch, as on incident.io and Cloudflare, instead of two cards.
3. Reveals apply only to section heads and visuals, not every paragraph.
4. The real recording is in: `assets/media/merge-to-flag.mp4` is 9.9 s, 456 KB, cut from film v5 at 38.3 to 48.2 s, with the poster `merge-to-flag-poster.jpg`. It plays muted and only while in view. It never autoplays with reduced motion, and it has a pause button.
5. The film sits behind a click: "Watch the film (1:49)" appears only once `CONFIG.videoUrl` is set.
6. The motion is plain CSS and JS, with no library. It animates only opacity, translate and scale, and uses no scroll listeners. Scroll-driven CSS is an optional extra, and the fallback is the end state.

## Why

Razvan, 2026-11-20: "check all section first of all for accuracy regarding the product. Then, make sure all information is presented in a clear, succint way for a marketing website. No technical details everywhere, no long texts that make user lose attention, nice animated visuals, nice transitions between sections, good UI/UX."

The v1 home page (D36, 2026-11-13) reads like documentation:
- It has 2134 words: Inside Confluence 514, Agents 646, FAQ 274.
- It carries JSON, terminal output, MCP commands and a CLAUDE.md block.
- Every section has the same ground and the same rhythm.
- Only the hero badge moves.

R2 found 20 inaccurate claims on it, 14 in the guide and 13 on the privacy page. The worst:
- The social card still says "Doc Drift Sentinel".
- The Jira and anchor rules are wrong.
- The MCP setup is wrong: there is one URL for every site, and one admin switch.
- The agent examples are out of date.
- The byline mock doesn't look like the real byline.

The launch film v5 found the plain story that first-time viewers understand by 0:25 (D41). The site tells the same story in the same words.

## Principles

1. **One story, the film's.** 3 a.m. problem, what Doc Drift is and for whom, link, change, flag, agents told, a person fixes it, Jira, get it. Same data as the film: PR #482 renames `scripts/rollback.sh` to `scripts/rollback-v2.sh` (and `ROLLBACK_TIMEOUT` to `ROLLBACK_TIMEOUT_SECS`); the Payments rollback runbook; merged and flagged on Nov 13.
2. **Plain words** (R2 "Plain language", V5.md section 2):

   | Instead of | Say |
   | --- | --- |
   | Anchor | Links the page to the files and Jira issues it names |
   | Deterministic matcher | No AI decides; same change, same result |
   | Byline badge | The label at the top of the page |
   | Coding agents | Coding assistants |
   | MCP | MCP, an open standard for AI tools |
   | Rovo | Rovo, Atlassian's AI |
   | Relay | A small Bitbucket app |
   | Possibly stale | Possibly stale: it may be out of date |
   | Space, drift debt | Each team's space, pages to review |

   No JSON, tool names, globs, scores or setup commands on the home page; they live in the setup guide.
3. **Short.** About 800 words on the home page, including the text inside visuals. Limits:

   | Block | Limit |
   | --- | --- |
   | Hero body | 30 words |
   | Section intro | 25 words |
   | Card | 15 words |
   | FAQ answer | 40 words |
4. **Show, then say.** Every section has a visual built in HTML and CSS from the app's real strings: twins of our own UI, as in the film. No stock imagery and no AI tropes (brand/README.md).
5. **Real strings only** (`apps/core/src/lib/copy.ts`, `apps/core/src/frontend/shared/copy.ts`; R2 "Live output"):

   | Where | Exact string |
   | --- | --- |
   | Byline title | `Verified · Doc Drift`, `Possibly stale · Doc Drift`, with the app icon (the real byline shows no state icon) |
   | Tooltip, Possibly stale | `PR #482 changed scripts/rollback.sh on Nov 13. Review.` |
   | Tooltip, Verified | `Verified on Nov 12. Watching 3 anchors.` (or with `1 anchor change since, none flagged.`) |
   | Agent guidance | `"Payments rollback runbook" is Possibly stale. Do not present steps from this page as current.` (shortened only by cutting whole sentences) |
   | Drift Reviewer | As captured: "Payments rollback runbook is Possibly stale. What it describes changed in PR #482 on 2026-11-13, after it was last verified. The affected section is "Steps"." |
   | Owner comment | `@Dana PR #482 (merged by Sam) changed 2 files this page documents. Review in the Doc Drift badge.` (sample names) |
6. **Motion with meaning.** The slip, the brand's one motion idea, leads every animation. Other motion follows scroll or plays once on entry, and stays calm.
   - With reduced motion, everything shows its final state.
   - Anything that loops for more than 5 s has a pause button (WCAG 2.2.2).
   - D42 records this widening of the brand's "nothing else moves on its own" for the website, as D39 did for the film.
7. **Brand rules hold.**
   - One amber per view, and amber only for drift.
   - Primary buttons fill with the text colour.
   - Sentence case, digits, no exclamation marks, no emoji.
   - Day is the default theme; Night shift is one click away.
   - No Atlassian blue near the logo.
   - Never say a page is wrong.
   - "Built on Atlassian Forge", never "Runs on Atlassian" (an Atlassian programme, D11).

## Home page: sections and copy

### Header

Logo · How it works · AI agents · Setup guide · Privacy · theme toggle · **Install for Confluence**

### 1. Hero (Day)

- Eyebrow: For teams with docs in Confluence
- H1: Docs that know when the code moved.
- Body: When the code or Jira work behind a Confluence page changes, Doc Drift flags it for people and AI agents.
- Buttons: Install for Confluence (primary) · See how it works · Watch the film (1:49), shown only when `CONFIG.videoUrl` is set
- Proof strip under the hero picture: No AI decides what's stale · Agents never edit pages · Respects page permissions

**Visual:** a loop of about 14 s, with a pause button. Reduced motion shows step 4, held.
1. The runbook page reads `Verified · Doc Drift`. Step 2 runs `./scripts/rollback.sh`.
2. A Bitbucket card slides in: "PR #482 merged · scripts/rollback.sh → scripts/rollback-v2.sh".
3. A link line draws from the card's file to step 2.
4. The label slips to `Possibly stale · Doc Drift` (amber), with the real tooltip.
5. A Night card appears: "Told to AI agents: Possibly stale. Do not present steps from this page as current."
6. A person clicks the one-click fix. Step 2 now runs `./scripts/rollback-v2.sh`, and the label slides back to `Verified · Doc Drift`.

### 2. The problem (Night band, dusk-to-dawn gradient edges)

- Clock: 03:07
- H2: It's 3 a.m. The runbook is a week behind the code.
- Terminal, typed on entry: `$ ./scripts/rollback.sh` then `zsh: no such file or directory: ./scripts/rollback.sh`
- Three beats (the film's S03 to S05):
  1. That script was renamed last week.
  2. The page's review date can't see a code change.
  3. And an AI assistant reads you the same old step.

### 3. The turn (dawn)

The struck-out path slides into the mark's middle band as the section scrolls in (the slip). Then:
- H2: Doc Drift catches this.
- Body: It watches the code and Jira work behind each page, and flags the page when they change.

### 4. How it works (desktop: pinned stage with 4 steps; mobile: stacked cards)

- H2: From merge to flag in seconds.
- Steps:

  | # | Step | Copy |
  | --- | --- | --- |
  | 1 | Link | Doc Drift suggests the files and Jira issues a page names. You confirm. |
  | 2 | Change | A pull request merges in Bitbucket, or a linked Jira issue is closed or re-planned. |
  | 3 | Flag | Seconds after a merge, the page reads Possibly stale and names the exact change. The owner is told. |
  | 4 | Check | A person reviews it. A renamed file is fixed in one click. The page is Verified again. |

- Note: No AI decides what's stale. Small edits don't flag a page; renames, removals and bigger changes do.
- Proof: the real recording in a framed player, tagged "Real recording · demo site, Nov 13".
  - Caption: "The merge in Bitbucket, then the page flagged 19 seconds later. The counter shows real time since the merge."
  - It has a pause/play button.

### 5. AI agents

- H2: AI agents check before they answer.
- Body: Our Rovo agent and coding assistants check Doc Drift before they rely on a page. If it may be out of date, they say so, and why.
- Visual: one conversation and a two-state switch, **Without Doc Drift** and **With Doc Drift**, defaulting to With.
  - The question is "How do I roll back payments?"
  - **Without:** the assistant presents the old step as current: "Run `./scripts/rollback.sh --timeout $ROLLBACK_TIMEOUT` from the payments-api repo." Its source tag reads "Payments rollback runbook".
  - **With:** the captured Drift Reviewer answer, and below it the real line told to coding assistants: "Possibly stale. Do not present steps from this page as current."
  - The answer types in once, in about 1.5 s. The switch crossfades in 200 ms.
- Facts:
  - In Rovo, Atlassian's AI, ask our agent, Drift Reviewer.
  - Coding assistants connect over MCP, an open standard for AI tools.
  - Agents never edit pages. People do.
- Link: Connect your coding assistant (guide, #mcp)

### 6. In Confluence (6 tiles: title plus one line, each with a small visual)

| Tile | Copy |
| --- | --- |
| A label at the top of the page | Verified, Possibly stale or Stale, with what changed in its tooltip. |
| What changed, and where | The pull request or Jira change, who made it, and the section it affects. |
| Fixes a person approves | A renamed file is fixed in one click, with no AI. Our agent drafts other edits; nothing changes until you accept. |
| Track it in Jira | Not fixing it today? Turn the flag into a Jira task. |
| Every space has a dashboard | Pages to review, ranked, with their owners. |
| The right people hear | A short page comment tells the owner and the author of the change. |

Also row (one line each): Follows renamed files · A revert clears its own flag · Learns from dismissals · Demo mode without Bitbucket

### 7. Trust

- H2: A person decides.
- Points:
  - **No AI decides what's stale.** Plain rules: same change, same result.
  - **Agents never edit pages.** Page text changes only when a person clicks to fix it.
  - **Respects permissions.** People and agents see only pages they can view.
  - **Built on Atlassian Forge.** No servers of ours in between.
- Link: How Doc Drift handles data

### 8. Get started

- H2: Three steps to your first flag.
- Steps:
  1. **Install.** A site admin installs Doc Drift in Confluence. Jira is optional.
  2. **Connect Bitbucket.** Add our small Bitbucket app to your workspace, or replay the demo first.
  3. **Link a page.** Accept the suggested links. Doc Drift watches them from then on.
- Buttons: Install for Confluence · Read the setup guide
- Note: The install link is shared with Codegeist 2026 judges first.

### 9. Questions

| Question | Answer |
| --- | --- |
| Does AI decide what's stale? | No. Plain rules compare what a change touched with what each page links to: same change, same result. AI runs only when someone chats with Drift Reviewer or asks it to draft a fix. |
| Will small edits flag my pages? | Usually not. Renames, removals and bigger changes to a linked file flag a page; a one-line tweak doesn't. Admins can make it stricter or quieter. |
| Which code hosts work? | Bitbucket Cloud today. GitHub and GitLab aren't supported yet. Jira issues work on their own, with no code host. |
| Do I need Rovo? | No. The label, the review, one-click fixes, Jira tasks, the dashboard and comments work without it. Drift Reviewer and drafted fixes need Rovo. |
| Will it edit my pages? | Only when a person clicks to fix one. The edit is a new page version under their name, so page history can undo it. |
| What about restricted pages? | Pages with view restrictions can't be watched yet. |
| What does it cost? | Doc Drift is free today. Chats with Drift Reviewer and drafted fixes may use Rovo credits on your site. |

### 10. Closing (Night)

- H2: Know which docs to trust.
- Body: Docs that agents can trust, because they know when to stop trusting them.
- Buttons as in the hero.

## Motion and transitions (confirmed with R1; recipes in R1 section 6)

- **Hero loop:**
  - It has a pause button with `aria-pressed`.
  - It pauses off-screen and when the tab is hidden.
  - With reduced motion, it doesn't autoplay: it shows the flagged state and a Play button.
- **Cross-page:** View Transitions (`@view-transition { navigation: auto; }`), keeping the header. The theme toggle crossfades through `startViewTransition`.
- **Reveals:** an IntersectionObserver adds `.is-in` to section heads and visuals only. They fade up 16 px over 500 ms ease-out, staggered 60 ms, once.
  - JS adds the `motion` class to the root, so without JS, everything stays visible.
- **Dusk and dawn:** the Night band's top and bottom edges are tall gradients. The tide lines move with scroll (parallax under 40 px), never on their own.
- **The turn:** scroll-linked. The struck-out path slides into the mark's middle band.
- **How it works:** a sticky stage. Each step's text switches the stage state as it crosses the middle of the viewport.
- **Agents:** typed once on entry.
- **Tiles:** each plays its micro-animation once on entry.
- **Reduced motion:** no transforms, final states at once, hero loop off.

## Files

- `site/index.html`: rewritten.
- `site/assets/home.css` and `site/assets/home.js`: new, home only.
- `site/assets/site.css` and `site/assets/site.js`: shared.
- docs.html and privacy.html: R2 fixes and an "In short" or "Quick start" box (separate agent).
- `assets/social-card.png`: remade with the name Doc Drift.
- site/README.md and D42 updated when done.

## Checks before it ships

- A pass with no violations on axe 4.10, both themes.
- No horizontal scroll at 360, 390, 768, 1024 and 1440 px.
- Links resolve.
- Reduced motion verified.
- Every claim traced to R2.
- Simulated first-time visitors (Jira-first manager, GitHub developer, Codegeist judge, Confluence platform lead): what it does and for whom from the hero alone, and what's unclear.
