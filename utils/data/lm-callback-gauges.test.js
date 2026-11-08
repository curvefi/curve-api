import { arrayToHashmap } from '../Array.js';
import { getMissingRequiredGauges } from './gauges.js';
import {
  isLmCallbackGauge,
  getLmCallbackGaugeEntry,
} from './lm-callback-gauges.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// The first LM callback added to the gauge controller (2026-11-03): it rewards the collateral
// of the "Borrow crvUSD (reusdsfrx collateral)" LlamaLend market, and its `lp_token()` returns
// that collateral, the reUSD/sfrxUSD Curve LP token, which has its own gauge (0x5c0b…a4dd)
const reusdSfrxusdLmCallbackData = {
  address: '0x327A74BAF6cCB199d07642DCdfB4128f131c98ee',
  lpTokenAddress: '0xed785Af60bEd688baa8990cD5c4166221599A441',
  lmCallbackAmmAddress: '0xA305fF5Fe27B8194447700B34f522d79dF4400e5',
  lmCallbackCollateralTokenAddress: '0xed785Af60bEd688baa8990cD5c4166221599A441',
  lmCallbackIsDetached: false,
  isKilled: false,
  gaugeType: '0',
  inflationRate: '3080982847903985532',
  gaugeRelativeWeight: '1000000000000000',
  gaugeFutureRelativeWeight: '2000000000000000',
  getGaugeWeight: '765000000000000000000000',
};

// The same market's previous LM callback (gauge controller index 1043), from an early
// deployment that implements neither `lp_token()` nor `is_killed()` (multiCall reads the
// latter as false). It has since been detached from the AMM, i.e. retired
const reusdSfrxusdRetiredLmCallbackData = {
  ...reusdSfrxusdLmCallbackData,
  address: '0x80d4BC5bf87A4456DBe85DeAA57AAdD6289A9e3D',
  lpTokenAddress: '0x0000000000000000000000000000000000000000',
  lmCallbackIsDetached: true,
  isKilled: false,
  gaugeRelativeWeight: '0',
  gaugeFutureRelativeWeight: '0',
  getGaugeWeight: '0',
};

const reusdSfrxusdLendingVault = {
  name: 'Borrow crvUSD (reusdsfrx collateral)',
  address: '0xFe33BB533bb51E8b36a3AFd160bdC4F80ADcCA40',
  ammAddress: '0xA305fF5Fe27B8194447700B34f522d79dF4400e5',
  assets: {
    borrowed: { symbol: 'crvUSD' },
    collateral: { symbol: 'reusdsfrx' },
  },
};

// What multiCall returns for a regular gauge: AMM() and COLLATERAL_TOKEN() revert, and
// failed address calls are decoded as the zero address
const reusdSfrxusdPoolGaugeData = {
  address: '0x5c0b03914f68f2717d779a0211fd98c2cc45a4dd',
  lpTokenAddress: '0xed785Af60bEd688baa8990cD5c4166221599A441',
  lmCallbackAmmAddress: ZERO_ADDRESS,
  lmCallbackCollateralTokenAddress: ZERO_ADDRESS,
};

describe('isLmCallbackGauge()', () => {
  test('true for a gauge exposing both AMM() and COLLATERAL_TOKEN()', () => {
    expect(isLmCallbackGauge(reusdSfrxusdLmCallbackData)).toBe(true);
  });

  test('false for a regular gauge, whose LM callback getters decode as the zero address', () => {
    expect(isLmCallbackGauge(reusdSfrxusdPoolGaugeData)).toBe(false);
  });

  test('false when only one of the two getters returns an address', () => {
    expect(isLmCallbackGauge({ ...reusdSfrxusdLmCallbackData, lmCallbackCollateralTokenAddress: ZERO_ADDRESS })).toBe(false);
    expect(isLmCallbackGauge({ ...reusdSfrxusdLmCallbackData, lmCallbackAmmAddress: ZERO_ADDRESS })).toBe(false);
  });

  test('false for missing or malformed values', () => {
    expect(isLmCallbackGauge({})).toBe(false);
    expect(isLmCallbackGauge({ lmCallbackAmmAddress: 0, lmCallbackCollateralTokenAddress: '0x1234' })).toBe(false);
  });
});

