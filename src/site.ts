/**
 * Which experience to load: `?site=temple` opens Solomon's Temple, `?site=sea` the crossing of
 * the Red Sea; anything else, the tabernacle.
 */
export type SiteId = 'tabernacle' | 'temple' | 'sea';

const ASKED = new URLSearchParams(window.location.search).get('site');
export const SITE_ID: SiteId = ASKED === 'temple' || ASKED === 'sea' ? ASKED : 'tabernacle';

/** Link to another experience, keeping other query flags such as ?debug. */
export function siteHref(id: SiteId) {
  const u = new URL(window.location.href);
  if (id === 'tabernacle') u.searchParams.delete('site');
  else u.searchParams.set('site', id);
  u.hash = '';
  return u.pathname + u.search;
}
