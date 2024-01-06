import memoize from 'memoizee';
import { flattenArray } from '#root/utils/Array.js';
import { lc } from '#root/utils/String.js';

const FALLBACK_RETURN_VALUE = {};

// Returns an array of `[lstAddress, blockchainId, stakingApy]`
const getETHLSTAPYs = memoize(async () => {
  const [
    { status, data },
    LST_METADATA,
  ] = await Promise.all([
    (await fetch('https://yields.llama.fi/pools')).json(),
    (await fetch('https://raw.githubusercontent.com/curvefi/curve-api-metadata/main/ethereum-lst-defillama.json')).json(),
  ]);
  if (status !== 'success') return FALLBACK_RETURN_VALUE;

  const map = flattenArray(LST_METADATA.map(({ defillamaProps, lstAddresses }) => {
    const stakingApy = (data.find(({
      chain,
      project,
      symbol,
    }) => (
      chain === 'Ethereum' &&
      project === defillamaProps.project &&
      symbol === defillamaProps.symbol
    ))?.apyMean30d / 100) || 0; // Default to 0 if not found

    return lstAddresses.map(({ address, blockchainId }) => ({
      lstAddress: lc(address),
      blockchainId,
      stakingApy,
    }));
  }));

  return map;
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // 30 min
  preFetch: true,
});

export default getETHLSTAPYs;