describe('getLmCallbackGaugeEntry()', () => {
  test('describes a callback attached to a lending vault’s AMM', () => {
    const [key, entry] = getLmCallbackGaugeEntry(reusdSfrxusdLmCallbackData, { lendingVault: reusdSfrxusdLendingVault });

    expect(key).toBe('LM Callback: Borrow crvUSD (reusdsfrx collateral) (0x327A…98ee)');
    expect(entry).toEqual({
      blockchainId: 'ethereum',
      isPool: false,
      name: key,
      shortName: 'lm-crvUSD(reusdsfrx) (0x327A…)',
      gauge: '0x327a74baf6ccb199d07642dcdfb4128f131c98ee',
      gaugeType: '0',
      gauge_data: {
        inflation_rate: '3080982847903985532',
        working_supply: '0',
      },
      gauge_controller: {
        gauge_relative_weight: '1000000000000000',
        gauge_future_relative_weight: '2000000000000000',
        get_gauge_weight: '765000000000000000000000',
        inflation_rate: '3080982847903985532',
      },
      side_chain: false,
      is_killed: false,
      hasNoCrv: false,
      lmCallback: {
        ammAddress: '0xa305ff5fe27b8194447700b34f522d79df4400e5',
        collateralTokenAddress: '0xed785af60bed688baa8990cd5c4166221599a441',
        lendingVaultAddress: '0xfe33bb533bb51e8b36a3afd160bdc4f80adcca40',
      },
    });
  });

  test('never claims the pool or lending vault as its own', () => {
    // getPools and getLendingVaults take the first entry with a matching `swap` or
    // `lendingVaultAddress` as the pool's or vault's gauge
    const [, entry] = getLmCallbackGaugeEntry(reusdSfrxusdLmCallbackData, { lendingVault: reusdSfrxusdLendingVault });

    expect(entry.swap).toBeUndefined();
    expect(entry.swap_token).toBeUndefined();
    expect(entry.lendingVaultAddress).toBeUndefined();
  });

  test('falls back to a generic name when the AMM isn’t a known lending vault (e.g. a crvUSD mint market)', () => {
    const [key, entry] = getLmCallbackGaugeEntry(reusdSfrxusdLmCallbackData);

    expect(key).toBe('LM Callback (0x327A…98ee)');
    expect(entry.shortName).toBe('LM Callback (0x327A…)');
    expect(entry.lmCallback.lendingVaultAddress).toBeUndefined();
  });

  test('short names stay within 32 characters', () => {
    const [, entry] = getLmCallbackGaugeEntry(reusdSfrxusdLmCallbackData, {
      lendingVault: {
        ...reusdSfrxusdLendingVault,
        assets: { borrowed: { symbol: 'crvUSD' }, collateral: { symbol: 'aVeryLongCollateralSymbol' } },
      },
    });

    expect(entry.shortName.length).toBeLessThanOrEqual(32);
  });

  test('successive callbacks for the same market get distinct keys', () => {
    const [currentKey] = getLmCallbackGaugeEntry(reusdSfrxusdLmCallbackData, { lendingVault: reusdSfrxusdLendingVault });
    const [retiredKey] = getLmCallbackGaugeEntry(reusdSfrxusdRetiredLmCallbackData, { lendingVault: reusdSfrxusdLendingVault });

    expect(retiredKey).toBe('LM Callback: Borrow crvUSD (reusdsfrx collateral) (0x80d4…9e3D)');
    expect(currentKey).not.toBe(retiredKey);
  });

  test('a callback detached from its AMM is killed, even without an is_killed() of its own', () => {
    const [, retiredEntry] = getLmCallbackGaugeEntry(reusdSfrxusdRetiredLmCallbackData, { lendingVault: reusdSfrxusdLendingVault });
    const [, killedEntry] = getLmCallbackGaugeEntry({ ...reusdSfrxusdLmCallbackData, isKilled: true });

    expect(retiredEntry.is_killed).toBe(true);
    expect(killedEntry.is_killed).toBe(true);
  });

  // Regression: when the callback above was added to the gauge controller, it was keyed by the
  // name of the pool its `lp_token()` points to, overwrote that pool's gauge (0x5c0b…a4dd),
  // and the required-gauges check then rejected every rebuild of the Ethereum scope
  test('regression: the pool’s gauge and the LM callback both survive and pass the required-gauges check', () => {
    const poolGaugeKey = 'reUSD+sfrxUSD (0xed78…A441)';
    const builtGauges = {
      ...arrayToHashmap([[poolGaugeKey, { gauge: reusdSfrxusdPoolGaugeData.address, swap: '0xed785af60bed688baa8990cd5c4166221599a441' }]]),
      ...arrayToHashmap([getLmCallbackGaugeEntry(reusdSfrxusdLmCallbackData, { lendingVault: reusdSfrxusdLendingVault })]),
    };
    const requiredExternalGauges = [
      { address: '0x5c0b03914f68f2717d779a0211fd98c2cc45a4dd', gauge_relative_weight: 0.0058 },
      { address: '0x327A74BAF6cCB199d07642DCdfB4128f131c98ee', gauge_relative_weight: 0.001 },
    ];

    expect(builtGauges[poolGaugeKey].gauge).toBe('0x5c0b03914f68f2717d779a0211fd98c2cc45a4dd');
    expect(getMissingRequiredGauges(requiredExternalGauges, Object.values(builtGauges))).toEqual([]);
  });
});
