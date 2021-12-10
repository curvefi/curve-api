import memoize from 'memoizee';
import { arrayToHashmap } from 'utils/Array';
import { multiCall } from 'utils/Calls';
import abis from 'utils/data/abis';

const getIbTokensPrices = memoize((ibCoins, account, library, chainId) => {
  console.log({ ibCoins })
  return (
    multiCall(ibCoins.map(({ id, address }) => ({
      address: abis.FixedForexRegistry.address,
      abi: abis.FixedForexRegistry.abi,
      methodName: 'price',
      params: [address],
      metaData: { id },
    }))).then((pricesData) => {
      console.log({ pricesData })
      return arrayToHashmap(pricesData.map(({ data, metaData }) => [
        metaData.id,
        data / 1e18,
      ]))
    })
  );
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  primitive: true,
});

export default getIbTokensPrices;
