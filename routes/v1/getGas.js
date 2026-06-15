/**
 * @openapi
 * /getGas:
 *   get:
 *     tags:
 *       - Misc
 *     description: Returns Ethereum gas prices (in wei), computed onchain from `eth_feeHistory`
 *     responses:
 *       200:
 *         description:
 */

import * as WEB3_CONSTANTS from '#root/constants/Web3.js';
import { fn } from '#root/utils/api.js';

// Number of recent blocks sampled to compute priority-fee percentiles.
const FEE_HISTORY_BLOCK_COUNT = 20;

// Reward (priority fee) percentiles requested from `eth_feeHistory`, mapped to
// the speed tiers that were previously derived from Blocknative confidence
// levels (this preserves the exact same response shape for API consumers):
//   10th percentile -> slow
//   25th percentile -> standard
//   50th percentile -> fast
//   75th percentile -> rapid
// These are intentionally NOT the high percentiles that correspond to
// Blocknative's confidence levels. Blocknative confidence is a probability of
// inclusion (a relatively modest tip), not a percentile of the tip
// distribution. The upper tail of onchain tips (~90th percentile and above) is
// dominated by MEV/arbitrage/liquidation bundles paying outsized tips, so
// reusing those percentiles would significantly overshoot the previous
// estimates. The top tier is therefore capped at the 75th percentile to stay
// below that MEV-dominated tail.
// Percentiles must be provided to `eth_feeHistory` in ascending order.
const REWARD_PERCENTILES = [10, 25, 50, 75];

const hexToNumber = (hex) => Number(BigInt(hex ?? '0x0'));

const fetchFeeHistory = async (rpcUrl) => {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_feeHistory',
      params: [`0x${FEE_HISTORY_BLOCK_COUNT.toString(16)}`, 'latest', REWARD_PERCENTILES],
    }),
  });

  const { result, error } = await res.json();
  if (error || !result) {
    throw new Error(`eth_feeHistory failed: ${error ? error.message : 'no result returned'}`);
  }

  return result;
};

const getOnchainGasData = async () => {
  // Fall back to the backup RPC if the primary provider is unavailable.
  let feeHistory;
  try {
    feeHistory = await fetchFeeHistory(WEB3_CONSTANTS.RPC_URL);
  } catch (err) {
    feeHistory = await fetchFeeHistory(WEB3_CONSTANTS.RPC_BACKUP_URL);
  }

  const { baseFeePerGas, reward } = feeHistory;

  // `baseFeePerGas` contains `blockCount + 1` entries; the last one is the
  // predicted base fee for the next block (the same value Blocknative used to
  // return as `baseFeePerGas`). Already denominated in wei.
  const baseFee = hexToNumber(baseFeePerGas[baseFeePerGas.length - 1]);

  // Average each percentile column across the sampled blocks to smooth out
  // per-block noise (e.g. occasional empty blocks).
  const rewardRows = (reward || []).filter((row) => Array.isArray(row));
  const priorityFees = REWARD_PERCENTILES.map((unusedPercentile, percentileIndex) => {
    if (rewardRows.length === 0) return 0;
    const sum = rewardRows.reduce((acc, row) => acc + hexToNumber(row[percentileIndex]), 0);
    return Math.round(sum / rewardRows.length);
  });

  // `priorityFees` is ordered [slow, standard, fast, rapid], matching REWARD_PERCENTILES.
  const [slowPrio, standardPrio, fastPrio, rapidPrio] = priorityFees;

  return {
    baseFee,
    rapidPrio,
    fastPrio,
    standardPrio,
    slowPrio,
  };
};

const CACHE_PROPS = {
  maxAge: 30,
  cacheKey: 'getGas',
};

export default fn(async () => {
  const {
    baseFee,
    rapidPrio,
    fastPrio,
    standardPrio,
    slowPrio,
  } = await getOnchainGasData();

  // `maxFeePerGas` adds a 2x buffer on the base fee so transactions stay valid
  // across several blocks of rising base fees (standard wallet behavior).
  const maxFeePerGas = (priorityFee) => (baseFee * 2) + priorityFee;

  const eip1559Gas = {
    base: baseFee,
    prio: [rapidPrio, fastPrio, standardPrio, slowPrio],
    max: [rapidPrio, fastPrio, standardPrio, slowPrio].map(maxFeePerGas),
  };

  return {
    gas: {
      rapid: baseFee + rapidPrio,
      fast: baseFee + fastPrio,
      standard: baseFee + standardPrio,
      slow: baseFee + slowPrio,
    },
    eip1559Gas,
  };
}, CACHE_PROPS);
