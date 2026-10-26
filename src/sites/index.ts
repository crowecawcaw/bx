import { SITE_ID, type SiteId } from '../site';
import { SEA } from './sea';
import { TABERNACLE } from './tabernacle';
import { TEMPLE } from './temple';
import type { SiteDef } from './types';

const SITES: Record<SiteId, SiteDef> = { tabernacle: TABERNACLE, temple: TEMPLE, sea: SEA };
export const SITE: SiteDef = SITES[SITE_ID];
