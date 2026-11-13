import { SITE_ID, type SiteId } from '../site';
import { COMPARE } from './compare';
import { SEA } from './sea';
import { SECOND } from './second';
import { TABERNACLE } from './tabernacle';
import { TEMPLE } from './temple';
import type { SiteDef } from './types';

const SITES: Record<SiteId, SiteDef> = { tabernacle: TABERNACLE, temple: TEMPLE, second: SECOND, sea: SEA, compare: COMPARE };
export const SITE: SiteDef = SITES[SITE_ID];
