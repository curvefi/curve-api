import { fn } from '#root/utils/api.js';
import crvusd from "@curvefi/stablecoin-api";
import configs from '#root/constants/configs/index.js'

export default fn(async () => {
  await crvusd.default.init('JsonRpc', { url: configs.ethereum.rpcUrl, privateKey: '' }, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

  const crvusdTotalSupply = await crvusd.default.totalSupply();

  return {
    crvusdTotalSupply,
  };
}, {
  maxAge: 5 * 60, // 5m
  cacheKey: 'getCrvusdTotalSupply',
});
