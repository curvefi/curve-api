/**
 * Helpers for reconciling the gauges built by getAllGauges against the external
 * (curve-prices) gauge list.
 */

import { lc } from '#root/utils/String.js';

/**
 * A gauge "has an emission signal" if curve-prices reports any positive value
 * among its current/recent emissions, weight, or CRV APR. Such gauges are the
 * ones getAllGauges treats as mandatory: the present endpoint must return at
 * least all of them.
 */
const hasGaugeEmissionSignal = ({
  emissions,
  prev_epoch_emissions,
  prev_prev_epoch_emissions,
  gauge_weight,
  gauge_relative_weight,
  crv_apr_base,
  crv_apr_boosted,
}) => (
  [
    emissions,
    prev_epoch_emissions,
    prev_prev_epoch_emissions,
    gauge_weight,
    gauge_relative_weight,
    crv_apr_base,
    crv_apr_boosted,
  ].some((value) => Number(value) > 0)
);

/**
 * Given the list of *required* external gauges (those with an emission signal)
 * and the gauges built by getAllGauges, returns the lowercased addresses of any
 * required gauge that is absent from the built set.
 *
 * A required gauge is considered present if its address matches either:
 *  - a built gauge's own address (`gauge`), or
 *  - a built gauge's `rootGauge`.
 *
 * The `rootGauge` match is essential: curve-prices lists cross-chain gauges by
 * their *root* (mainnet) address, whereas getAllGauges indexes them by their
 * *child* (sidechain) address and only stores the root in `rootGauge`. Without
 * this, every root gauge that gains an emission signal would be reported as
 * missing, failing the sanity check and freezing the whole endpoint on stale data.
 */
const getMissingRequiredGauges = (requiredExternalGauges, builtGauges) => {
  const builtAddresses = new Set();
  for (const builtGauge of builtGauges) {
    if (builtGauge.gauge) builtAddresses.add(lc(builtGauge.gauge));
    if (builtGauge.rootGauge) builtAddresses.add(lc(builtGauge.rootGauge));
  }

  return requiredExternalGauges
    .filter(hasGaugeEmissionSignal)
    .map((gaugeData) => lc(gaugeData.effective_address ?? gaugeData.address))
    .filter((address) => address && !builtAddresses.has(address));
};

export {
  hasGaugeEmissionSignal,
  getMissingRequiredGauges,
};
