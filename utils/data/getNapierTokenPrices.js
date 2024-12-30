import memoize from 'memoizee';
import { arrayToHashmap, flattenArray, uniq } from '#root/utils/Array.js';
import { multiCall } from '#root/utils/Calls.js';
import NAPIER_POOL_ABI from '#root/constants/abis/napier-pool.json' assert { type: 'json' };
import NAPIER_QUOTER_ABI from '#root/constants/abis/napier-quoter.json' assert { type: 'json' };
import getTokensPrices from '#root/utils/data/tokens-prices.js';
import { request, gql } from 'graphql-request';
import groupBy from 'lodash.groupby';
import { lc } from '#root/utils/String.js';
import { uintToBN } from '#root/utils/Web3/index.js';

const getNapierPools = memoize(async () => {
  try {
    const data = await request('https://api.studio.thegraph.com/query/75206/pool/v0.0.1', gql`query {
    pools {
      id
      baseLpt {
        id
      }
    }
  }`);

    return data.pools.map(({ id: napierPool, baseLpt: { id: curvePool } }) => ({ napierPool, curvePool }));
  } catch (err) {
    console.log('Couldnt fetch Napier pools from subgraph');
    return [];
  }
}, {
  promise: true,
  maxAge: 60 * 60 * 1000, // 1h
});

const getNapierTokenPrices = memoize(async (networkSettingsParam) => {
  const napierPools = await getNapierPools();

  const poolsDataRaw = await multiCall(flattenArray(napierPools.map(({ napierPool: poolAddress }) => [{
    address: poolAddress,
    abi: NAPIER_POOL_ABI,
    methodName: 'principalTokens',
    metaData: { type: 'principalTokens', poolAddress },
    ...networkSettingsParam,
  }, {
    address: poolAddress,
    abi: NAPIER_POOL_ABI,
    methodName: 'underlying',
    metaData: { type: 'underlyingToken', poolAddress },
    ...networkSettingsParam,
  }])));

  // { [poolAddress]: { principalTokens, underlyingToken }, … }
  const poolsData = arrayToHashmap(Object.entries(groupBy(poolsDataRaw, 'metaData.poolAddress')).map(([address, dataRaw]) => [
    address,
    arrayToHashmap(dataRaw.map(({ data, metaData: { type } }) => [type, data])),
  ]));

  const principalTokensPricesRaw = await multiCall(flattenArray(Object.entries(poolsData).map(([
    poolAddress,
    { principalTokens },
  ]) => (
    principalTokens.map((ptAddress, i) => ({
      address: '0x00000084431C9125d7Eb4933744F5aff315ead2b',
      abi: NAPIER_QUOTER_ABI,
      methodName: 'quotePtPrice',
      params: [poolAddress, i],
      metaData: { poolAddress, ptAddress },
      ...networkSettingsParam,
    }))
  ))));

  // Mutate poolsData to add prices to it
  Object.entries(groupBy(principalTokensPricesRaw, 'metaData.poolAddress')).forEach(([poolAddress, pricesData]) => {
    poolsData[poolAddress].principalTokensPrices = pricesData.map(({ data }) => (
      uintToBN(data, 18).gte(1e18) ? '0' : // Contract can return erroneously high numbers, this excludes these numbers
        data
    ));
  });

  const underlyingAddressesAndMetadata = uniq(poolsDataRaw.filter(({ metaData: { type } }) => type === 'underlyingToken'));
  const underlyingPrices = await getTokensPrices(underlyingAddressesAndMetadata.map(({ data }) => lc(data)));

  const napierTokensPrices = arrayToHashmap(flattenArray(Object.entries(poolsData).map(([
    poolAddress,
    { principalTokens, underlyingToken, principalTokensPrices },
  ]) => {
    const underlyingPrice = underlyingPrices[lc(underlyingToken)];

    return principalTokens.map((principalToken, i) => {
      const principalTokenPrice = uintToBN(principalTokensPrices[i], 18).times(underlyingPrice).dp(2).toNumber();
      const curvePoolAddress = napierPools.find(({ napierPool }) => napierPool === poolAddress).curvePool;
      const key = `${lc(curvePoolAddress)}-${lc(principalToken)}`;

      return [key, principalTokenPrice];
    });
  })));

  return napierTokensPrices;
}, {
  promise: true,
  maxAge: 15 * 60 * 1000,
  length: 0, // Don't let networkSettingsParam invalidate the cache
});

export default getNapierTokenPrices;
