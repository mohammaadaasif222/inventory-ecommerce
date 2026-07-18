import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'raw_response';

/**
 * Opt a route out of the standard { success, data, message } envelope so it can
 * return raw content (e.g. sitemap.xml, robots.txt). Pair with @Header(...).
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
