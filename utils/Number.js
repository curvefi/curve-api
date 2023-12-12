import memoize from 'memoizee';
import BN from 'bignumber.js';

// Note: rounds if necessary
const trunc = (number, decimals = 0) => parseFloat(number).toFixed(decimals);

// Same as trunc(), but removes decimals if they were all 0
// E.g. trunc(55, 2) === '55.00'; truncWithoutZeroDecimals(55, 2) === '55'
const trailingZeroesRegex = /^.+?(\.?0*)$/;
const integerRegex = /^\d*$/;
const truncWithoutZeroDecimals = (numberBN, decimals = 0) => {
  if (!(numberBN instanceof BN)) {
    throw new Error('truncWithoutZeroDecimals(numberBN) expects numberBN to be an instance of BigNumber');
  }

  const trunced = numberBN.toFixed(decimals);
  if (integerRegex.test(trunced)) return trunced;

  const zeroesMatches = trailingZeroesRegex.exec(trunced);
  if (zeroesMatches !== null && zeroesMatches[1] !== '') {
    return trunced.slice(0, trunced.length - zeroesMatches[1].length);
  }
  return trunced;
};

const formatLargeNumber = (numberBN, decimalCount = 2) => {
  if (!(numberBN instanceof BN)) {
    throw new Error('truncWithoutZeroDecimals(numberBN) expects numberBN to be an instance of BigNumber');
  }

  return (
    numberBN.gt(1e6) ? `${localNumber(truncWithoutZeroDecimals(numberBN.div(1e6), 1), undefined, decimalCount)}m` :
      numberBN.gt(1e5) ? `${localNumber(truncWithoutZeroDecimals(numberBN.div(1e3), 1), undefined, decimalCount)}k` :
        numberBN.gt(1) ? localNumber(truncWithoutZeroDecimals(numberBN, decimalCount), undefined, decimalCount) :
          truncWithXSignificantDecimals(numberBN)
  );
};

// Use, in order of preference, depending on support:
// - Intl.NumberFormat.prototype.format: it's the most performant
// - Number.toLocaleString: does the same thing, but way slower
// - No formatting at all if no support
const getNumberFormatter = memoize((minimumFractionDigits, maximumFractionDigits) => (
  (typeof window !== 'undefined' && window.Intl && window.Intl.NumberFormat) ?
    new Intl.NumberFormat(undefined, { minimumFractionDigits, maximumFractionDigits }).format :
    Number.toLocaleString ?
      (number) => (
        Number(number).toLocaleString(undefined, { minimumFractionDigits, maximumFractionDigits })
      ) :
      (number) => Number(number)
), { length: 2 });

const localNumber = (
  number,
  minimumFractionDigits = undefined,
  maximumFractionDigits = undefined
) => (
  getNumberFormatter(minimumFractionDigits, maximumFractionDigits)(number)
);

const truncWithXSignificantDecimals = (numberBN, decimalCount = 2) => {
  if (!(numberBN instanceof BN)) {
    throw new Error('truncWithXSignificantDecimals(numberBN) expects numberBN to be an instance of BigNumber');
  }

  const positiveNumberBN = numberBN.abs();
  let lownessThreshold = 0.1;
  let decimalPlaces = 1;

  while (positiveNumberBN.lt(lownessThreshold) && lownessThreshold > 1e-10) {
    lownessThreshold /= 10;
    decimalPlaces += 1;
  }

  return truncWithoutZeroDecimals(numberBN, decimalPlaces + decimalCount - 1);
};

// Returns the decimals number, rather than the number of decimals
// E.g. 18 -> 1e18; noop if already a decimals number, e.g. 1e18 -> 1e18
const decimalsNumber = (decimals) => (
  decimals > 18 ? decimals : (10 ** decimals)
);

const addTtlRandomness = (ttl) => Math.trunc(
  ttl < 20 ? ttl :
  ttl < 60 ? (ttl - (Math.random() * 10) + (Math.random() * 20)) : // between -10 and +30 of initial ttl
  ttl < 120 ? (ttl - (Math.random() * 20) + (Math.random() * 40)) : // between -20 and +60 of initial ttl
  (ttl - (Math.random() * 30) + (Math.random() * 60)) // between -30 and +90 of initial ttl
);

export {
  trunc,
  formatLargeNumber,
  truncWithoutZeroDecimals,
  truncWithXSignificantDecimals,
  localNumber,
  decimalsNumber,
  addTtlRandomness,
};
