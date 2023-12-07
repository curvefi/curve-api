// Matches the expected params of a function with exactly one object parameter
// E.g. async ({ blockchainId, version }) => {}
const FUNCTION_OBJECT_PARAM_REGEX = /^(?:async )?\({([a-zA-Z0-9,?\s]+)}\)/;

// Matches functions starting with `() =>` or `async () =>`
const FUNCTION_NO_PARAM_REGEX = /^(?:async )?\(\) =>/;

/**
 * Returns an array of param names for a function that should either have
 * no params at all, or a single param of type object.
 * E.g. the function `async ({ blockchainId, version }) => {}`
 * would return `['blockchainId', 'version']`
 * See test file for examples of valid/invalid params.
 */
const getFunctionParamObjectKeys = (fn) => {
  const fnString = fn.toString();
  const hasNoParams = FUNCTION_NO_PARAM_REGEX.test(fnString);
  if (hasNoParams) return [];

  const matches = FUNCTION_OBJECT_PARAM_REGEX.exec(fnString);
  if (matches === null) {
    throw new Error('API function does not have the expected parameter shape (it expects a signature with a single object)');
  }

  const paramString = matches[1];
  const params = paramString.match(/[a-zA-Z0-9]+/g);
  return params;
};

export {
  getFunctionParamObjectKeys,
};
