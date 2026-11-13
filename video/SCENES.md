# Shot list: Doc Drift Sentinel launch video v1

The director's shot-by-shot direction. Read with [BRIEF.md](BRIEF.md) (decisions, script, rules) and the kit's README.
Timings are written against narration cues (`V07` = the frame V07 starts, `V07+` = just after it ends); the real frames
come from `src/data/timeline.json`. Builders may improve a shot; they may not change a word of the script, a claim, or a
rule in the brief. When a shot is unclear, choose the calmer option.

## Global

- **Grid**: 120 BPM at 30 fps. Cuts land on beats (every 15 frames from the scene's bar line); big moments on bar lines.
- **Safe area**: key content inside x 192–1728, y 108–972. Type: statements 96–140 px Spline Sans 600, tracking −1.5%;
  supporting lines 44–56 px; mono literals ≥ 40 px.
- **Worlds**: Night = ground `#072630`, surface `#0E3D48`, sunk `#05191F`, text `#F2F6F7`, muted `#9DB8BE`.
  Day = ground `#F2F6F7`, surface `#FFFFFF`, sunk `#E8EEEF`, text `#072630`, muted `#4A6670`.
  Amber `#FFB224` fill with `#072630` text; amber as text on Day `#8A5300`. One amber element per shot.
- **States** always as the brand badge (word + icon): Verified (green), Possibly stale (amber fill), Stale (red), Unanchored.
- **Real UI** sits in `BrowserFrame` at about 1500–1640 px wide on the Day ground, never full-bleed, never tilted
  more than 6°. Punch-ins go to the detail the narration names, land on its first word, then hold still.
- **Cursor**: drawn by the kit, on the capture's recorded click points; moves 10–14 frames between targets; click pulse
  on the frame the real UI changes.
- **Effects**: placed with `<Sfx>`; `slip` and `snap` are reserved for state changes of a page (Possibly stale and
  Verified). Whooshes peak on the cut frame. Keep effects 6 dB under the voice.

## A0 · Cold open (Night) · builder: cold open

| When | Picture | Sound |
| --- | --- | --- |
| f0–59, bar 1 | Black. Caption locked top-centre: **The code moved.** Frame 0 is our own diff card (sunk surface, mono): `- scripts/rollback.sh` / `+ scripts/rollback-v2.sh` with a small "Merged" tag. Then the wall of bar-1 plates from `plates.json` (`bar: 1`), Satchel-style: 3D wall and tunnel, whips, punch-ins on key phrases, glitch only on cut frames. | M0 bed bar 1 (sparse), cold hit on f0, ticks |
| f60–119, bar 2 | Caption **The docs didn't.** Bar-2 plates; the hero hold is Wikimedia's "Documentation was outdated for jobrunner, dsh, and salt" (licensed; at least 24 clean frames). | The real voice (Ariel) starts near f60 and carries over bar 3; nothing else voiced under her words; bed and hits ducked 8–12 dB under her |
| f120–179, bar 3 | Caption **The agents can't tell.** Bar-3 plates accelerate (Atlassian Community and tracker items, the arXiv titles, the survey row). The last slam is Atlassian's own line: "AI agents are only as good as what they know. Right now, most don't know enough." (held ≥ 18 clean frames). f173–179 everything is sucked to the centre. | Riser into a dead stop on f180 |
| f180–194 | True black. | Digital silence |
| V00 | **That's why we built Doc Drift Sentinel.** set centre, white, 96–110 px. | V00, dry |
| V00+ to R | The title clears. On the Night ground the flat mark builds large (≈ 360 px): the top and bottom bands land on their grid lines (two soft ticks); the trace sits faintly between them. | ticks |
| **R** | The middle band slides in from the trace position to its slipped position in amber, with a soft glow. The film's signature moment. | `slip` + the score's first downbeat |
| R → R+120 | The mark settles into the horizontal lockup (mark + "Doc Drift Sentinel"); the tagline sets below: **Docs that know when the code moved.** Hold. | V01; score title swell |
| out | Hard cut on the bar into A1's alert. | `alert` begins on A1's first frame |

Rules: third-party plates show their source and date while on screen (a small chip is fine where the crop lost it);
no amber anywhere in the barrage; flash check must pass (≤ 3 flashes per second; grade light pages down as Satchel did).

## A1 · The problem, 3 a.m. (Night) · builder: story

All mocks are ours: generic, unbranded, never shaped like Slack, PagerDuty, incident.io or any real product. Use the
runbook's real wording from `captures.json` → `runbookText` (fall back to the seed text in
`demo/seed/confluence/` if the capture has not landed yet).

