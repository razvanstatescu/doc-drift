# Website v2, round 2: visitor test synthesis

2026-11-20. Four fresh simulated first-time visitors read the round-2 page. The captures were made after scrolling through, so the one-time reveals had fired. Answers are in `answers-*.md` here.

## Scores (1 to 5; round 1 in brackets)

| Persona | Problem | Solution | Visuals | Trust | Length |
| --- | --- | --- | --- | --- | --- |
| Maya, Jira-first manager | 5 (4) | 4 (3) | 4 (4) | 4 (3) | 3 (2) |
| Tomas, GitHub developer | 5 (5) | 4 (4) | 4 (4) | 3 (3) | 3 (3) |
| Priya, Codegeist judge | 5 (5) | 4 (4) | 5 (4) | 3 (3) | 4 (3) |
| Daniel, Confluence platform lead | 5 (4) | 4 (4) | 4 (4) | 3 (3) | 4 (3) |

Priya now ranks the site about 5th to 8th of 40 (round 1: about 8th). In her words: "It states one sharp problem, labels its evidence as real, and shows the Rovo agent and MCP output."

## What improved

- **Every visitor rates the problem 5.** The 3 a.m. terminal is still the moment it lands.
- **The first screen shows the whole loop**, and the hero names the stack.
- **"Real answer in Rovo" and "Real output · doc-drift MCP server"** answered the judge's "claimed, not shown".
- **Length and jargon are better:** four tiles, and no "Unanchored", "Pages anchored" or "judges first".

## Fixed after round 2 (round 3, no retest)

- **The empty label placeholder in step 1** read as a glitch (Tomas, Daniel). Step 1 now shows no label; it appears at step 2.
- **The recording** carried two "real" tags. Ours is gone, and the caption says "Real recording on our demo site, Nov 13". The clip is now 1080p.
- **Jira was missing from the steps** (Maya). Step 2 shows "PAY-6 moved to Done" as the other trigger.
- **"Strict, Balanced or Quiet" was unexplained**, and the admins' worries got only three links (Daniel). They now get a "For Confluence admins" block:
  - start with one space;
  - set the noise level, with the comment timing;
  - what it reads and stores.
- **"No servers of ours" read oddly next to the Bitbucket app.** It now says both apps run in Atlassian's cloud.
- **"Respects page permissions" was vague.** It now reads "Only shows pages you can view".
- **Repeated claims:** the note under the steps no longer repeats "No AI decides".
- **The step 4 copy** now matches its picture: "accepts the fix in one click".

## Still open: needs Razvan, not the page

- **A way to act today.** All four asked for "Try the demo", a working install link or the film. The FAQ now explains the demo replay. The real fix is `CONFIG.installUrl` (the production share link) and `CONFIG.videoUrl` (the public film) in `site/assets/site.js`; both buttons appear once those are set.
- **Bitbucket only.** This blocks GitHub and GitLab teams (product scope, D19 and features.md "Won't").
- **No GitHub link near the top.** The repository is private until Dec 19.
