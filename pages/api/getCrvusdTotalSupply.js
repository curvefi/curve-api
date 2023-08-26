import { fn } from 'utils/api';
import crvusd from "@curvefi/stablecoin-api";
import configs from 'constants/configs';

export default fn(async () => {
  await crvusd.init('JsonRpc', { url: configs.ethereum.rpcUrl, privateKey: '' }, { gasPrice: 0, maxFeePerGas: 0, maxPriorityFeePerGas: 0, chainId: 1 });

  const crvusdTotalSupply = await crvusd.totalSupply();

  return {
    crvusdTotalSupply,
  };
}, {
  maxAge: 5 * 60, // 5m
  name: 'getCrvusdTotalSupply',
});
