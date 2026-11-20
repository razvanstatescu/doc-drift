# Website visitor test: questionnaire

Simulated first-time visitors read the home page as screenshots, the same method as the film's viewer test (`video/out/v5/viewer-test/`). Each persona is a separate agent that has never seen Doc Drift. They answer in order and don't skip ahead.

## Personas

| Persona | Who they are | Knows | Doesn't know |
| --- | --- | --- | --- |
| Maya | Engineering manager | Jira every day | Confluence, Bitbucket, MCP |
| Tomas | Backend developer | GitHub, Claude Code, Cursor | Atlassian products, beyond the names |
| Priya | Codegeist 2026 judge, reviewing about 40 entries | Forge, Rovo, the judging criteria: Impact, Innovation, Execution, Use of Atlassian (with the Agents and MCP bonus) | |
| Daniel | Confluence platform lead for 600 engineers | Spaces, page verification apps, permissions; watches for noise and trust | |

## Inputs

- `first-screen.png`: the first screen at 1440 x 900, Day theme.
- `full-1440-light.png`: the full page.
- `full-390-light.png`: the full page on a phone.
- `full-1440-dark.png`: the full page in the Night theme.
- `scroll-sheet-*.jpg`: frames taken while scrolling, to judge motion and transitions.
- `page-text.md`: the visible text, so quotes are exact.

## Questions

**A. The first screen only** (`first-screen.png`; nothing else yet)
1. In one sentence, what does this product do?
2. Who is it for?
3. What would you click first, and why?
4. Anything on this screen you don't understand?

**B. The whole page** (the other files)

5. When did you first understand what it does? Name the section, and quote the line that did it.
6. Explain how it works to a colleague, in 3 steps or fewer.
7. What happens with AI agents? Does an agent ever edit a page?
8. What would make you trust it, or not?
9. Where did you lose interest or skim? Name the section.
10. Which words or terms were unclear or too technical? Quote them.
11. Which visual or transition worked best, and which felt off or confusing?
12. Mobile: anything broken, cramped or hard to read?
13. Night theme: anything that reads worse than in Day?
14. Would you install it, or try the demo? What's missing for you to decide?
15. Score from 1 to 5:
    - clarity of the problem;
    - clarity of the solution;
    - visual quality;
    - trust;
    - length (5 means just right).
16. The one change that would most improve this page.

Answer in `answers-<persona>.md` with the question numbers and short answers. Quote the page when you refer to it.
