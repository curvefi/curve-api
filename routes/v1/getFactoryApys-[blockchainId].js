import { fn } from '#root/utils/api.js';
import getFactoryAPYsFn, { paramSanitizers } from '#root/routes/v1/getFactoryAPYs/[blockchainId].js';

export default fn(async ({ blockchainId, version }) => (
  getFactoryAPYsFn.straightCall({ blockchainId, version })
), {
  maxAgeCDN: 5 * 60, // Don't cache in redis since it's just a pass-through endpoint
  paramSanitizers,
});
