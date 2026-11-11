// Byline states for spike S2. The four state words come from brand/README.md (status system).
// Each state ships as an SVG in the `icons` resource (static/icons) and as an inline string here,
// so the backend can also produce a data: URI for the icon-format test.

export const BYLINE_KEY = 'dds-byline-7f3c2a'; // production-shaped byline (no dynamicProperties)
export const PROBE_KEY = 'dds-probe-91d4e0'; // probe byline (has dynamicProperties, to detect fallback calls)

// 16x16 glyphs. Neutral colours: inside Confluence the real app would use ADS tokens in UI Kit,
// but an <img> SVG cannot read tokens, so these use fixed hex values.
export const SVG = {
  verified:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7" fill="none" stroke="#1F845A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  possibly_stale:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="9" height="3" rx="1" fill="#B65C02"/><rect x="5" y="9" width="9" height="3" rx="1" fill="#B65C02"/></svg>',
  stale:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="#C9372C" stroke-width="2"/><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="#C9372C" stroke-width="2" stroke-linecap="round"/></svg>',
  unanchored:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="2.5" y="2.5" width="11" height="11" rx="1" fill="none" stroke="#626F86" stroke-width="1.5" stroke-dasharray="2.5 2"/></svg>',
};

export const FILE = {
  verified: 'verified.svg',
  possibly_stale: 'possibly-stale.svg',
  stale: 'stale.svg',
  unanchored: 'unanchored.svg',
};

// Title carries the state word too, so the byline still reads right if the icon falls back.
const TEXT = {
  verified: { title: 'Verified', tooltip: 'Re-checked since its anchors last changed' },
  possibly_stale: { title: 'Possibly stale', tooltip: 'An anchor changed after the last verification' },
  stale: { title: 'Stale', tooltip: 'Drift unreviewed for 7 days, or 3 or more changes' },
  unanchored: { title: 'Unanchored', tooltip: 'Not linked to code or Jira yet' },
};

// iconMode selects the icon string format under test.
export function iconFor(state, iconMode) {
  switch (iconMode) {
    case 'resource':
      return `resource:icons;${FILE[state]}`;
    case 'bare':
      return FILE[state];
    case 'datauri':
      return `data:image/svg+xml;base64,${Buffer.from(SVG[state]).toString('base64')}`;
    case 'absolute':
      // Atlassian-hosted icon used by Atlassian's own byline sample; NOT declared in permissions.external.images.
      return 'https://jira.atlassian.com/images/icons/priorities/high.svg';
    default:
      throw new Error(`unknown iconMode ${iconMode}`);
  }
}

// The content-property value shape the byline reads: flat {title, icon, tooltip}, all strings.
export function bylineValue(state, iconMode, titleSuffix = '') {
  const t = TEXT[state];
  return {
    title: `Doc Drift: ${t.title}${titleSuffix}`,
    icon: iconFor(state, iconMode),
    tooltip: t.tooltip,
  };
}
