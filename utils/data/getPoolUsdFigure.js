import BN from 'bignumber.js';
import getRefAssetPrice from 'utils/data/getRefAssetPrice';
import getCryptoPoolTokenPrices from 'utils/data/getCryptoPoolTokenPrices';
import { web3 } from 'utils/Web3';

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
