/**
 * @openapi
 * /getAllGaugesStatus:
 *   get:
 *     tags:
 *       - Gauges
 *       - Misc
 *     description: |
 *       Returns per-scope cache status for `getAllGauges`, including stale scopes,
 *       failed cold scopes, and scopes missing required curve-prices gauges.
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import { getAllGaugeScopeStatuses } from '#root/routes/v1/getAllGauges.js';

export default fn(async () => (
  getAllGaugeScopeStatuses()
), {
  maxAgeCDN: 30,
  cacheKeyCDN: 'getAllGaugesStatus',
});
