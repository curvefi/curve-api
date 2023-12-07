/* eslint-env jest */

// NOTE: for testing purposes, transform the imported file to commonjs format for Jest compatibility
const { getFunctionParamObjectKeys } = require('./Function.js');

describe('Function utils', () => {
  test('getFunctionParamObjectKeys()', () => {
    const functionWithoutParams = () => { };
    const functionWithExpectedShape1 = async ({ blockchainId, version }) => { };
    const functionWithExpectedShape2 = async ({
      blockchainId,
      version,
    }) => { };
    const functionWithUnexpectedShape1 = async ({ blockchainId, version } = {}) => { };
    const functionWithUnexpectedShape2 = async ({ blockchainId } = {}) => { };

    expect(getFunctionParamObjectKeys(functionWithoutParams)).toEqual([]);
    expect(getFunctionParamObjectKeys(functionWithExpectedShape1)).toEqual(['blockchainId', 'version']);
    expect(getFunctionParamObjectKeys(functionWithExpectedShape2)).toEqual(['blockchainId', 'version']);
    expect(() => getFunctionParamObjectKeys(functionWithUnexpectedShape1)).toThrow('API function does not have the expected parameter shape');
    expect(() => getFunctionParamObjectKeys(functionWithUnexpectedShape2)).toThrow('API function does not have the expected parameter shape');
  });
});
