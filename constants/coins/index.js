import coins from '#root/constants/coins/coins.js';
import { arrayToHashmap } from '#root/utils/Array.js';
import REFERENCE_ASSETS from '../reference-assets.json' assert { type: 'json' };
import validateCoinConfigs from './init-validation.js';

const FIAT_ASSET_TYPES = [
  REFERENCE_ASSETS.USD,
  REFERENCE_ASSETS.EUR,
];

const defaultCoinTemplate = {
  id: undefined,
  coingeckoId: undefined,
  contractKey: undefined,
  type: undefined,
  symbol: undefined,
  wrappedSymbol: undefined,
  wrapperSymbol: undefined,
  decimals: undefined,
  address: undefined,
  isSynth: false,
  isLpToken: false,
  wrappedCoinType: null,
};

class Coin {
  constructor(props) {
    Object.assign(this, defaultCoinTemplate, props);
  }

  isWrappedCoin() {
    return this.wrappedCoinType !== null;
  }

  isFiat() {
    return FIAT_ASSET_TYPES.includes(this.type);
  }
}

const augmentedCoins = arrayToHashmap(Array.from(Object.entries(coins)).map(([id, props]) => [id, new Coin(props)]));
validateCoinConfigs(augmentedCoins);

const coinsProxy = new Proxy(augmentedCoins, {
  get(target, name) {
    if (
      typeof name === 'string' &&
      !(name in target) &&
      name !== 'inspect' &&
      name !== 'state' &&
      name !== 'render' &&
      !name.startsWith('_') // Ignore "private" props
    ) {
      throw new Error(`Property "${name}" not found on object "coins"`);
    }

    return target[name];
  },
});

export default coinsProxy;
const _Coin = Coin;
export { _Coin as Coin };

export function getCoinByAddress(address) {
  const lcAddress = address.toLowerCase();
  const coinFromAddress = Array.from(Object.values(augmentedCoins)).find((coin) => {
    if (!(coin instanceof Coin)) return false; // Necessary because of exports overriding the coins object
    return lcAddress === coin.address.toLowerCase();
  });

  if (!coinFromAddress) throw new Error(`Couldn’t find coin for address ${address}`);

  return coinFromAddress;
}