| Cue | Picture | Sound |
| --- | --- | --- |
| V02 | A large mono clock **03:07** sets; the generic alert card lands (Night surface, a red `SEV-2` pill in the Stale colour, "payments-api", "Error rate 14%", "Triggered 03:07"). Gentle drift. | `alert` (3 tones), low pulse |
| V03 | Whip to a generic wiki page (Night surface): title "Payments rollback runbook", byline, numbered steps. Punch in on step 2: `./scripts/rollback.sh` (exact runbook text). | whoosh-short on the cut |
| V04 | A terminal slides up: the command from step 2, then `zsh: no such file or directory: ./scripts/rollback.sh`. A ghost diff appears beside it: `scripts/rollback.sh → scripts/rollback-v2.sh` · merged 6 days ago, the new path in amber (the one amber), slipped one unit right of the old one. | `type-burst`, `error-blip` |
| V05 | Back on the page byline: "Reviewed 34 days ago" with a check. Then the statement card **A date can't see a merge.** (big type, holds still). | tick |
| V06 | A generic assistant panel: a question bubble "How do I roll back payments-api?", then a confident answer that repeats step 2 (the old command) with a source chip "Payments rollback runbook". Hold on it. | `type-key` ticks while it streams |
| out (A2's first frame) | **The Day slip cut**: the frame splits into three bands, the middle band slides right and the Paper world is behind it. The film's big change of light. | score lift exactly on the frame; `slip` |

## A2 · The solution (Day) · builder: story

The page is drawn as the brand's three bands: a page has sections, each band is a section. This ties the logo, the idea
and the product together.

| Cue | Picture | Sound |
| --- | --- | --- |
| V07 | Centre-left: a page card ("Payments rollback runbook") whose body is three horizontal bands. Hairlines draw from each band to chips on the right: `payments-api: scripts/rollback.sh`, `payments-api: deploy/helm/**`, `PAY-142` (Jira). Small heading above the chips: Anchors. | ticks as each line lands |
| V08 | The `scripts/rollback.sh` chip changes (old path out, `scripts/rollback-v2.sh` in); its line pulses; the matching band slips right in amber with its trace; the page header gains the **Possibly stale** badge. | `slip` on the band |
| V09 | From the badge, two lines run to two chips: "Drift Reviewer · Rovo" and "Coding agent · MCP", each answering `status: possibly_stale` (mono). | soft pops |
| V10 | Clear to the spine: **Anchor. Flag. Tell the agents. Then a person decides.** set phrase by phrase, each with its icon (anchor, slip, agent, check). Small line below: For teams who keep runbooks in Confluence. | a tick per phrase |
| out | Whip into P1's browser frame. | whoosh |

## P1 · Anchor (Day, real) · builder: product

| Cue | Picture | Sound |
| --- | --- | --- |
| V11 | Real runbook in `BrowserFrame`; punch toward the byline badge reading Unanchored; cursor to the badge, click; the real modal opens on Anchors; magnify the suggestions (`payments-api: scripts/rollback.sh` must be legible); the cursor ticks them. | click, ticks |
| V12 | Cursor to "Save anchors and mark verified", click; cut to the badge reading Verified (punch-in). Then a 1-second inset of the dashboard's "Anchor this space" table. | click, `chime-soft` |

## P2 · Flag (Day, real) · builder: product

| Cue | Picture | Sound |
| --- | --- | --- |
| V13 | Whip to the real Bitbucket PR #482 page; punch in on the title and the renamed file; cursor clicks Merge; merged state. | `merge` |
| V14 | A mono timer counts the real measured seconds (`captures.json` → `measured.mergeToFlagSeconds`), compressed in time but showing the real number; whip to the runbook: the badge now reads **Possibly stale** (the one amber), punch in; the real tooltip naming PR #482. | `clock-tick` on the count, `slip` on the badge |
| V15 | Statement card: **No AI made that call.** with **Deterministic matcher · 0 AI calls** and small: Our eval set: 40 scenarios, 0 false flags, 2 known misses. | hit-soft |

## P3 · Agents (Day, real) · builder: product

| Cue | Picture | Sound |
| --- | --- | --- |
| V16 | Real Rovo chat with Drift Reviewer; the question "How do I roll back payments-api?" appears (from the recording, or typed over the still). | type-key |
| V17 | The real answer; punch in on "Possibly stale" and on the reason (PR #482). | tick |
| V18 | A terminal panel on the Day ground, built from `captures.json` → `toolOutput`: a prompt line calling `find-docs-for-path` (payments-api, scripts/rollback.sh) and its real result lines (the runbook marked `possibly_stale`), then `check-page-freshness` and the real `status`, `openDrift` ref and `guidance` text. Show real values only; trim long JSON with an ellipsis line, never reword. Small line: Agents read as you. They never edit a page. | type-burst |

## P4 · Review (Day, real) · builder: product

| Cue | Picture | Sound |
| --- | --- | --- |
| V19 | The real footer comment that mentions the owner (punch in); cursor clicks the badge; the review panel opens. | click |
| V20 | Magnify the why sentence and the rename quick fix (`rollback.sh → rollback-v2.sh`, "No AI used"); cursor clicks it. | click |
| V21 | The real draft diff for the timeout variable; cursor clicks Accept fix; the page history line "Doc Drift: accepted proposal for PR #482". | click, merge |
| V22 | **Snap back**: the badge goes from Possibly stale to Verified (overlay the brand snap: the amber band slides back into line and the glow fades); a small terminal line returns `Safe to cite.` from `toolOutput.checkVerified`. | `snap` |

## P5 · Scale (Day, real) · builder: product

| Cue | Picture | Sound |
| --- | --- | --- |
| V23 | Four quick real shots on beats: the Jira epic moving to Won't Do; the page flagged with that Jira change; the Drift dashboard (label: sample data from the demo space); Track in Jira creating a task. | tick per cut |

## A4 · Close (Night) · builder: story

| Cue | Picture | Sound |
| --- | --- | --- |
| V24 | Back to 3 a.m.: the same alert card, but the runbook now carries the amber **Possibly stale** badge above step 2, and the assistant answers with the caveat ("The runbook is Possibly stale: PR #482 renamed `scripts/rollback.sh` after it was last verified.") instead of the old step. | low pulse returns, then lifts |
| V25 | The mark lands again as in A0 (bookend): lockup, then **Catch the slip before your agents do.** Small, below: Built on Atlassian Forge for Codegeist 2026 · Nano Soft. Hold to the end; fade to black over the last 15 frames. | `endHit` on the slip, ring-out |
