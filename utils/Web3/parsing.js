import BN from 'bignumber.js';

const uintToBN = (uint256, decimals) => (
  typeof uint256 !== 'undefined' ?
    BN(uint256).div(10 ** decimals) :
    undefined
);

const numberToUint = (number, decimals) => {
  if (typeof number === 'undefined' || typeof decimals === 'undefined') {
    throw new Error('Missing some mandatory parameters for numberToUint(number, decimals)');
  }

  return BN(number).times(10 ** decimals).toFixed();
};

export {
  uintToBN,
  numberToUint,
};
