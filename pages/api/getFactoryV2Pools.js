import Web3 from 'web3';
import { fn } from '../../utils/api';
import factoryV2RegistryAbi from '../../constants/abis/factory-v2-registry.json';
import factoryPoolAbi from '../../constants/abis/factory-v2/Plain2Balances.json';
import erc20Abi from '../../constants/abis/erc20.json';
import { multiCall } from '../../utils/Calls';
import { flattenArray, sum } from '../../utils/Array';
import getTokensPrices from '../../utils/data/tokens-prices';

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);

const implementationAddressMap = new Map([
  ['0x6523Ac15EC152Cb70a334230F6c5d62C5Bd963f1', 'plain2basic'],
  ['0x24D937143d3F5cF04c72bA112735151A8CAE2262', 'plain2balances'],
  ['0x6326DEbBAa15bCFE603d831e7D75f4fc10d9B43E', 'plain2eth'],
  ['0x4A4d7868390EF5CaC51cDA262888f34bD3025C3F', 'plain2optimized'],
  ['0x9B52F13DF69D79Ec5aAB6D1aCe3157d29B409cC3', 'plain3basic'],
  ['0x50b085f2e5958C4A87baf93A8AB79F6bec068494', 'plain3balances'],
  ['0x8c1aB78601c259E1B43F19816923609dC7d7de9B', 'plain3eth'],
  ['0xE5F4b89E0A16578B3e0e7581327BDb4C712E44De', 'plain3optimized'],
  ['0x5Bd47eA4494e0F8DE6e3Ca10F1c05F55b72466B8', 'plain4basic'],
  ['0xd35B58386705CE75CE6d09842E38E9BE9CDe5bF6', 'plain4balances'],
  ['0x88855cdF2b0A8413D470B86952E726684de915be', 'plain4eth'],
  ['0xaD4753D045D3Aed5C1a6606dFb6a7D7AD67C1Ad7', 'plain4optimized'],
  ['0x213be373FDff327658139C7df330817DAD2d5bBE', 'metausd'],
  ['0x55aa9bf126bcabf0bdc17fa9e39ec9239e1ce7a9', 'metausdbalances'],
  ['0xC6A8466d128Fbfd34AdA64a9FFFce325D57C9a52', 'metabtc'],
  ['0xc4C78b08fA0c3d0a312605634461A88184Ecd630', 'metabtcbalances'],
]);

const assetTypeMap = new Map([
  ['0', 'usd'],
  ['1', 'eth'],
  ['2', 'btc'],
  ['3', 'other'],
]);

export default fn(async () => {
  const registryAddress = '0xb9fc157394af804a3578134a6585c0dc9cc990d4';
  const registry = new web3.eth.Contract(factoryV2RegistryAbi, registryAddress);

  const poolCount = Number(await registry.methods.pool_count().call());
  const poolIds = Array(poolCount).fill(0).map((_, i) => i);

  const poolAddresses = await multiCall(poolIds.map((id) => ({
    contract: registry,
    methodName: 'pool_list',
    params: [id],
  })));

  const poolData = await multiCall(flattenArray(poolAddresses.map((address, id) => {
    const poolContract = new web3.eth.Contract(factoryPoolAbi, address);

    // Note: reverting for at least some pools, prob non-meta ones: get_underlying_coins, get_underlying_decimals
    return [{
      contract: registry,
      methodName: 'get_coins', // address[4]
      params: [address],
      metaData: { poolId: id, type: 'coinsAddresses' },
    }, {
      contract: registry,
      methodName: 'get_decimals', // address[4]
      params: [address],
      metaData: { poolId: id, type: 'decimals' },
    }, {
      contract: registry,
      methodName: 'get_implementation_address', // address
      params: [address],
      metaData: { poolId: id, type: 'implementationAddress' },
    }, {
      contract: registry,
      methodName: 'get_pool_asset_type', // uint256
      params: [address],
      metaData: { poolId: id, type: 'assetType' },
    }, {
      contract: poolContract,
      methodName: 'name',
      metaData: { poolId: id, type: 'name' },
    }, {
      contract: poolContract,
      methodName: 'symbol',
      metaData: { poolId: id, type: 'symbol' },
    }, {
      contract: poolContract,
      methodName: 'totalSupply',
      metaData: { poolId: id, type: 'totalSupply' },
    }];
  })));

  const allCoinAddresses = poolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    if (type === 'coinsAddresses') {
      const poolCoins = data.filter((address) => address !== '0x0000000000000000000000000000000000000000');
      return accu.concat(poolCoins.map((address) => ({ poolId, address })));
    }

    return accu;
  }, []);

  const coinPrices = await getTokensPrices(allCoinAddresses.map(({ address }) => address));

  const coinData = await multiCall(flattenArray(allCoinAddresses.map(({ poolId, address }) => {
    const coinContract = new web3.eth.Contract(erc20Abi, address);
    const poolAddress = poolAddresses[poolId];

    return [{
      contract: coinContract,
      methodName: 'decimals',
      metaData: { poolId, coinAddress: address, type: 'decimals' },
    }, {
      contract: coinContract,
      methodName: 'symbol',
      metaData: { poolId, coinAddress: address, type: 'symbol' },
    }, {
      contract: coinContract,
      methodName: 'balanceOf',
      params: [poolAddress],
      metaData: { poolId, coinAddress: address, type: 'poolBalance' },
    }];
  })));

  const mergedCoinData = coinData.reduce((accu, { data, metaData: { poolId, coinAddress, type } }) => {
    const key = `factory-v2-${poolId}-${coinAddress}`;
    const coinInfo = accu[key];
    const coinPrice = coinPrices[coinAddress.toLowerCase()] || 0;

    // eslint-disable-next-line no-param-reassign
    accu[key] = {
      ...coinInfo,
      address: coinAddress,
      usdPrice: coinPrice,
      [type]: data,
    };

    return accu;
  }, {});

  const emptyData = poolIds.map((id) => ({ id: `factory-v2-${id}` }));
  const mergedPoolData = poolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    const poolInfo = accu[poolId];

    // eslint-disable-next-line no-param-reassign
    accu[poolId] = {
      ...poolInfo,
      address: poolAddresses[poolId],
      [type]: data,
    };

    return accu;
  }, emptyData);

  const augmentedData = mergedPoolData.map((poolInfo) => {
    const implementation = implementationAddressMap.get(poolInfo.implementationAddress);
    const assetTypeName = assetTypeMap.get(poolInfo.assetType);

    const coins = poolInfo.coinsAddresses
      .filter((address) => address !== '0x0000000000000000000000000000000000000000')
      .map((coinAddress) => {
        const key = `${poolInfo.id}-${coinAddress}`;
        return mergedCoinData[key];
      });

    const usdTotal = sum(coins.map(({ usdPrice, poolBalance, decimals }) => (
      poolBalance / (10 ** decimals) * usdPrice
    )));

    return {
      ...poolInfo,
      implementation,
      assetTypeName,
      coins,
      usdTotal,
    };
  });

  return {
    poolData: augmentedData,
  };
}, {
  maxAge: 5 * 60, // 5 min
});
