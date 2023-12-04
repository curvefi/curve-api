/* eslint-env jest */

import BN from 'bignumber.js';
import { truncWithoutZeroDecimals, formatLargeNumber } from './Number.js';

describe('Number utils', () => {
  test('truncWithoutZeroDecimals()', () => {
    expect(truncWithoutZeroDecimals(BN(2.02), 2)).toBe('2.02');
    expect(truncWithoutZeroDecimals(BN(2.02), 1)).toBe('2');
    expect(truncWithoutZeroDecimals(BN(2.02), 8)).toBe('2.02');
    expect(truncWithoutZeroDecimals(BN(2.02), 0)).toBe('2');
    expect(truncWithoutZeroDecimals(BN(2.00), 0)).toBe('2');
    expect(truncWithoutZeroDecimals(BN(2.00))).toBe('2');
  });

  test('formatLargeNumber()', () => {
    expect(formatLargeNumber(BN(1200000))).toBe('1.2m');
    expect(formatLargeNumber(BN(120000))).toBe('120k');
    expect(formatLargeNumber(BN(1200))).toBe('1,200');
  });

  test('formatLargeNumber()', () => {
    expect(formatLargeNumber(BN(1200000))).toBe('1.2m');
    expect(formatLargeNumber(BN(120000))).toBe('120k');
    expect(formatLargeNumber(BN(1.23456))).toBe('1.23');
    expect(formatLargeNumber(BN(0.23456))).toBe('0.23');
    expect(formatLargeNumber(BN(0.00456))).toBe('0.0046');
    expect(formatLargeNumber(BN(0.0005))).toBe('0.0005');
    expect(formatLargeNumber(BN(0.1005))).toBe('0.1');
    expect(formatLargeNumber(BN(0.000067))).toBe('0.000067');
    expect(formatLargeNumber(BN(3509.4303209777585), 0)).toBe('3,509');
    expect(formatLargeNumber(BN(3510), 0)).toBe('3,510');
  });
});
