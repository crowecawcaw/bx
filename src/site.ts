/** Which experience to load. `?site=temple` opens Solomon's Temple; anything else, the tabernacle. */
export type SiteId = 'tabernacle' | 'temple';

export const SITE_ID: SiteId = new URLSearchParams(window.location.search).get('site') === 'temple' ? 'temple' : 'tabernacle';

/** Link to the other experience, keeping other query flags such as ?debug. */
export function siteHref(id: SiteId) {
  const u = new URL(window.location.href);
  if (id === 'temple') u.searchParams.set('site', 'temple');
  else u.searchParams.delete('site');
  u.hash = '';
  return u.pathname + u.search;
}
