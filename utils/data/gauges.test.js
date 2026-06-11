import {
  hasGaugeEmissionSignal,
  getMissingRequiredGauges,
} from './gauges.js';

describe('hasGaugeEmissionSignal()', () => {
  test('true when any emission-related field is positive', () => {
    expect(hasGaugeEmissionSignal({ prev_prev_epoch_emissions: 4801 })).toBe(true);
    expect(hasGaugeEmissionSignal({ gauge_relative_weight: 0.1 })).toBe(true);
    expect(hasGaugeEmissionSignal({ crv_apr_base: 2.5 })).toBe(true);
  });

  test('false when all emission-related fields are zero/nullish', () => {
    expect(hasGaugeEmissionSignal({
      emissions: 0,
      gauge_weight: '0',
      gauge_relative_weight: 0,
      crv_apr_base: null,
    })).toBe(false);
    expect(hasGaugeEmissionSignal({})).toBe(false);
  });
});

describe('getMissingRequiredGauges()', () => {
  // A required external (prices) gauge whose address is the address of a *root* gauge.
  // In the built dataset this gauge is represented by its sidechain CHILD gauge, with
  // the root address stored in `rootGauge` — never as a top-level `gauge`.
  const avalancheRootGauge = {
    address: '0xE40DeF1147775411Ce8Bd5a169dA0303200D438A',
    effective_address: null,
    prev_prev_epoch_emissions: 4801.73,
  };
  const builtSetWithChild = [
    { gauge: '0xf2f6a4261de8db55de31dbfc2b7b92a267bea3e2', rootGauge: '0xe40def1147775411ce8bd5a169da0303200d438a', blockchainId: 'avalanche' },
    { gauge: '0x1111111111111111111111111111111111111111' },
  ];

  test('a required root gauge present only as a child `rootGauge` is NOT missing', () => {
    const missing = getMissingRequiredGauges([avalancheRootGauge], builtSetWithChild);
    expect(missing).toEqual([]);
  });

  test('a required gauge present as a top-level `gauge` is NOT missing', () => {
    const required = [{ address: '0x1111111111111111111111111111111111111111', prev_prev_epoch_emissions: 10 }];
    expect(getMissingRequiredGauges(required, builtSetWithChild)).toEqual([]);
  });

  test('a required gauge absent from both `gauge` and `rootGauge` IS missing', () => {
    const required = [{ address: '0x9999999999999999999999999999999999999999', emissions: 5 }];
    expect(getMissingRequiredGauges(required, builtSetWithChild)).toEqual([
      '0x9999999999999999999999999999999999999999',
    ]);
  });

  test('non-emitting required gauges are ignored even if absent', () => {
    const required = [{ address: '0x9999999999999999999999999999999999999999', emissions: 0, gauge_weight: '0' }];
    expect(getMissingRequiredGauges(required, builtSetWithChild)).toEqual([]);
  });

  test('matching uses effective_address when present', () => {
    const required = [{ address: '0xdead', effective_address: '0xf2f6a4261de8db55de31dbfc2b7b92a267bea3e2', emissions: 1 }];
    expect(getMissingRequiredGauges(required, builtSetWithChild)).toEqual([]);
  });

  test('malformed emitting gauges without an address are ignored', () => {
    const required = [{ address: null, effective_address: null, emissions: 1 }];
    expect(getMissingRequiredGauges(required, builtSetWithChild)).toEqual([]);
  });

  // Regression: a cross-chain Avalanche root gauge (0xE40D…438A) gained an emission
  // signal after a 2026-05-27 vote. curve-prices listed it by its root address while
  // getAllGauges indexed it by its Avalanche child gauge (rootGauge=root). The old
  // sanity check matched only on child `gauge` addresses, so it flagged the root as
  // missing, threw, and froze the whole endpoint on stale data — hiding every newer
  // gauge. This must not regress.
  test('regression: emitting cross-chain root gauge does not fail the sanity check', () => {
    expect(getMissingRequiredGauges([avalancheRootGauge], builtSetWithChild)).toEqual([]);
  });
});
