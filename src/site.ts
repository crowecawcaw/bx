/**
 * Which experience to load: `?site=temple` opens Solomon's Temple, `?site=second` the second
 * temple, `?site=sea` the crossing of the Red Sea, and `?site=compare` the tabernacle and both
 * temples side by side; anything else, the tabernacle.
 */
export type SiteId = 'tabernacle' | 'temple' | 'second' | 'sea' | 'compare';

const IDS: SiteId[] = ['tabernacle', 'temple', 'second', 'sea', 'compare'];
const ASKED = new URLSearchParams(window.location.search).get('site') as SiteId | null;
export const SITE_ID: SiteId = ASKED && IDS.includes(ASKED) ? ASKED : 'tabernacle';

/** Link to another experience, keeping other query flags such as ?debug. */
export function siteHref(id: SiteId) {
  const u = new URL(window.location.href);
  if (id === 'tabernacle') u.searchParams.delete('site');
  else u.searchParams.set('site', id);
  u.hash = '';
  return u.pathname + u.search;
}
