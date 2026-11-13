# Production brief: Doc Drift Sentinel launch video (v1)

Every agent working on the film reads this first. The research and reasoning behind it is in
[../docs/video/research.md](../docs/video/research.md) (read sections 5, 6, 7 and 9) and its appendices. Brand: [../brand/](../brand/)
(README, tokens.json, logo.md, voice-and-copy.md). Where this brief and the research file disagree, **this brief wins**.

## 1. Decisions (locked 2026-11-13)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Third-party material in the cold open | **Real screenshots are allowed**, handled with care: short (most plates under 1 s), the source and date visible on or beside every plate, cropped to the headline or key sentence, words never changed, private individuals' names, handles and avatars blurred, no ads or article photos, no competitor promos (no Swimm, Mintlify, GitBook, Midori or other vendor pages in the barrage). Openly licensed and Atlassian-owned pages carry the long, hero holds. Every item is logged in `src/data/plates.json` and credited in `CREDITS.md`, so any plate can be swapped in minutes if the sponsor asks. Music, voice, effects and images are all generated on Razvan's paid ElevenLabs and OpenAI accounts. |
| 2 | Look | **Night for the problem**: the cold open, the logo reveal and act A1 (black and Fathom #072630 grounds; distortion allowed on third-party material only; the reveal is the mark landing on Night, like the app icon's own tile). **Day from A2 on**: the solution opens with a slip cut from the 3 a.m. scene into the Paper #F2F6F7 world (Fathom type, everything on a grid and still; the product is shown in Confluence's normal light UI). That slip cut is the film's big change of light. Exactly one amber element per shot. |
| 3 | Narrator | ElevenLabs `eleven_v4`, voice **Eric** (`cjVigY5qzO86Huf0OWal`) unless the audio agent's short audition finds a clear problem. One config value swaps it. |
| 4 | Real voice in the cold open | Mikey Ariel, "Docs or it didn't happen!", foss-north 2019 (CC BY): "Bad documentation or outdated documentation is worse than no documentation." Alternate: Addy Osmani (CC BY): "Quality context determines if agents succeed or fail." Audio is played unaltered apart from the trim. |
| 5 | Pull request number | The real merge on screen is **PR #482** in `nano-soft-dev/payments-api` (Razvan approved burning the counter with declined PRs). |
| 6 | People | No second account: everything on screen is under Razvan's account. The script says "a teammate" and "the page owner", never invented names. |
| 7 | Which install | **Development** on the demo site (production cannot share the site without wiping the demo data). Where the "(Development)" suffix shows, crop around it or cover it in the edit and log it in `captures.json`; production captures can replace these later. |
| 8 | Licences | Remotion Free License (company of one). ElevenLabs paid. |
| 9 | Length | About 2:30; 2:45 at most. |
| 10 | Coding agent | Shown as a real terminal session rebuilt from **real tool output**; the narration says "coding agents". No third-party logo. |
| 11 | Quotes from individuals | Allowed, with name and handle blurred, shown as "Hacker News comment, 2021" or the blog's name. |

## 2. Script v1 (locked text; on-screen notes are guidance)

TTS spellings: "3 a.m.", "rollback dot S H" (check how v4 reads `rollback.sh`), "M C P", "Rovo" (ROH-voh).

| ID | Scene | Narration | On screen |
| --- | --- | --- | --- |
| (clip) | A0 | Ariel: "Bad documentation or outdated documentation is worse than no documentation." | Barrage under 3 still captions: **The code moved.** / **The docs didn't.** / **The agents can't tell.** |
| V00 | A0 | That's why we built Doc Drift Sentinel. | Same words on black |
| V01 | A0 | Docs that know when the code moved. | On Night: the mark's bands land, the middle band slips into place in amber, lockup and tagline |
| V02 | A1 | It's 3 a.m. Payments is down. | Generic alert card (ours): SEV-2 · payments-api · error rate 14% · 03:07 |
| V03 | A1 | The runbook says to run rollback.sh. | Runbook step 2: `./scripts/rollback.sh` |
| V04 | A1 | That script was renamed last week. | Terminal: `no such file or directory: ./scripts/rollback.sh`; a diff ghosts in `rollback.sh → rollback-v2.sh` |
| V05 | A1 | The page still looks fine. It was reviewed a month ago. | "Last reviewed 34 days ago" with a tick; card **A date can't see a merge.** |
| V06 | A1 | Ask an AI agent, and it reads you the same step, with confidence. | Generic assistant answer quoting step 2, citing the runbook |
| V07 | A2 | Doc Drift Sentinel anchors each Confluence page to the code and Jira work it describes. | Page with anchor lines to the runbook's real anchors: `payments-api: scripts/rollback.sh`, `payments-api: deploy/helm/values.yaml`, `PAY-6` |
| V08 | A2 | When those change, the page is flagged: Possibly stale. | Three bands: the middle one slips amber; badge **Possibly stale** |
| V09 | A2 | And every agent that reads it is told the same. | Lines from the badge to a Rovo chip and a terminal chip: `status: possibly_stale` |
| V10 | A2 | Anchor. Flag. Tell the agents. Then a person decides. | The four phrases set one by one; small: For teams who keep runbooks in Confluence |
| V11 | P1 | Open any page. Doc Drift reads the paths and Jira keys already on it, and suggests anchors. | Real: badge Unanchored → Anchors tab, suggestions ticked |
| V12 | P1 | Save, and the page is Verified. | Real: "Save and mark verified" → badge Verified; 1 s of "Anchor this space" |
| V13 | P2 | Now a teammate merges a pull request that renames the rollback script. | Real: Bitbucket PR #482 → Merge |
| V14 | P2 | Seconds later, the runbook is flagged, with the exact change. | Timer showing the real measured 19 s; real: badge Possibly stale, tooltip "PR #482 changed deploy/helm/values.yaml on Nov 13. Review." (the PR changes both files) |
| V15 | P2 | No AI made that call. Same change, same result, every time. | Card: Deterministic matcher · 0 AI calls. Small: Our eval set: 40 scenarios, 0 false flags, 2 known misses |
| V16 | P3 | Ask Drift Reviewer, our Rovo agent, how to roll back. | Real: Rovo, Drift Reviewer, the question typed |
| V17 | P3 | It doesn't repeat the old step. It says the page is Possibly stale, and why. | Real: the answer, punched in on the state and the PR |
| V18 | P3 | Coding agents get the same signal over MCP: which pages cover a file, and which to trust. | Terminal from real output: `find-docs-for-path`, then `check-page-freshness` with `guidance`. Small: Agents read as you. They never edit a page. |
| V19 | P4 | The page owner gets one comment, and opens the review. | Real: footer comment; review panel opens |
| V20 | P4 | A rename gets a one-click fix, with no AI. | Real: why sentence, affected step, rename quick fix |
| V21 | P4 | For anything bigger, Drift Reviewer drafts the edit. Nothing changes until a person accepts. | Real: draft as a diff, Accept fix, page history "Doc Drift: accepted proposal for PR #482" |
| V22 | P4 | Verified. Now the agent can cite it. | Snap back; real: badge Verified; `guidance: "... Safe to cite."` |
| V23 | P5 | Jira changes count too. And every space gets a drift dashboard. | Real: Jira epic PAY-18 to Done flags ADR-015 (the PAY workflow has no Won't Do); the dashboard (sample data from the demo space); Track in Jira (created PAY-24) |
| V24 | A4 | Next time it's 3 a.m., the runbook tells you, and your agent, before step 2. | The alert again; the runbook with the amber badge; the agent's caveat |
| V25 | A4 | Doc Drift Sentinel. Catch the slip before your agents do. | Lockup, tagline. Small: Built on Atlassian Forge for Codegeist 2026 · Nano Soft |

Rules for every word on screen: never say a page is wrong (say out of date, stale, its anchors changed); state names keep
their capitals and always show a word and an icon (Verified, Possibly stale, Stale, Unanchored); "Doc Drift Sentinel" in
full on first use, never "DocDrift" or "DDS"; sentence case; digits; no exclamation marks; no emoji. Captions in the
barrage state problems only.

## 2b. Facts measured during the shoot (2026-11-13)

Merge to flag 19 s (byline written 18.6 s after the Merge click). Drift Reviewer's first answer called the runbook Possibly stale and named PR #482 and the rename. The demo site was restored afterwards (PLAT: 18 of 24 anchored, 5 Possibly stale). Details: `tools/capture/LOG.md`, `src/data/captures.json`.

## 3. Timing

- 1920x1080, **30 fps**, **120 BPM**: a beat is 15 frames, a bar 60. Cuts on beats, scene boundaries on bars.
- **A0 (cold open)**: barrage f0–179 (3 bars, on the M0 bed), black and digital silence from f180, V00 starts f195, the
  reveal frame **R** = V00's end + about 15 f (set by the audio agent, written to `markers.reveal`). The score starts on R
  and its bars run from R. V01 starts about R + 15. A0 ends at R + 120 (2 bars).
- Body scenes after A0, targets in bars (the audio agent sets the real lengths from the voice, on bars from R):
  A1 10 · A2 10–12 · P1 6 · P2 9 · P3 11 · P4 11 · P5 4 · A4 7–8. Total 145–165 s.
- Reading time for any text: `hold = 30 × max(0.8 + 0.25 × words, chars / 15)` frames, counted from when it is still.
- Every frame position comes from `src/data/timeline.json`. Scenes must re-time themselves from it (cue helpers in
  `src/lib/timeline.ts`), never from hard-coded film frames.

## 4. Files and owners

Agents write only in their own folders. Shared files have one owner; others read them.

| Path | Owner | What |
| --- | --- | --- |
| `package.json`, `remotion.config.ts`, `tsconfig.json`, `src/index.ts`, `src/Root.tsx`, `src/Main.tsx` | Kit agent | Project config and composition wiring. **Nobody else runs `npm install` here.** Need a package? Say so in your report |
| `src/brand/`, `src/lib/`, `src/motion/`, `src/components/`, `src/audio/` | Kit agent | The shared kit. Scene builders may add files under `src/components/<scene>/` only |
| `src/data/timeline.json`, `src/data/sfx.json`, `public/vo/`, `public/music/`, `public/sfx/`, `tools/audio/`, `tools/sfx/` | Audio agent | Voice, timeline, effects library, music |
| `src/data/plates.json`, `public/plates/`, `public/clips/`, `public/gen/`, `tools/plates/`, `tools/images/`, `CREDITS.md` | Evidence agent | Barrage plates, the real voice clip, generated images, credits |
| `src/data/captures.json`, `public/captures/`, `tools/capture/` | Capture agent | Product stills and recordings, real tool output |
| `src/scenes/<ID>/` | That scene's builder | One folder per scene: A0, A1, A2, P1, P2, P3, P4, P5, A4 |
| `tools/render-master.sh`, `tools/qa/`, `out/` | Kit agent builds; only the director runs full renders | |

## 5. Schemas

`src/data/timeline.json` (all frames absolute, film clock):
```json
{
  "fps": 30, "bpm": 120, "totalFrames": 4650,
  "markers": { "blackStart": 180, "v00": 195, "reveal": 270, "scoreStart": 270 },
  "scenes": [ { "id": "A0", "from": 0, "durationInFrames": 390 } ],
  "vo": [ { "id": "V00", "scene": "A0", "from": 195, "durationInFrames": 70, "file": "vo/V00.wav", "text": "...",
            "words": [ { "text": "That's", "from": 195, "to": 203 } ] } ],
  "music": [ { "id": "score", "file": "music/score.wav", "from": 270, "durationInFrames": 4380, "gainDb": -10 } ],
  "duck": [ [190, 260] ]
}
```
The cold open's own sound (the M0 bed, the real voice clip, hits, the suck-in and the silence) lives inside the A0 scene,
as in Satchel's `H0/Sound.tsx`. `timeline.json` covers V00 onward and the score. The global audio layer plays the
`vo` and `music` entries with ducking; scenes place their own effects with `<Sfx>`.

`src/data/sfx.json`: `{ "<id>": { "file": "sfx/<id>.wav", "durationInFrames": 12, "peakFrame": 3, "gainDb": -12, "desc": "..." } }`.
Place an effect so its **peak** lands on the frame you mean (`<Sfx id at={frame} />` handles the offset).

`src/data/plates.json`: `{ "plates": [ { "id", "kind": "real|quote|built", "file", "width", "height", "source",
"url", "date", "readOn", "text", "keyPhrases": [{ "text", "box": [x,y,w,h] }], "licence", "blurred": [...], "notes" } ] }`.

`src/data/captures.json`: `{ "captures": [ { "id", "file", "kind": "still|video", "width", "height", "fps",
"takenAt", "env": "development", "app": "core 5.4.0", "page", "shows", "clicks": [{ "x", "y", "label", "atMs" }],
"masks": [{ "box": [x,y,w,h], "why" }], "notes" } ], "toolOutput": { ... }, "measured": { "mergeToFlagSeconds": 11 } }`.
Coordinates in capture pixels (2x of CSS).

## 6. Rules for everyone

- **Node 24 only**: every shell command starts with `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ...`.
- **Keys**: `tools/lib/env.mjs` loads `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` from `video/.env`. Never print, log or
  commit a key, and never read the repo-root `.env` except the capture agent (Bitbucket and Atlassian credentials, loaded
  with `set -a; . ../.env; set +a` and never echoed).
- **Chrome**: the logged-in Chrome on CDP port 9222 (`$HOME/.chrome-doc-drift`) belongs to the **capture agent** only.
  The evidence agent runs its own Chrome with its own profile under the scratchpad on another port, through
  `playwright-core` (`chromium.launch({ channel: 'chrome' })` or `launchPersistentContext`). Nobody else touches Chrome.
- **Renders**: only `npx remotion still` (single frames) and short scene renders at `--scale=0.5` for checking. Full-film
  renders are for the director. Use `--port` 3500–3599 with a number unique to you; never 3000.
- **Spend**: ElevenLabs had about 14,800 credits left on 2026-11-13. The audio agent may use up to 8,000, the evidence
  agent up to 500 (Scribe checks). OpenAI images: up to $10 in total. Log every paid call in your tool's `gen-log.jsonl`.
- **Honesty**: never invent a quote, a post, a number or a product behaviour. Real product footage shows what the app
  really did. Covering the "(Development)" suffix is the only allowed retouch, and it is logged.
- **Brand**: tokens from `brand/tokens.json`; the logo only from `public/brand/` (exact artwork; in the mark, only the
  slipped band may move); Spline Sans for reading, Spline Sans Mono only for literals; one amber (`#FFB224`) element per
  shot; amber text on Day grounds uses `#8A5300`; primary buttons fill with the text colour; no Atlassian blue near the mark.
- **Photosensitivity**: no more than 3 flashes in any second (`tools/qa/flashcheck.py`).
- **Reports**: end with a short report (under 300 words): what you made, paths, what you verified, what is open.

## 7. Visual system (summary of research section 7)

- One idea: **everything is aligned, except the one thing that moved.** In the Day world exactly one element per shot is
  out of line, amber, and the shot is about catching it or putting it back.
- Signature moves: **slip** (a band slides right by 11.7% of its width, 180 ms ease-out, amber, with a 10% trace left
  behind) and **snap back** (240 ms, the glow fades). Slip cut between worlds: the frame splits into three bands, the middle
  band slides right and the next shot is behind it.
- Camera: punch-ins 1.0 → 1.3–1.8 (expo out) on the UI detail that matters, then still. Whips of 8–10 frames between
  surfaces (Bitbucket → Confluence → terminal). No bounce, no damping under 12.
- Type: Spline Sans 600, sets in over 12–18 frames, then holds perfectly still while read. Headlines ≥ 120 px, body
  ≥ 56 px, literals ≥ 40 px, inside the central 80% of the frame.
- Real UI sits in our own minimal frame (radius 24, `shadow-raise`), never Chrome's own UI, on the Paper ground.
- Distortion (RGB split, warp, slices, scanlines) only on third-party plates in the barrage, only on cut frames.
