# Website

The public site for Doc Drift Sentinel (D36), published to GitHub Pages by [../.github/workflows/pages.yml](../.github/workflows/pages.yml) on every push to `main` that touches `site/`.

| File | What |
| --- | --- |
| `index.html` | Home: hero with the live badge demo, problem, how it works, features in Confluence, agents and MCP setup, trust, get started, questions |
| `docs.html` | Setup guide: install, Jira, Bitbucket relay, demo replay, anchors, review panel, dashboard, settings, MCP, Rovo, states, troubleshooting, support |
| `privacy.html` | Privacy and data handling: what is read, stored and for how long, AI use, permissions (scopes), deletion |
| `404.html` | Not found. Uses absolute `/doc-drift/` paths because GitHub Pages serves it from any depth; change them if the site moves to a custom domain |
| `assets/site.css` | All styles. Tokens copied from [../brand/tokens.json](../brand/tokens.json): Day (light) by default, Night shift on toggle (Razvan, 2026-11-13) |
| `assets/site.js` | Theme toggle, mobile menu, tabs, copy buttons, the hero demo, table of contents. `CONFIG` at the top holds the install link and video URL |
| `assets/icons.svg` | Icon sprite (1.75 px strokes on a 20 px grid). `index.html` inlines the same symbols |
| `assets/doc-drift-*.svg` | The logo files from [../brand/logos/](../brand/logos/) with the C2PA metadata stripped (4 KB instead of 12 KB) |
| `assets/social-card.png` | 1200 x 630 Open Graph image |

## Preview

```bash
cd site && python3 -m http.server 4173
```

Open http://localhost:4173/. Everything works from the file system except the 404 page's absolute paths.

## Before it goes live

1. GitHub Pages from a private repository needs a paid GitHub plan. Either upgrade, or wait until the repository opens on Dec 19. Then: repository **Settings**, **Pages**, **Source: GitHub Actions**. The URL will be https://razvanstatescu.github.io/doc-drift/. While the repository is private, pushes skip the deploy job; run the **Website** workflow by hand to publish anyway.
2. When the production share link exists, set `CONFIG.installUrl` in `assets/site.js`. Every "Install for Confluence" button then opens it, and the "shared with judges first" notes hide. Until then the buttons open the setup guide's install section.
3. When the demo video is public, set `CONFIG.videoUrl` to show the "Watch the demo" button.
4. The GitHub links (support, source) work once the repository is public.

## Rules for editing

- Copy follows [../brand/voice-and-copy.md](../brand/voice-and-copy.md): sentence case, digits, no exclamation marks or emoji, state names with a word and an icon, "Doc Drift Sentinel" in full on first use, never "DocDrift" or "DDS".
- One beacon (amber) per view. Primary buttons fill with the text colour.
- No invented numbers. The agent examples on the home page are real tool output from the PLAT demo space (Nov 13); the hero and the `check-page-freshness` example show the demo replay of PR #482 and say so.
- `privacy.html` must stay true to [../docs/architecture/trust-safety.md](../docs/architecture/trust-safety.md) and the schema in `apps/core/src/lib/db.ts`. When storage, scopes or AI use change, update both.
- The MCP URL and the CLAUDE.md block are copies of `MCP_URL` and `AGENT_INSTRUCTION` in `apps/core/src/frontend/shared/copy.ts`.

## Checked (2026-11-13)

- axe-core 4.10 (WCAG 2 A and AA, best practices): no violations on all four pages in both themes.
- No horizontal scroll at 360 and 390 px wide; the hero demo, tabs, copy buttons and theme toggle work.
- Internal links and anchors resolve.
