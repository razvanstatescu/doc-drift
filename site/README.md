# Website

The public site for Doc Drift (D36; v2 on 2026-11-20, D42), published to GitHub Pages by [../.github/workflows/pages.yml](../.github/workflows/pages.yml) on every push to `main` that touches `site/`.

| File | What |
| --- | --- |
| `index.html` | Home, v2 ([../docs/website/plan.md](../docs/website/plan.md)): hero loop, the 3 a.m. problem, the turn, how it works (a pinned board and the real recording), AI agents, in Confluence, trust, get started, questions, closing |
| `docs.html` | Setup guide, the home of every technical detail: a quick start box, install, Jira, Bitbucket relay, demo replay, anchors, when a page is flagged (the matcher's real rules, Strict and Quiet folded away), review, states, dashboard, settings, who can do what, MCP, Rovo, troubleshooting (an accordion), support |
| `privacy.html` | Privacy and data handling: an "In short" box, then what is read, stored and for how long, AI use, who sees what, permissions (scopes), deletion, and this website (GitHub Pages, no analytics or cookies) |
| `404.html` | Not found. Uses absolute `/doc-drift/` paths because GitHub Pages serves it from any depth; change them if the site moves to a custom domain |
| `assets/site.css` | Shared styles. Tokens copied from [../brand/tokens.json](../brand/tokens.json): Day (light) by default, Night shift on toggle (Razvan, 2026-11-13) |
| `assets/home.css` | Home-only styles, loaded after `site.css`: the product twins, the two Night panels (inset, rounded, no fades into the page), the pinned board, reveals and the scroll-linked slip |
| `assets/site.js` | Theme toggle (with a view-transition crossfade), mobile menu, tabs, copy buttons, table of contents. `CONFIG` at the top holds the install link and video URL |
| `assets/home.js` | Home only: the hero loop and its Pause button, the pinned board, reveals, typing, the agents switch and the recording player. No libraries and no scroll listeners |
| `assets/media/merge-to-flag.mp4` | The real recording on the home page: 9.9 s, 1080p, muted, about 960 KB, cut from film v5 at 38.3 to 48.2 s (`ffmpeg -ss 38.3 -to 48.2 … -crf 25`), with `merge-to-flag-poster.jpg` (the flagged frame at 47.6 s) as its poster |
| `assets/media/rovo-answer.jpg` | The real Drift Reviewer answer in Rovo (demo site, Nov 13), 720 x 737, shown in the home page's agents section |
| `assets/icons.svg` | Icon sprite (1.75 px strokes on a 20 px grid). `index.html` inlines the same symbols |
| `assets/doc-drift-*.svg` | The logo files from [../brand/logos/](../brand/logos/) with the C2PA metadata stripped (4 KB instead of 12 KB) |
| `assets/social-card.png` | 1200 x 630 Open Graph image. Source: [../brand/social-card/social-card.html](../brand/social-card/social-card.html); render with `node scripts/site/render-social-card.mjs` (Node 24) |

## Preview

```bash
cd site && python3 -m http.server 4173
```

Open http://localhost:4173/. Everything works from the file system except the 404 page's absolute paths.

## Before it goes live

1. GitHub Pages from a private repository needs a paid GitHub plan. Either upgrade, or wait until the repository opens on Dec 19. Then: repository **Settings**, **Pages**, **Source: GitHub Actions**. The URL will be https://razvanstatescu.github.io/doc-drift/. While the repository is private, pushes skip the deploy job; run the **Website** workflow by hand to publish anyway.
2. When the production share link exists, set `CONFIG.installUrl` in `assets/site.js`. Every "Install for Confluence" button then opens it, and the "shared with judges first" notes hide. Until then the buttons open the setup guide's install section.
3. When the film is public, set `CONFIG.videoUrl` to show the "Watch the film (1:49)" buttons.
4. The GitHub links (support, source) work once the repository is public.

## Rules for editing

- Copy follows [../brand/voice-and-copy.md](../brand/voice-and-copy.md): sentence case, digits, no exclamation marks or emoji, state names with a word and an icon, "Doc Drift" in full on first use, never "DocDrift" or "DDS".
- **The home page is marketing; the guide is the reference** (D42). Keep the home page to about 800 words of copy in plain words (the film's: "links", "flags", "it may be out of date", "Rovo, Atlassian's AI", "MCP, an open standard for AI tools"). No JSON, tool names, globs, scores or setup commands there; they belong in `docs.html`. Cards stay at about 15 words.
- Every UI string in the home page's product twins is the app's real string (`apps/core/src/lib/copy.ts`, `apps/core/src/frontend/shared/copy.ts`, the frontend `.jsx`). The agent lines are the real `guidance` and the captured Drift Reviewer answer ([../docs/website/R2-accuracy-audit.md](../docs/website/R2-accuracy-audit.md), "Live output"). Sample names (Dana, Sam) and sample numbers are labelled.
- One beacon (amber) per view, including during the hero loop and the recording. Primary buttons fill with the text colour.
- Motion (D42): the slip leads; reveals play once, on section heads and visuals only; anything that moves on its own for more than 5 s has a pause button and stops off screen; with reduced motion every visual shows its final state; plain CSS and JS, no libraries, no scroll listeners.
- `privacy.html` must stay true to [../docs/architecture/trust-safety.md](../docs/architecture/trust-safety.md) and the schema in `apps/core/src/lib/db.ts`. When storage, scopes or AI use change, update both.
- The MCP URL and the CLAUDE.md block in `docs.html` are copies of `MCP_URL` and `AGENT_INSTRUCTION` in `apps/core/src/frontend/shared/copy.ts`.

## Checked (2026-11-20, v2)

- axe-core 4.10 (WCAG 2 A and AA, best practices): no violations on all four pages, in both themes, at 1440 and 390 px.
- No horizontal scroll at 360, 390, 768, 1024 and 1440 px, in both themes; no console errors (the 404 page's absolute paths fail only on a local server).
- One amber per view at every scroll position (checked every 150 px at six width and theme pairs).
- Reduced motion and no JS: every section reads in full; the hero holds the flagged state and the recording shows its poster with a Play button.
- Internal links and anchors resolve. Research, plan and test records: [../docs/website/](../docs/website/).
