import { fn } from '#root/utils/api.js';
import { getRegistry } from '#root/utils/getters.js';

export default fn(async () => {
  let registryAddress = await getRegistry();
  return { registryAddress };
}, {
  maxAge: 3600, // 1 hour
  cacheKey: 'getRegistryAddress',
});
