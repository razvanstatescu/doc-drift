// The barrage items to capture (IDs from docs/video/appendix/sources-*.md). `key` is the exact sentence or headline
// to find on the live page (matched with typographic quotes/dashes normalised). `phrases` are the words to underline.
export const ITEMS = [
  // Bar 1: "The code moved."
  { id: 'A2-01', bar: 1, url: 'https://arxiv.org/abs/2610.27381', key: '63.2% of AI PRs change code without updating any documentation.', phrases: ['63.2%', 'without updating any documentation'] },
  { id: 'D1-02', bar: 1, url: 'https://sre.google/workbook/on-call/', key: 'Details in playbooks go out of date at the same rate as production environment changes.', phrases: ['go out of date', 'at the same rate as production environment changes'] },
  { id: 'D1-04', bar: 1, url: 'https://news.ycombinator.com/item?id=26605818', key: 'throw away your runbooks. They are out of date the moment you hit save.', phrases: ['out of date the moment you hit save'] },
  { id: 'D1-11', bar: 1, url: 'https://josvisser.substack.com/p/the-loneliness-of-the-long-distance', key: 'runbooks are always out of date.', phrases: ['runbooks are always out of date'] },
  { id: 'D1-21', bar: 1, url: 'https://news.ycombinator.com/item?id=47302108', key: 'Documentation rots a lot more quickly than the code', phrases: ['rots a lot more quickly than the code'] },
  { id: 'D1-12', bar: 1, url: 'https://simonwillison.net/2022/Oct/29/the-perfect-commit/', key: "If your docs live in a separate wiki somewhere it's easy for them to get out of date", phrases: ['separate wiki', 'easy for them to get out of date'] },
  // Bar 2: "The docs didn't."
  { id: 'D1-06', bar: 2, url: 'https://wikitech.wikimedia.org/wiki/Incidents/2017-07-18_JobQueue', key: 'Documentation was outdated for jobrunner, dsh, and salt', phrases: ['Documentation was outdated'] },
  { id: 'D1-07', bar: 2, url: 'https://wikitech.wikimedia.org/wiki/Incidents/20190327-elasticsearch', key: 'The documentation associated with the frozen indexing alert is out of date', phrases: ['is out of date'] },
  { id: 'D2-03', bar: 2, url: 'https://runbooks.cloud-platform.service.justice.gov.uk/disaster-recovery-scenarios.html', key: 'reviewed', phrases: ['might mean the content is out of date'] },
  { id: 'D1-03', bar: 2, url: 'https://www.theregister.com/2019/05/10/on-call/', key: 'Techie with outdated documentation gets his step count in searching for non-existent cabinet', phrases: ['outdated documentation'] },
  { id: 'D2-04', bar: 2, url: 'https://write.as/thomrstrom/the-anatomy-of-a-great-playbook-entry', key: 'I have never seen quarterly playbook reviews work.', phrases: ['never seen quarterly playbook reviews work'] },
  { id: 'D2-01', bar: 2, url: 'https://stackoverflow.blog/2020/09/28/migration-wiki-documentation-articles/', key: "The author of 90% of our documentation doesn't work here anymore!", phrases: ['90% of our documentation', "doesn't work here anymore"] },
  { id: 'D1-01', bar: 2, url: 'https://opensourcesurvey.org/2017/', key: 'Incomplete or outdated documentation is a pervasive problem, observed by 93% of respondents', phrases: ['outdated documentation', '93% of respondents'] },
  { id: 'D1-05', bar: 2, url: 'https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/the-future-of-ai-autonomous-agents-for-identifying-the-root-cause-of-cloud-servi/4412494', key: 'these guides are often outdated, incomplete, hard to understand', phrases: ['often outdated'] },
  { id: 'D2-02', bar: 2, url: 'https://abseil.io/resources/swe-book/html/ch10.html', key: 'Documents without owners become stale and difficult to maintain.', phrases: ['Documents without owners become stale'] },
  // Bar 3: "The agents can't tell."
  { id: 'A1-06', bar: 3, url: 'https://community.atlassian.com/forums/discussion/3256922/rovo-agent-it-always-reads-from-an-old-confluence-source', key: 'ROVO Agent - It always reads from an OLD confluence source.', phrases: ['always reads from an OLD confluence source'] },
  { id: 'A4-02', bar: 3, url: 'https://jira.atlassian.com/browse/ROVO-730', key: 'the agent continues to serve outdated information with the same confidence as current information', phrases: ['outdated information', 'same confidence as current information'] },
  { id: 'A1-07', bar: 3, url: 'https://community.atlassian.com/forums/discussion/3156949/how-to-avoid-rovo-using-archived-content-in-chat-results', key: 'we have a lot of outdated results', phrases: ['a lot of outdated results'] },
  { id: 'A1-13', bar: 3, url: 'https://arxiv.org/abs/2609.31342', key: 'outdated retrieval flips 30% of Llama and 37% of Qwen answers even without instructions to trust the document', phrases: ['Outdated Retrieval Overrides Correct Model Answers', '30%', '37%'] },
  { id: 'R3', bar: 3, url: 'https://arxiv.org/abs/2610.30571', key: "Without the sentence, 90.1% of the agents' choices followed the stale file.", phrases: ['90.1%', 'followed the stale file'] },
  { id: 'A2-02', bar: 3, url: 'https://arxiv.org/abs/2606.09090', key: 'identifies stale code element references in 23.0% of repositories', phrases: ['Context Rot', '23.0% of repositories'] },
  { id: 'A1-01', bar: 3, url: 'https://support.microsoft.com/en-us/microsoft-365-copilot/what-information-does-copilot-use-to-answer-my-prompt', key: 'Copilot can give outdated answers if you point it at an old website or an earlier version of a file.', phrases: ['outdated answers', 'earlier version of a file'] },
  { id: 'A1-03', bar: 3, url: 'https://practical365.com/microsoft-365-archive-copilot/', key: 'Gently Rotting Documents Can Corrupt Copilot Output', phrases: ['Gently Rotting Documents'] },
  { id: 'A1-05', bar: 3, url: 'https://www.reworked.co/information-management/when-your-ai-assistant-still-quotes-last-weeks-policy/', key: 'Why Your AI Assistant Cites Outdated Policy', phrases: ['Cites Outdated Policy'] },
  { id: 'A2-05', bar: 3, url: 'https://www.thoughtworks.com/radar/techniques/ai-driven-documentation-sprawl', key: 'obsolete context can lead AI tools astray', phrases: ['AI-driven documentation sprawl', 'lead AI tools astray'] },
  { id: 'A3-01', bar: 3, url: 'https://survey.stackoverflow.co/2026', key: 'I trust it when I can easily verify the output', phrases: ['48.0%', 'I trust it when I can easily verify the output'] },
  { id: 'A4-01', bar: 3, url: 'https://www.atlassian.com/blog/company-news/teamwork-graph-team-26', key: 'AI agents are only as good as what they know. Right now, most don’t know enough.', phrases: ['only as good as what they know', 'most don’t know enough'] },
];
