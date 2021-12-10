import BN from 'bignumber.js';
import getCryptoPoolTokenPrices from 'utils/data/getCryptoPoolTokenPrices';
import getFixedForexPoolTokenPrices from 'utils/data/getFixedForexPoolTokenPrices';
import getAssetsPrices from 'utils/data/assets-prices';
import { web3 } from 'utils/Web3';
import { uniq } from 'utils/Array';
import pools from 'constants/pools';
import coins from 'constants/coins';

const assetCoingeckoIdsArray = uniq([
  ...Array.from(Object.values(coins)).map(({ id, coingeckoId }) => coingeckoId || id),
  ...pools.map(({ coingeckoInfo: { referenceAssetId } }) => referenceAssetId),
]);

const getAllCoingeckoPrices = () => getAssetsPrices(assetCoingeckoIdsArray);

// Returns the usd price, given a pool balance and a pool's reference asset.
// `balance` can be either a Number or a BigNumber; the returned value will be
// either a Number or a BigNumber accordingly.
const getPoolUsdFigure = async (balance, pool, web3Instance = undefined) => {
  const isFactoryV2Pool = (
    typeof pool.totalSupply !== 'undefined' &&
    typeof pool.usdTotal !== 'undefined'
  );

  console.log(pool.id, {
    isFactoryV2Pool,
    'pool.cryptoPool': pool.cryptoPool,
    'pool.coingeckoInfo.referenceAssetId': pool.coingeckoInfo.referenceAssetId,
  })
  const refAssetPrice = (
    isFactoryV2Pool ? (pool.usdTotal / (parseFloat(pool.totalSupply) === 0 ? 1 : pool.totalSupply) * 1e18) :
    pool.cryptoPool ? (await getCryptoPoolTokenPrices(undefined, web3Instance || web3, 1))[pool.id] :
    typeof pool.coingeckoInfo.referenceAssetId !== 'undefined' ? (await getAllCoingeckoPrices())[pool.coingeckoInfo.referenceAssetId] :
    (await getFixedForexPoolTokenPrices(await getAllCoingeckoPrices(), undefined, web3Instance || web3, 1))[pool.id]
  );

  return balance instanceof BN ?
    balance.times(refAssetPrice) :
    balance * refAssetPrice;
};

export default getPoolUsdFigure;
