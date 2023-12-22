import memoize from 'memoizee';
import { arrayToHashmap } from '#root/utils/Array.js';
import { lc } from '#root/utils/String.js';

const FALLBACK_RETURN_VALUE = {};

// Returns a map of ETH LST address <> staking apy
const getETHLSTAPYs = memoize(async () => {
  const [
    { status, data },
    LST_METADATA,
  ] = await Promise.all([
    (await fetch('https://yields.llama.fi/pools')).json(),
    (await fetch('https://raw.githubusercontent.com/curvefi/curve-api-metadata/main/ethereum-lst-defillama.json')).json(),
  ]);
  if (status !== 'success') return FALLBACK_RETURN_VALUE;

  const map = arrayToHashmap(LST_METADATA.map(({ defillamaProps, lstAddress }) => [
    lc(lstAddress),
    (data.find(({
      chain,
      project,
      symbol,
    }) => (
      chain === 'Ethereum' &&
      project === defillamaProps.project &&
      symbol === defillamaProps.symbol
    ))?.apyMean30d / 100)
  ]));

  return map;
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // 30 min
  preFetch: true,
});

export default getETHLSTAPYs;
