# R1: what reference sites do on their home pages

Research for the home page redesign ([plan.md](plan.md)). Written 2026-11-20.

Inputs:
- 12 live home pages, each scrolled to the end and measured over CDP in Chrome 158 at 1440 x 900, then measured again with reduced motion emulated.
- 13 Mobbin section searches.
- Browser support and accessibility rules, checked the same day.

Screenshots are third-party material, so they stay outside the repo, in `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/` (called `SHOTS/` below). Method and limits are in section 10.

## 1. Top 10 findings, ranked by impact for Doc Drift

1. **Our page is as long as theirs but carries twice the words.** It is 10.0 screens tall with 9 sections (medians 10.7 and 10), yet shows 1,040 words at reading size, 16 px and up (median 445). Its hero has 59 words of copy (median 20) and its cards 30 (median 17). Cut words, not sections.
2. **Say what it is in one screen, then show the product.** H1s run 2 to 10 words (median 6; ours, 7, is fine), then one sentence. 8 of 12 sites show real product UI, mostly built in HTML and CSS, in the first screen or right under it.
3. **Open on the human cost.** incident.io's hero picture is a phone paged at 2:58; Guru's H1 is "Stop running your business on confidently wrong AI." Our 3 a.m. runbook makes the same move, and the film already tested it.
4. **Tell the core loop once, as a pinned sequence.** It is the strongest moving moment in the set. Graphite holds a product stage for about 4 screens of scrolling while 5 steps advance beside it; CodeRabbit and incident.io pin a diagram or a chapter bar. Our merge story fits it exactly.
5. **Show the agent's answer change; don't explain MCP.** The big sites name MCP about once, as a label ("Linear MCP", Rovo's "Via MCPs"). We name it 7 times and show 4 tool transcripts. Vercel even makes the agent a call to action: "Onboard your agent".
6. **Most motion is the product UI doing something.** UI that types, changes state or steps forward carries it (Raycast, CodeRabbit, Graphite, Rovo). Only 6 of 12 use scroll reveals, 2 ship GSAP ScrollTrigger (Guru through Webflow, Graphite), 2 use CSS scroll-driven animation (Mintlify, Rovo), and none uses a smooth-scroll library or cross-page view transitions.
7. **Sections change ground; nobody draws dividers.** incident.io alternates white and cream, adds an orange band and runs its closing gradient into the footer. Swimm and Rovo add navy or near-black bands. Resend, CodeRabbit and Graphite end on a giant wordmark.
8. **Reduced motion is uneven, so we can do better.** With it emulated, incident.io turns off 71 of 81 reveals and Rovo 42 of 54. Resend, Guru and Graphite still play every reveal, and Linear and Graphite keep 75 and 80 decorative loops running. Only Rovo, CodeRabbit and Mintlify offer pause buttons.
9. **Two calls to action in the hero, one band at the end.** The first button sits at 2 to 10% of the page on 10 of 12 sites, and every page closes on a call-to-action band. The second hero button is a smaller step: Docs, Talk to sales, Watch.
10. **Docs tools now sell "self-updating docs"; our promise is different.** Mintlify ("Self-updating documentation"), GitBook and ReadMe (on Mobbin) let AI update docs. Our difference, that no AI decides what is stale and a person approves every change to a page, suits Rovo's trust form: three one-line claims and a link.

## 2. Notes per site

Kinds:
- (a) A developer tool whose work is mostly invisible.
- (b) A product about trusted or verified knowledge.
- (c) A site that presents AI agents or MCP to non-experts.

Words: what you can see in the main content, including text inside product mockups; in brackets, the words at reading size (16 px and up).

| Site | Section order | Hero / H1 words | Words | Main visual | Standout motion |
| --- | --- | --- | --- | --- | --- |
| Linear (a, c) | hero with UI, logos, 3 pillars, 5 product chapters, quotes, call to action | 17 / 8 | 1,251 (170) | HTML/CSS product UI, line drawings | None on scroll; 84 decorative loops, still running with reduced motion |
| Vercel (a, c) | hero, logos, 3 customer chapters, recently shipped, call to action | 21 / 2 | 224 (131) | 2D canvas glow, customer screenshots | Almost static; "Onboard your agent" button |
| Raycast (a) | hero, demo, extensions, AI, quotes, snippets, community, developers, call to action | 19 / 4 | 1,133 (440) | three.js hero, HTML UI demos, 3D renders | UI that types; a keyboard graphic as the final call to action |
| Resend (a) | hero, logos, code, developer experience, editor, React, deliverability, quotes, call to action | 23 / 3 | 1,287 (343) | WebGL object, code blocks, 3D icons | 35 reveals, kept with reduced motion; testimonial marquee that pauses on hover |
| incident.io (a) | hero with UI, logos, case study, problem/solution, platform, orange band, 4 chapters, proof, call to action | 30 / 6 | 1,250 (603) | HTML UI on warm gradients, Lottie | 81 reveals (10 with reduced motion); sticky chapter bar |
| Sentry (a) | hero, logos, 4 value blocks, quotes, setup, security, newsletter, call to action | 15 / 5 | 1,870 (1,737) | Illustrations, UI crops | Almost static; a "Marketing mode" switch |
| Guru (b) | hero, statement, stats, security marquee, quote, call to action | 30 / 8 | 271 (162) | Floating UI chips, stat cards, video | GSAP reveals, kept with reduced motion; a statement that lights up word by word |
| Swimm (b) | hero, problem, 3-part offer, 4 proof blocks, navy stats band, FAQ, call to action | 52 / 7 | 1,386 (839) | Abstract art, diagrams, one video | None |
| Mintlify (b, c) | hero with UI, logos and live stats, bento, customers, quotes, news, call to action, FAQ | 11 / 4 | 536 (287) | HTML docs UI, line art, photos | Live counters; CSS `view(inline)` carousel; "Pause testimonials" |
| CodeRabbit (c) | hero with UI, logos, problem, 5 chapters, pinned diagram, outcomes, call to action | 19 / 10 | 3,098 (940) | HTML/CSS product UI | Rotating last word in the H1; pinned index; "Pause automatic feature rotation" |
| Graphite (a, c) | hero, logos, video, stories, pinned tour, features, call to action | 22 / 6 | 529 (451) | HTML UI with glow, chaptered video | Pinned 5-step tour over 4 screens; 80-item marquee kept with reduced motion |
| Atlassian Rovo (c) | hero, logos, value tabs, graph, connectors, surfaces, trust, stories, FAQ, call to action | 9 / 7 | 611 (609) | 14 product videos, most looping; node diagram | Vertical tabs with videos and pause buttons; most reveals off with reduced motion |
| Doc Drift today | hero, problem, how it works, bento, agents, trust, start, FAQ, call to action | 59 / 7 | 1,899 (1,040) | HTML/CSS mock | One badge flip in the hero |

## 3. Copy length benchmarks

| Measure | Median (range), 12 sites | Doc Drift today | Suggested |
| --- | --- | --- | --- |
| H1 words | 6 (2 to 10) | 7 | Keep the tagline |
| Hero copy: H1, subhead, button labels | 20 (9 to 52) | 59 | 35 or fewer |
| Section headline words | 5 (2 to 11) | 5 | 3 to 7 |
| Words per feature card | 17 (3 to 23) | 30 | 15 (as in the plan) |
| Sections from hero to closing | 10 (6 to 12) | 9 | 8 to 10 |
| Height at 1440 x 900 | 10.7 screens (6.6 to 17.8) | 10.0 | 8 to 10 |
| Words in content, including UI text | 1,190 (224 to 3,098) | 1,899 | About 800 (as in the plan) |
| Words at reading size | 445 (131 to 1,737) | 1,040 | 450 or fewer |

Graphite (529 words) and Rovo (611) are short, clear models for the plan's 800-word target. NN/g found that users read about 20% of a page's words, and spend 57% of their viewing time on the first screen and 74% on the first two.

## 4. Patterns to adopt, applied to Doc Drift

1. **Pinned scrollytelling for the merge** (Graphite, CodeRabbit; Garden on Mobbin). A sticky stage shows the Payments rollback runbook and its byline. Four steps scroll beside it, each a whole state, so the badge always shows a word and an icon:
   1. In sync: Verified by Dana.
   2. PR #482 renames `scripts/rollback.sh`, and the badge slips to Possibly stale.
   3. The agent card changes from "Safe to cite." to the caveat.
   4. Dana accepts the one-click rename, and the page is Verified again.
2. **A Problem / Solution switch for agents** (incident.io; Cloudflare's Generative / Agentic switch on Mobbin). Two buttons sit over one answer to "How do I roll back payments-api?". Without Doc Drift the agent presents step 2 as current; with it, the agent says the runbook may be out of date and names PR #482. This replaces the four-tab terminal.
3. **The 3 a.m. problem as one Night shift band** (incident.io's 2:58 phone; the dark bands on Swimm and Rovo): a clock, one failing command and three short lines, as in the film (D39).
4. **Chapters: a title, one sentence, a crop** (Linear, Graphite, Resend). One line per bento tile, as the plan has it; paths, globs and settings move to the guide.
5. **The agent as an audience** (Vercel's "Onboard your agent", Mintlify's "Set up with agents"): a small "Copy the MCP setup" button in the agents section, linking to `docs.html#mcp`.
6. **A visible fast path to the facts.** Switched off, Sentry's "Marketing mode" leaves only "No marketing. No value props. No logo rivers." and a question box. For us: short FAQ answers, and plain links to the setup guide and the privacy page for judges.
7. **Real proof instead of logos.** We have no customers, and we never invent numbers. Use one measured, labelled figure: the M1 test flagged a page 11 s after its merge, and the film shows 19 s, so pick one and say where it came from. Add "Built on Atlassian Forge".
8. **The film behind a click** (Graphite's intro video with chapter labels; Rovo's and Guru's play buttons): a poster with "Watch the film (1:49)", and it never plays on its own.
9. **Close on a change of ground and the tagline** (Linear's "Available today.", incident.io's gradient into the footer): Night, with the hero's two buttons.

## 5. Patterns to avoid

- **Logo walls, customer counts and live counters** (Mintlify's ticking numbers): we have no such data. Label any count that rolls in the bento "Sample data from the demo space", and keep the final value in the HTML.
- **Rotating or typed headlines** (CodeRabbit): text holds still to be read (D39). Typing inside a UI mock is fine if it ends within about 2 s and the full text is in the page.
- **Fading in every element** (81 on incident.io, 54 on Rovo, 35 on Resend), which half these sites keep with reduced motion. Animate section visuals, not paragraphs.
- **Decorative loops that ignore reduced motion** (Linear's dot grids, Graphite's marquee), or that have no pause button.
- **WebGL or 3D heroes** (Raycast, Resend): heavy and generic, and against our rule to show the product.
- **Sideways carousels:** Raycast hides 520 words off to the side and Resend 847.
- **Setup steps, JSON and CLI on the home page:** move the MCP block, the agent rule and the Cursor JSON to `docs.html`.
- **States that blend as you scroll:** a badge halfway between Verified and Possibly stale shows no word.
- **Scroll hijacking and mega footers:** none of the 12 sites takes over the scroll, and we have only three pages to link to.

## 6. Recipes: motion and transitions in plain CSS and JS

Support, checked 2026-11-20:

| Feature | Chrome, Edge | Safari | Firefox | Use |
| --- | --- | --- | --- | --- |
| Scroll-driven animations (`animation-timeline: view()` and `scroll()`) | 115 | 26 | 159, from Oct 27, 2026 | Optional extra; Baseline (newly available) since Oct 2026, about 89% of users |
| Cross-document view transitions (`@view-transition`) | 126 | 18.2 | Not yet (in Interop 2026) | Optional extra |
| Same-document view transitions (`startViewTransition`) | 111 | 18 | 144 | Optional extra |
| `position: sticky`, IntersectionObserver, `prefers-reduced-motion` | Yes | Yes | Yes | Safe to rely on |

**A. Reveal once on entry** (the plan's choice). Use IntersectionObserver, because scroll-driven animations play backwards when you scroll up. JS adds the class, so without JS everything stays visible.

```js
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!calm) {
  document.documentElement.classList.add('motion');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}
```
```css
.motion .reveal { opacity: 0; translate: 0 16px; transition: opacity 500ms ease-out, translate 500ms ease-out; }
.motion .reveal.is-in { opacity: 1; translate: none; }
```

**B. Scroll-linked moments** ("the turn", the tide-line drift). Scroll-driven CSS can run off the main thread. Browsers without support, and visitors who prefer reduced motion, see the end state.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .turn-band { animation: dd-slip linear both; animation-timeline: view(); animation-range: entry 20% cover 50%; }
  }
}
@keyframes dd-slip { from { translate: 11.7% 0; } } /* one slip unit, settling back into line */
```

**C. The pinned story** (sticky stage, discrete steps). The steps hold the real text; the stage is decorative.

```css
.story { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.story-stage { position: sticky; top: 12vh; height: 76vh; }
.story-steps > li { min-height: 70vh; }
@media (max-width: 860px) { .story { display: block; } .story-stage { display: none; } .story-steps > li { min-height: 0; } }
```
```js
const stage = document.querySelector('.story-stage');
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) stage.dataset.step = e.target.dataset.step;
}), { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('.story-steps > li').forEach((li) => io.observe(li));
```

CSS then switches the badge on `[data-step]`, and the slip uses the brand timing (out in 180 ms ease-out, back in 240 ms). With reduced motion, the state swaps with a 120 ms fade. On mobile, each step carries its own small crop.

**D. Night band seams.** Use gradients, not dividers. In Night shift, use `surface-sunk` so the band still reads.

```css
.band-night { --g: #072630; background: linear-gradient(var(--ground), var(--g) 160px, var(--g) calc(100% - 160px), var(--ground)); }
:root[data-theme="dark"] .band-night { --g: #05191F; }
```

**E. Page-to-page transitions.** Add this to all three pages; they share an origin on GitHub Pages. Firefox just navigates.

```css
@view-transition { navigation: auto; }
.site-header { view-transition-name: site-header; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

**F. Theme toggle cross-fade.** `if (document.startViewTransition && !calm) document.startViewTransition(apply); else apply();`

**G. Anything that loops** (the hero loop, a recorded clip).
- WCAG 2.2.2 (level A) applies to motion that starts on its own, lasts more than 5 s and sits beside other content: it needs a pause, stop or hide control. Use a "Pause" button with `aria-pressed`.
- Pause the loop while it is off-screen (IntersectionObserver).
- With reduced motion, don't autoplay: show the flagged state with a Play button.
- The current hero flip runs once in 1.4 s, so it needs no control.

**GSAP or plain code?**
- GSAP 3.15 is now free, including ScrollTrigger, under Webflow's standard licence. Its main restriction is on no-code animation builders that compete with Webflow, which doesn't affect us.
- From jsDelivr, the core plus ScrollTrigger is 46 KB gzipped. Our whole `site.js` is 8.6 KB before compression.
- What we need is one pinned story, one-shot reveals, two scroll-linked moments and page transitions: about 40 lines of CSS and 30 of JS.
- GSAP pays off for scrubbed timelines with many elements, SVG morphing or split text, which the brand rules out ("One motion idea: the slip").
- Recommendation: plain code. Animate only `opacity`, `translate` and `scale`, and add no scroll listeners.

## 7. What this means for the v2 plan

- **Cross-page view transitions:** yes, as an optional extra; none of the 12 sites has them yet.
- **Reveals:** IntersectionObserver, once, 16 px, 500 ms is right. Apply them to visuals and section heads only, and skip them with reduced motion, as planned.
- **"The turn" and the tide lines:** use recipe B. Keep parallax under 40 px and off with reduced motion; WCAG 2.3.3 calls parallax often non-essential.
- **How it works:** pinned with discrete steps, as Graphite and CodeRabbit do it. On mobile, stacked cards.
- **The hero:** the planned hero is about 60 words, more than any site here (median 20). Move the proof row to a strip under the hero picture and show two buttons, not three: about 45 words. The body is the film's tested sentence, so trim it only if the 10-second test allows.
- **The hero loop:** fine with its pause button. Also pause it while it is off-screen.
- **The 19 s real recording:** yes, in the spirit of D39 (crafted twins proved by real captures): muted, playing only in view, never with reduced motion, with a pause button, the flagged frame as poster and the caption "Recorded on our demo site".
- **Agents section:** typing once is fine. Consider the Problem / Solution switch instead of tabs.
- **Brand rule to update:** brand/README.md says "Nothing else moves on its own." Scroll-linked steps move only as the reader scrolls, so they fit; the hero loop and the entry reveals do not. Record the change as a decision (D42) when the plan is accepted.

## 8. Screenshots most worth a look

1. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/incident-01.jpg`: a phone paged at 2:58, the same story as our 3 a.m. runbook.
2. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/incident-03.jpg`: the Problem / Solution switch above "Incidents are slowing you down".
3. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/graphite-03.jpg`: the pinned tour, with the stage on the left and the active step open on the right.
4. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/coderabbit-08.jpg`: the pinned index next to the context diagram.
5. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/linear-00.jpg`: a two-line hero with the product UI straight below it.
6. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/vercel-05.jpg`: "Built by you, or your agents", with Deploy now beside Onboard your agent.
7. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/rovo-06.jpg`: trust in three one-line claims.
8. `/private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-doc-drift/95a8c756-7baf-4aa4-84b5-863371b05b06/scratchpad/website-research/guru-00.jpg`: "confidently wrong AI", with floating status chips. During the first visit one chip read "Doc drifted from Slack thread". Guru lays out at 1,025 px, hence the white band.

Each site also has a contact sheet, `SHOTS/<site>-sheet-1.jpg`. Sentry's Marketing mode, on and off, is in `SHOTS/sentry-mode-compare.jpg`.

## 9. Mobbin references

- How it works:
  - [Garden](https://mobbin.com/sites/sections/38333d73-f428-421e-bfe3-c954e3926136): the active item is lit and the rest are dimmed, beside a large picture.
  - [Greptile](https://mobbin.com/sites/sections/a40ecf6e-dc62-4e36-acfa-ba2e27f4688a): step tabs with a progress bar.
  - ToDesktop and Clay: three or four numbered cards.
- Agents and MCP:
  - [Cloudflare](https://mobbin.com/sites/sections/fc321e05-769e-4f3a-b404-aad0f87301e7): a Generative / Agentic switch.
  - [Save.design](https://mobbin.com/sites/sections/7e0b7576-e038-4435-8a96-f1b88b0c6f66): "One URL. Any MCP client.", in 3 steps.
  - Customer.io: "Your AI tools already work here".
- Doc freshness, from competitors:
  - [ReadMe](https://mobbin.com/sites/sections/4079a4e2-8af4-4f3c-a205-c6a18da03b9e): "AI Writer proposes doc updates when your code changes" and "Silent when no updates are needed".
  - GitBook: "Your product and docs, in sync (finally)".
- Trust and FAQ:
  - Maze: six short cards.
  - [Retool](https://mobbin.com/sites/sections/525668ea-697f-4e30-84dd-04cacfc29545): the title on the left and the questions on the right.
- Not useful:
  - The "verified knowledge base" search returned help centres.
  - Guru is not on Mobbin.
  - Mobbin only has still images, so it says nothing about motion.

## 10. Method and limits

- **Capture.** Each site had its own tab, closed afterwards. The script scrolled with wheel events in 450 px steps, took a screenshot every 900 px, then reloaded with `Emulation.setEmulatedMedia` set to `prefers-reduced-motion: reduce`. Scripts are in `wr-scripts/` beside `SHOTS/`.
- **Counting.** Hero copy is text of 15 px or more in the first screen, button labels included, with event and billing banners removed by hand (incident.io, Guru, Rovo). Sections were counted by hand. Card words (an h3 and the text after it) are approximate. Motion counts come from `document.getAnimations()` and computed styles; canvas, Lottie and WebGL motion is detected, not measured.
- **Limits.** Guru lays out at 1,025 px, so its height is not comparable, and it needed a second run. Vercel's and incident.io's consent banners show in their frames; others were hidden with CSS, never accepted. Swimm now sells legacy modernisation, so it says little about doc freshness.
- **Rules.** No sign-in, no forms, no visit to the demo site. The only interaction was one click on Sentry's Marketing mode switch.

## Sources

- Scroll-driven animations:
  - https://caniuse.com/mdn-css_properties_animation-timeline_view
  - https://developer.mozilla.org/en-US/Firefox/Releases/159
  - https://web.dev/blog/web-platform-10-2026
  - https://developer.chrome.com/docs/css-ui/scroll-driven-animations
  - https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- View transitions:
  - https://caniuse.com/cross-document-view-transitions
  - https://developer.chrome.com/docs/web-platform/view-transitions/cross-document
  - https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available
- GSAP:
  - https://gsap.com/pricing/
  - https://gsap.com/standard-license/
  - Sizes measured from https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/
- Accessibility:
  - https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
  - https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- Reading and attention:
  - https://www.nngroup.com/articles/how-little-do-users-read/
  - https://www.nngroup.com/articles/scrolling-and-attention/
