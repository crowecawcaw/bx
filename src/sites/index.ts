import { SITE_ID } from '../site';
import { TABERNACLE } from './tabernacle';
import { TEMPLE } from './temple';
import type { SiteDef } from './types';

export const SITE: SiteDef = SITE_ID === 'temple' ? TEMPLE : TABERNACLE;
