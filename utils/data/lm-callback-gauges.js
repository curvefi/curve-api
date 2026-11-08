/**
 * Helpers for the LlamaLend/crvUSD LM callbacks found in the gauge controller.
 *
 * An LM callback works like a gauge for a market's collateral: it's attached to the
 * market's AMM and pays CRV to borrowers' collateral, and the gauge controller treats it
 * like any other gauge. For compatibility it also exposes `lp_token()`, which returns the
 * collateral token. When that collateral is a Curve LP token, the callback looks like a
 * second gauge for that pool: getAllGauges keys gauges by pool name, so the callback used
 * to overwrite the pool's real gauge, which then failed the required-gauges check and
 * froze the whole Ethereum scope on stale data (see lm-callback-gauges.test.js).
 */

import { lc, maxChars } from '#root/utils/String.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const isNonZeroAddress = (address) => (
  typeof address === 'string' &&
  /^0x[0-9a-f]{40}$/i.test(address) &&
  lc(address) !== ZERO_ADDRESS
);

/**
 * Regular gauges don't have the `AMM()` and `COLLATERAL_TOKEN()` getters of the LM
 * callback interface (ILMCallback): calls to them revert, and multiCall decodes failed
 * address calls as the zero address. Requiring both keeps a stray non-zero answer to
 * a single call from turning a pool gauge into an LM callback.
 */
const isLmCallbackGauge = ({ lmCallbackAmmAddress, lmCallbackCollateralTokenAddress }) => (
  isNonZeroAddress(lmCallbackAmmAddress) &&
  isNonZeroAddress(lmCallbackCollateralTokenAddress)
);

/**
 * Names include the callback's own address rather than its market's: an AMM can be
 * given a new callback over time, and each one is a separate gauge.
 */
const getLmCallbackGaugeName = ({ address, lendingVault }) => (
  typeof lendingVault !== 'undefined' ?
    `LM Callback: ${lendingVault.name} (${address.slice(0, 6)}…${address.slice(-4)})` :
    `LM Callback (${address.slice(0, 6)}…${address.slice(-4)})`
);

const getLmCallbackGaugeShortName = ({ address, lendingVault }) => (
  typeof lendingVault !== 'undefined' ?
    `${maxChars(`lm-${lendingVault.assets.borrowed.symbol}(${lendingVault.assets.collateral.symbol})`, 22)} (${address.slice(0, 6)}…)` : // Max 32 chars long
    `LM Callback (${address.slice(0, 6)}…)`
);

/**
 * Returns the [name, gauge] entry for an LM callback found in the gauge controller.
 *
 * `lendingVault` is the LlamaLend vault whose AMM the callback is attached to, if any
 * (LM callbacks can also be attached to crvUSD mint markets, which aren't lending vaults).
 *
 * The entry deliberately leaves `swap` and `lendingVaultAddress` unset: getPools and
 * getLendingVaults use the first entry with a matching `swap` or `lendingVaultAddress`
 * as a pool's or vault's gauge, and the callback is neither (a vault's own gauge rewards
 * lenders, its LM callback rewards borrowers' collateral). The market is described in
 * `lmCallback` instead. CRV APYs aren't computed: callbacks have no `working_supply()`,
 * and their rewards accrue to collateral in the AMM rather than to staked tokens.
 *
 * `is_killed` also covers callbacks that were detached from their AMM: those are retired
 * for good (current callbacks report it through `is_killed()` too), and early deployments
 * don't implement `is_killed()` at all, which multiCall reads as false.
 */
const getLmCallbackGaugeEntry = (gaugeData, { lendingVault } = {}) => {
  const name = getLmCallbackGaugeName({ address: gaugeData.address, lendingVault });

  return [name, {
    blockchainId: 'ethereum', // LM callbacks only receive CRV through the Ethereum gauge controller
    isPool: false,
    name,
    shortName: getLmCallbackGaugeShortName({ address: gaugeData.address, lendingVault }),
    gauge: lc(gaugeData.address),
    gaugeType: gaugeData.gaugeType,
    gauge_data: {
      inflation_rate: gaugeData.inflationRate,
      working_supply: '0',
    },
    gauge_controller: {
      gauge_relative_weight: gaugeData.gaugeRelativeWeight,
      gauge_future_relative_weight: gaugeData.gaugeFutureRelativeWeight,
      get_gauge_weight: gaugeData.getGaugeWeight,
      inflation_rate: gaugeData.inflationRate,
    },
    side_chain: false,
    is_killed: gaugeData.isKilled || gaugeData.lmCallbackIsDetached === true,
    hasNoCrv: false, // Found through the gauge controller
    lmCallback: {
      ammAddress: lc(gaugeData.lmCallbackAmmAddress),
      collateralTokenAddress: lc(gaugeData.lmCallbackCollateralTokenAddress),
      lendingVaultAddress: typeof lendingVault !== 'undefined' ? lc(lendingVault.address) : undefined,
    },
  }];
};

export {
  isLmCallbackGauge,
  getLmCallbackGaugeEntry,
};
