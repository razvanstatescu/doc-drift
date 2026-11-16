# R2: the light (Day) film, style guide and style frames

Research for the v4 redesign of the launch film (2026-11-16). Razvan watched v3 and found it "boring and cheap" visually, and asked to try a light version that follows the brand book. This file defines how a Day film in our brand looks premium. Fifteen style frames, rendered in the existing Remotion project, test it. Brand sources: [brand/README.md](../../../brand/README.md), [brand/tokens.json](../../../brand/tokens.json), the design system https://claude.ai/artifact/MWaTaUbAyKQZ1qNyYzkLF6 and the brand canvas https://claude.ai/artifact/W6PzEst8WGEZLv82vH8bSr (interface kit and in-context boards). Every value below comes from those tokens. The few in-between values (a sweep stop, shadow alphas) are marked.

**The stills** are in `video/out/research-v4/r2/` (git-ignored like all of `video/out/`; regenerate them with the commands in section 13). Contact sheet: `0-contact.png`.

## 1. Recommendation and the five rules

**Cold open: go Day.** Show the evidence as paper: real pages as white sheets on the Paper sweep, the key phrase marked on the page, and Fathom captions. Keep the hard cut to true black at f180 for "That's why we built Doc Drift Sentinel". Keep Night only where it is literal: the 3 a.m. incident (A1, and A4's return to it). Everything else, including the end card, is Day. The reasons and the measurements are in section 11. If Razvan agrees, this replaces BRIEF decision 2 ("Night for the problem"). CLAUDE.md and the brand README still name Night shift as the primary look for our own surfaces, so a Day film needs his sign-off and an entry in [decisions.md](../../decisions.md), as D36 did for the website.

The five rules that matter most:

1. **The ground is lit, never flat.** Use the studio sweep (white at the light, through Paper, to surface-sunk at the corners) and put the light behind the subject. v3's single #F2F6F7 fill is the main reason it looked cheap.
2. **Every object has a height.** Use one light from above, shadows tinted Fathom, and the 5-step elevation scale (section 3). The hero object sits on a contact shadow. Things that float over it go one step higher. Dark objects go one step higher than their light neighbours.
3. **Craft the claim, prove it with a capture.** Explain each idea with a crafted object drawn from our interface kit. Then show the real capture small and confident: in a white mat, cropped to the proof, with an ink "Live in Confluence" label. A full-screen screen recording is the exception, not the shot.
4. **Everything square, except the slip.** Objects face the camera when they are read, on a faint 60 px grid. The only thing out of line is the one amber element, slipped one unit, with its trace left behind. A tilted hero (`2-hero-tilt.png`) looks like a stock mockup and breaks the brand's idea.
5. **Scale contrast, one focal point.** Each shot has one big thing: a 120 to 300 px statement or number, or one hero object. Everything else is small and precise: 26 to 30 px labels in text-muted and mono literals. Nothing medium-sized competes.

What made v3 look flat and cheap, frame by frame (`video/out/doc-drift-v3.mp4`):

- One flat Paper fill behind every Day shot: no light, and no depth cue beyond the frame's one soft shadow.
- The product shown as full-width screen recordings in a white frame. The screenshot is the shot, its 14 px UI text is the "type", and nothing is crafted around it.
- In the cold open, every real page graded down to grey (for flash safety) under a white caption. Grey, low-contrast evidence.
- A2's diagram drawn as flat dark rectangles with hairlines: the idea is right, but it has no material.
- Little scale contrast in the product shots: the capture's UI text at 20 to 30 px and supers at 44 to 56 px, with no big type beside them, so nothing feels big and nothing feels precise.

## 2. Grounds and surfaces (Day)

| Layer | Value | Use |
| --- | --- | --- |
| Sweep (the ground) | `radial-gradient(130% 95% at <light>, #FFFFFF 0%, #F7FAFA 26%, #F2F6F7 52%, #E8EEEF 100%)` | Every Day shot. Move the light point (default 50% 34%) toward the subject. #F7FAFA is an in-between stop of white and Paper |
| Surface | `surface` #FFFFFF | Cards, panels, real pages as sheets, the proof mat |
| Well | `surface-sunk` #E8EEEF | Code wells, chips, the user's chat bubble |
| Tinted well | `ground` #F2F6F7 inside white | The "Affected section" well, quiet groupings inside a panel |
| Trace | `trace` #0A2F3817 | Placeholder lines, a drifted token, a slipped element's home |
| Dark object | `fathom` #072630 (inner sunk #05191F) | The MCP terminal, ink labels, primary buttons. Only ever objects, never a ground |
| Edge | 1.5 px ring of Fathom at 6 to 7% | The outline of white on Paper. A light-grey border looks cheaper |
| Scrim behind a modal | the page blurred 8 px, `grayscale(1)`, 50% opacity | Depth of field. It also drains the page's own badge, so the shot keeps one amber |

The 70 / 25 / 5 proportion holds. Measured on the stills, amber covers 0% (cold open) to 1.05% (proof) of the frame. Ink (Fathom and text-muted) covers 1 to 5%, and 18% when the terminal is in shot.

## 3. Elevation and shadows

One light, straight above. Shadows are tinted with Fathom `rgba(7,38,48,a)`, never black or grey. Each level is an edge, a tight contact layer and one or two soft ambient layers. The scale is derived from the brand's `shadow-raise` (light): the same tint and direction, drawn at film size with more layers. The alphas are in-between values, tuned on the stills. Code: `ELEV` in `video/src/styleframes/look.ts`.

| Level | Use | box-shadow (film px) |
| --- | --- | --- |
| 0 ground | the sweep, the grid, tide lines | none |
| 1 rest | sheets lying on the ground, chips, unchanged anchors | `0 0 0 1.5px a.07, 0 1px 2px a.06, 0 4px 12px a.05` |
| 2 lift | cards, the event rows, texture pages in the cold open | `0 0 0 1.5px a.065, 0 2px 4px a.06, 0 12px 28px a.07, 0 32px 64px a.06` |
| 3 hero | the one hero object (the runbook card, the review panel, the answer card) | `0 0 0 1.5px a.06, 0 3px 6px a.06, 0 18px 40px a.08, 0 56px 112px a.11` |
| 4 float | over a hero: the breakout row, the proof mat, the subject page in the barrage | `0 0 0 1.5px a.06, 0 6px 12px a.08, 0 28px 56px a.12, 0 72px 144px a.15` |
| dark 1 to 4 | the terminal, ink labels | the same ladder at 0.12 to 0.22 alpha, plus `inset 0 1px 0 rgba(255,255,255,.08)` (a top-edge light) |

- **Contact shadow.** A soft ellipse on the ground, attached to the object's bottom edge (`Float` in `Stage.tsx`). The higher the lift, the wider, softer and fainter it gets. This one shadow does more for "premium" than any other device: it grounds the object in a lit space.
- **The slip's bloom.** A soft amber radial glow (beacon at 26%, fading to 0) under the one drifted element, on top of `shadow-glow`. It belongs to that element and is not a second amber. The brand's own tile does the same thing ("a soft amber glow centred on the slip").

## 4. Hairlines, radii, connectors

- **Dividers** inside white objects: 2 px `line` #D6E4E7 (1 px vanishes after YouTube's encode at 1080p).
- **Connectors** (anchors to the page): a changed anchor gets a 2.5 px Fathom curve. A watched, unchanged anchor gets a 2 px `current` dashed curve (7/7). Nodes are 6 px circles: white fill, same stroke. Lines leave from one node on the card's edge and never cross: order the chips by the height of their targets.
- **Radii at film size** (UI radius × k, with k ≈ 1.6 to 2): chips and buttons 13 to 16, cards and event rows 20 to 28, panels and hero cards 35 to 40.
- **Concentric corners** (Apple's rule for layered shapes): a shape nested near a corner has radius = outer radius − inset. The proof mat is 26 outside, 14 mat, 12 inside.

## 5. Type for the film

Spline Sans 600 for statements, Spline Sans 500 for labels, Spline Sans Mono for literals only. Sentence case. Sizes are px at 1080p.

| Style | Size / line | Tracking | Use |
| --- | --- | --- | --- |
| Number | 300 / 300 (unit 120, text-muted) | −5% | One measured number per shot ("19 s"). Tabular figures |
| Display | 156 / 164 | −3% | Cold-open captions |
| Headline | 120 to 124 / 126 to 128 | −2.8% | Statements, the end-card tagline (2 lines, centred) |
| Title | 80 / 88 | −2% | A big card title in a designed shot |
| Lead | 44 / 56 | −1% | The rare supporting line |
| Label | 30 / 38 (26 minimum) | 0 | Eyebrows, source and proof labels, credits. text-muted, with an icon |
| UI in crafted objects | the UI ramp × 1.6 to 2 (body 15 → 27 to 30, title 27 → 49 to 54) | as UI | Never below 23 px on screen. Incidental UI may go smaller only if a label repeats the fact |
| Mono literal | 26 to 34 in UI, 40 or more as a subject | −1% | Paths, `PR #482` in chips, JSON |

Nothing must-read sits below 26 px. Captions hold perfectly still while read (BRIEF reading-time formula). Keep dates and paths whole (`white-space: nowrap`): never break `2026-11-13` or a path across lines.

## 6. Colour use and the single amber

- **One amber fill per shot.** It is always the drifted thing, and it always appears together with its trace and bloom. In the frames: none in the cold open (the reveal keeps the film's first amber pixel); the byline badge in the hero; the header badge in the review panel; the crafted badge in the proof shot; `"possibly_stale"` in the terminal in the agent shot; the mark's own slip on the end card.
- **The mark at avatar size** (64 px or less: the Drift Reviewer avatar, the panel header) keeps its slip and does not count. Never show the mark at hero size in a shot that already has a drift signal.
- **Real captures are exempt** (Confluence's 16 px app icon in the byline is amber). Crop so their amber stays incidental.
- **State colours** appear only in their badges and chips (High = `stale` on `stale-tint`, Medium = unanchored), and in diff tints.
- **`current` #22717E**: tide lines, connector dashes, the cold open's marker underline. Never text.
- **`mist` #D6E4E7**: the marker band behind a key phrase on a real page, drawn with `mix-blend-mode: multiply` so the words stay exactly as printed.
- **Primary buttons** fill with Fathom and carry Paper labels ("Mark verified"). They are the darkest thing in a light panel, so the eye still lands on the amber first.

## 7. Background motifs and how they move

Each motif has a job, and a shot uses at most one (Stripe's rule for its wave: the system says when the motif should "lead, support or disappear entirely").

| Motif | Look | Where | Motion |
| --- | --- | --- | --- |
| Grid (the aligned world) | 60 px squares (1080 / 18), 1 px Fathom at 4.5 to 5.5%, radial mask centred on the subject | Product and precision shots: hero, review, proof | Never moves on its own. It parallaxes at 0.5 under camera moves, so the slip visibly breaks it |
| Tide lines (the current) | 7 to 9 contour lines, 2 px, `current` at 20 to 30% on the centre line (outer lines about half), wavelength 520 to 640, amplitude 18 to 20, intersected edge masks | Brand and agent moments: the reveal, the agent shot, the end card. Lower third or behind hero art, never behind paragraphs | Drift 0.5 px per frame (15 px/s), each line phase-shifted, so it reads as water |
| Three bands | the mark's proportions (94 / 12 / 60 / 12 / 94) | Transitions only: the slip cut, the reveal | 6 f slip, then cut. Never wallpaper |
| The light | the sweep's light point | Every shot | Static per shot. It may follow the camera at 0.3 parallax |

**Not used:** grain (on light grounds it reads as dirt, and YouTube turns it into mush; add a 1 to 2% static dither only if the encode bands the sweep), light sweeps and sheen, lens flares, colour gradients, and blue-purple anything. Light comes from the ground and the shadows. The only thing that moves on its own is the slip.

## 8. Dark elements in a light film

- At most **one large dark object per shot**, at 35% of the frame or less: the terminal. Small dark accents are free: ink labels, a primary button, the tile.
- It sits **one elevation step higher** than its light neighbours, with a softer, wider shadow (`ELEV_DARK`) and a 1 px top-edge light. A dark slab on light with a light-sized shadow looks pasted on.
- **Radius 28**, at least the light cards' radius. Fathom #072630 body, a 66 px title bar with a 1.5 px `line` (night) divider, Night text colours (keys `link` #5FB3BF, strings `mist`, punctuation text-muted).
- It **overlaps** the light object it answers, over an empty corner (never over text), so the composition reads as layers in space, not two screenshots side by side (Grammarly's developer hero does this).
- Amber inside the terminal counts as the shot's one amber.

## 9. Real captures: framing and labels

- **The mat:** white, 14 px, outer radius 26, inner radius 12, elevation 4. The capture sits inside a 1.5 px Fathom 6% inner edge.
- **The crop proves the claim** and nothing else. For the flag: title, byline and tooltip (capture px 1440,300 to 2820,640 of `p2-flagged-tooltip`). Never cut through a line of text, and stop above the next block.
- **Size:** 45% of the frame width or less (860 px in the proof shot). On-screen capture text is 15 px or more; our own big type repeats the fact.
- **Label:** an ink chip (Fathom fill, Paper text, eye icon, 26 px) overlapping the mat's top-left corner: "Live in Confluence", "Live in Bitbucket", "Live in Rovo". Below the mat, a 26 px text-muted note: "Real capture, development install".
- **Masks** from `captures.json` are always drawn, with the fill of what they cover (`#F1F1F2` on the byline lozenge). Nothing else is retouched.
- **Rhyme the claim:** align the crafted element with its real counterpart. In the proof shot, the crafted badge row and the real byline sit at the same height (y 676).
- **Full-frame captures:** at most one in a row, 1500 to 1600 px wide in the same mat, with a push-in to the detail the narration names.

## 10. Motion rules for the Day film

- **Arrive by lifting, not fading.** An object rises from level 1 to its level over 12 to 15 f (expo out). Its shadow grows and its contact shadow widens. Fades only on the first and last frames.
- **Read square, move tilted.** Tilt of 6° or less only while the camera travels. Land square before the first word is read.
- **Camera:** push-ins of 1.0 to 1.15 (hero) and up to 1.8 on a capture detail (expo out, 18 to 24 f), then still. Parallax by layer: light 0.3, grid 0.5, objects 1.0, floats 1.1 to 1.15.
- **Rack focus** from page to panel: the page blurs 0 to 8 px and drains to grey over 10 f as the panel lifts in front of it.
- **Breakout:** the row that matters lifts out of its panel (scale 1.07, a slight move outward, level 4) over 10 f and holds.
- **The slip:** 6 f, 11.7% of the element's width, trace left behind, glow and bloom up. Snap back: 8 f, the bloom fades.
- **Cold open in Day:** whips slide across sheets on one paper plane. Punch-ins land on the marked phrase. Texture pages blur 3 px and wash 50% toward white. The subject page is sharp and floats at level 4. The f180 cut to true black is the film's biggest change of light.
- **Flash safety still applies.** On the three Day stills the whole-frame relative luminance is 0.835 to 0.847, so cuts from page to page barely move it (the Night stills sit at 0.063 to 0.069, pages graded against black). But 28 to 30% of the 341 × 256 windows under the caption fall below 0.8, so a fast alternation between text-dense and blank areas can still count as flashes. Keep v3's one-footprint slams and run `tools/qa/flashcheck.py` on the rebuilt A0.

## 11. The cold open: Day vs Night

Same plates, crops and positions in both. Only the material changes. Side by side: `1-cold-open-bar1-compare.png`, `1-cold-open-bar2-compare.png`, `1-cold-open-bar3-compare.png`. Full size: `1-cold-open-bar{1,2,3}-day.png` and `-night.png`.

- **Day is crisper and reads at once.** Real pages stay white, with their own ink and colours, lifted by shadows. Night has to grade every page to brightness 0.6 and dim it around the sentence, which turns the evidence grey and muddy. That grey is much of what read as cheap.
- **Day matches the ask.** It is what Razvan asked for, the website has opened in Day since D36, and the brand's interface kit board is drawn on Day.
- **Day makes the turn stronger.** A bright barrage cut to true black and silence at f180 is a bigger, cleaner drop than grey-on-black to black. The Night tile and its amber slip landing on black remain the reveal.
- **Day is easier on flashes at whole-frame level** (section 10). Window-level care stays the same.
- **The cost:** the problem act loses some ominous tone. The music, the cuts and the captions carry the tension, and Night returns for 3 a.m., where it is literal. Light pattern of the film: Day (the evidence), black (the turn), Night (the reveal and the 3 a.m. incident), the slip cut into Day (the product), Night again for A4's return to 3 a.m., and a last slip into Day for the end card.

## 12. Applying it scene by scene

| Scene | Ground and motif | Hero object | Proof insert | The one amber |
| --- | --- | --- | --- | --- |
| A0 cold open | Day sweep, pages as paper; cut to true black; the reveal on black, then Night | The marked phrase on each subject page; then the mark | Every page carries its source chip | None until the reveal's slip |
| A1 3 a.m. | Night (literal), unchanged from v3 | The alert card, the runbook, the terminal error | None | The new path in the ghost diff |
| A1 to A2 | The Day slip cut (three bands) | | | The slipping band |
| A2 solution | Day, grid | The crafted runbook card with anchors as chips (`2-hero.png`) | None: this is the idea | The badge |
| P1 anchor | Day, grid | The crafted card gaining anchors | "Live in Confluence": the real Anchors tab, ticked suggestions | None, or Verified only |
| P2 flag | Day, grid | "19 s" and Merged, an arrow, the badge (`4-proof.png`) | The real byline and tooltip; "Live in Bitbucket" for the merge | The badge |
| P3 agents | Day, tide lines | The answer card and the terminal (`5-agent.png`) | "Live in Rovo": the real answer crop | `"possibly_stale"` |
| P4 review | Day, grid, the page racked out of focus | The crafted review panel (`3-review.png`), then the snap back to Verified | The real page history line "Doc Drift: accepted proposal for PR #482" | The header badge until the snap |
| P5 scale | Day, grid | Four quick crafted cards (Jira, dashboard, track) | One real capture each, small | One per cut |
| A4 close | Night at 3 a.m., then a last slip into Day | The end card (`6-end.png`) | None | The mark's slip |

## 13. The style frames

Composition `StyleFrames` (Dev folder), one page per 60 frames, settled at local frame 40. Code: `video/src/styleframes/` (`look.ts` tokens and elevation, `Stage.tsx` ground, grid, tide lines, contact shadows and ink labels, `Crafted.tsx` page card, badge slip and chips, `ReviewPanel.tsx`, `ColdOpen.tsx`, `Frames.tsx`). It is registered with one line in `video/src/Root.tsx`. Render one: `npx remotion still src/index.ts StyleFrames out/research-v4/r2/<name>.png --frame=<page × 60 + 40> --port=3560` (from `video/`, Node 24).

| Still | Frame |
| --- | --- |
| `1-cold-open-bar1-day.png` / `-night.png` / `-compare.png` | 40 / 100 / 400 |
| `1-cold-open-bar2-day.png` / `-night.png` / `-compare.png` | 160 / 220 / 460 |
| `1-cold-open-bar3-day.png` / `-night.png` / `-compare.png` | 280 / 340 / 520 |
| `2-hero.png`, `2-hero-tilt.png` (the rejected variant) | 580, 640 |
| `3-review.png` | 700 |
| `4-proof.png` | 760 |
| `5-agent.png` | 820 |
| `6-end.png` | 880 |

**1. The cold open (Day).** The caption is 156 px Fathom on a Paper band that rises over the texture, so the statement never sits on a page. The subject page (SRE workbook, Wikimedia incident report, Atlassian blog) is a sharp white sheet at level 4. The rest of each page is washed 62% toward white, and the key phrase sits on a Mist band with a Current underline. The words are untouched. Texture pages sit soft (3 px), washed and slightly rotated, and each keeps a sharp ink source chip inside the frame. It reads as a researcher's desk of evidence, not a screen recording, and it has no amber.

**2. The solution hero.** A crafted runbook card at k 1.8 (crumbs, title, "Owned by Dana", the Steps section with step 2's real command) on a level-3 lift with a contact shadow. The Possibly stale badge has slipped one unit right, its grey trace showing at home, with glow and bloom: the one amber. Three anchor chips float at the right on their own shadows. Two solid Fathom curves fork from one node at the code line to the two anchors PR #482 changed. Each changed chip says what changed (`-> scripts/rollback-v2.sh`, "changed 2 lines"). A dashed Current line runs to the unchanged `PAY-6`. The grid shows in the gaps. Everything is square except the badge, which is the brand's idea in one picture. The tilted version shows why tilt is out: every baseline goes off-grid, and the slip stops being the only thing out of line.

**3. The review panel.** Our own panel, built from the interface kit and the real panel's content: the why sentence, "Agents are told not to trust this page until someone reviews it.", What changed (two PR #482 events, High and Medium), Affected section (step 2, with `rollback.sh` on the trace), the rename Quick fix ("No AI used"), and Dismiss, Snooze 7 days and **Mark verified** with the cursor on it. The runbook behind it is racked out of focus and drained, so the header badge stays the only amber. The High event row breaks out toward the camera at level 4: the change the narration names is physically closest.

**4. The proof insert.** The claim, big: "Merge to flag, PR #482", 300 px "19 s", then Merged, an arrow and the slipped badge, with "Measured on the demo site, Nov 13, 2026." The receipt, small: the real Confluence byline and tooltip ("PR #482 changed deploy/helm/values.yaml on Nov 13. Review.") in a white mat, labelled "Live in Confluence", with the "(Development)" suffix covered as logged. The crafted badge row and the real byline sit at the same height, so the eye goes from claim to proof without a connector.

**5. The agent moment.** Drift Reviewer's real answer (D38 wording, verbatim, its last sentence trimmed) in a white level-3 card: the question bubble, the tile avatar, the page citation, and "Do not present steps from this page as current." set in 600. The MCP terminal is a Fathom slab one step closer to the camera. It overlaps the card's empty corner and shows the real `check-page-freshness` output (`status`, `citePolicy`, and `guidance` trimmed with ellipses), with `"possibly_stale"` as the one amber. Tide lines run in the lower third. One signal, two readers, in one space.

**6. The end card.** Paper sweep lit from above centre. The horizontal lockup (Night tile, 132 px, on a contact shadow; the name at 42% of the icon height), "Catch the slip / before your agents do." at 124 px, and "Built on Atlassian Forge for Codegeist 2026" at 32 px text-muted. There is no maker line. Tide lines form a calm horizon, masked away from the type. The tile's slip is the only amber in the film's last frame.

## 14. References

| Reference | The one thing to take |
| --- | --- |
| Josh W. Comeau, "Designing Beautiful Shadows in CSS": https://www.joshwcomeau.com/css/designing-shadows/ | Layered, tinted shadows from one consistent light, with an elevation palette where higher means bigger, softer and fainter. Our `ELEV` |
| Linear, "A calmer interface for a product in motion": https://linear.app/now/behind-the-latest-design-refresh | "Don't compete for attention you haven't earned": dim the chrome, use fewer and softer separators, and let the work area lead. Our muted labels and minimal frames |
| Apple Newsroom, Liquid Glass design (June 2025): https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/ | Controls as "a distinct functional layer that sits above apps", shapes concentric with their container. Our layer order and concentric radii |
| Field.io, Stripe wave brand system: https://field.io/work/stripe-wave-brand-system | "The system defines when the wave should lead, support or disappear entirely." Our tide lines and grid each have a job |
| Vercel site teardown (third-party, unverified): https://webtrends.pages.dev/posts/vercel-website-design-analysis | A faint measuring grid with a radial mask that fades it out around copy. Our grid |
| Stripe, "Connect: behind the front-end experience": https://stripe.com/blog/connect-front-end-experience | Illustrations built from real UI primitives (not bitmaps), lit by one virtual light, with custom ease-out motion under 500 ms that never gets in the way. Our crafted objects |
| Figma, "Crafting the visual identity for Config 2024": https://www.figma.com/blog/config-2024-branding/ | "A motion library of interchangeable parts" instead of custom animation per surface. Our six moves (section 10) |
| Mobbin, Superhuman feature section: https://mobbin.com/sites/sections/0ceebdca-4901-4940-897d-14fef921e803 | A UI card on a stage, with a smaller card overlapping its edge. Our breakout row and terminal overlap |
| Mobbin, Grammarly for developers hero: https://mobbin.com/sites/sections/6cc25036-b072-445c-9612-c0d83c5c8196 | A dark code card and a light UI card layered in one space, one accent. Our terminal-on-Day composition |
| Mobbin, Vercel agents section: https://mobbin.com/sites/sections/c7c01a46-9a30-4842-8098-affe8ead6b9f | A ghosted secondary card behind the main one, fading into the ground: depth by fade, not shadow. Our racked page behind the panel |
| Our own bar: Pot (`near/Pot/marketing/video/out/final/PotDemo.mp4`) and Satchel (`near/Satchel/marketing/out/satchel-2-v6.mp4`) | Pot: huge type beside the product, and the one accent as a block behind words. Satchel: one coral per frame, height told by the shadow, facts held still while read |
