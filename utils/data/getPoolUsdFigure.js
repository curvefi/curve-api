import BN from 'bignumber.js';
import getRefAssetPrice from '#root/utils/data/getRefAssetPrice.js';
import getCryptoPoolTokenPrices from '#root/utils/data/getCryptoPoolTokenPrices.js';
import { web3 } from '#root/utils/Web3/index.js';

// Returns the usd price, given a pool balance and a pool's reference asset.
// `balance` can be either a Number or a BigNumber; the returned value will be
// either a Number or a BigNumber accordingly.
const getPoolUsdFigure = async (balance, pool, web3Instance = undefined) => {
  const refAssetPrice = pool.cryptoPool ?
    (await getCryptoPoolTokenPrices(undefined, web3Instance || web3, 1))[pool.id] :
    await getRefAssetPrice(pool.referenceAsset);

  return balance instanceof BN ?
    balance.times(refAssetPrice) :
    balance * refAssetPrice;
};

export default getPoolUsdFigure;
