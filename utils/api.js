import configs from '#root/constants/configs/index.js';
import swr from '#root/utils/swr.js';
import { IS_DEV } from '#root/constants/AppConstants.js';
import { arrayToHashmap } from '#root/utils/Array.js';
import { getFunctionParamObjectKeys } from '#root/utils/Function.js';

const getNowMs = () => Number(Date.now());
const allBlockchainIds = Object.keys(configs);
const allRegistryIds = [
  'factory',
  'main',
  'crypto',
  'factory-crypto',
  'factory-crvusd',
  'factory-tricrypto',
  'factory-eywa',
  'factory-stable-ng',
];

const formatJsonSuccess = ({ generatedTimeMs, ...data }, success = true) => ({
  success: true,
  data,
  generatedTimeMs,
  servedFrom: 'aws',
});

const formatJsonError = (err) => ({
  success: false,
  err: err.toString ? err.toString() : err,
});

const addGeneratedTime = async (res) => ({
  ...await res,
  generatedTimeMs: getNowMs(),
});

// cacheKey is undefined for pass-through functions that are deliberately not cached
const logRuntime = async (fn, cacheKey) => {
  const startMs = getNowMs();

  const res = await fn();

  const endMs = getNowMs();

  // Important: do not alter this log statement, it's used for analytics and alarms
  console.log('Run time (ms):', endMs - startMs, cacheKey);

  return res;
};

class ParamError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * A param sanitizer function must return an object of shape:
 * ```
 * {
 *   isValid: Boolean, // required; if the param is defined, tells whether it is valid
 *   defaultValue: Any, // optional; if the param is undefined, this value will be used
 * }
 * ```
 */
const sanitizeParams = (cb, query, paramSanitizers) => {
  const fnParamKeys = getFunctionParamObjectKeys(cb);

  // Run sanitizers
  const sanitizedParams = arrayToHashmap(fnParamKeys.reduce((sanitizedParamsAccu, key) => {
    const sanitizerFn = paramSanitizers[key];
    if (typeof sanitizerFn === 'undefined') {
      throw new Error(`Missing param sanitizer function for param ${key}`);
    }

    const partlySanitizedQuery = {
      ...query,
      ...arrayToHashmap(sanitizedParamsAccu),
    };

    const { isValid, defaultValue } = sanitizerFn(partlySanitizedQuery);
    if (typeof partlySanitizedQuery[key] === 'undefined') {
      if (typeof defaultValue !== 'undefined') {
        return [
          ...sanitizedParamsAccu,
          [key, defaultValue],
        ];
      } else {
        throw new ParamError(`Value for param "${key}" is undefined, but no defaultValue was returned by sanitizer function`);
      }
    } else if (isValid === true) {
      return [
        ...sanitizedParamsAccu,
        [key, partlySanitizedQuery[key]],
      ];
    } else {
      throw new ParamError(`Invalid value for param "${key}": "${partlySanitizedQuery[key]}"`);
    }
  }, []));

  return sanitizedParams;
};

const DEFAULT_OPTIONS = {
  maxAge: null, // Caching duration for both redis and CDN, in seconds
  cacheKey: undefined,
  maxAgeCDN: null,
  returnFlatData: false,
  paramSanitizers: {
    blockchainId: ({ blockchainId }) => ({
      isValid: allBlockchainIds.includes(blockchainId),
      defaultValue: 'ethereum',
    }),
    // Note: we could technically go as far as checking if the registry is part of
    // the provided blockchainId (since both params are always passed together), but
    // the `getPools` endpoint needs, for historical reasons, to return a plain
    // 200 response with an empty array in case of a non-existing registryId<>blockchainId
    // combination, so we let the api endpoint logic handle this case and remain generic.
    registryId: ({ registryId }) => ({
      isValid: allRegistryIds.includes(registryId),
      defaultValue: 'main',
    }),
  },
};



const fn = (cb, options = {}) => {
  const {
    maxAge: maxAgeSec = null, // Caching duration for both redis and CDN, in seconds
    cacheKey, // Either a function that's passed the call's params and returns a string, or a static string
    maxAgeCDN = null, // Caching duration for CDN only, in seconds
    returnFlatData = false,
    paramSanitizers,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
    paramSanitizers: {
      ...DEFAULT_OPTIONS.paramSanitizers,
      ...(options.paramSanitizers || {}),
    },
  };

  if (maxAgeSec !== null && !cacheKey) {
    throw new Error('cacheKey not defined: a cacheKey must be set when using maxAge');
  }

  const callback = (
    maxAgeSec !== null ? (
      async (query) => {
        const params = sanitizeParams(cb, query, paramSanitizers);
        const cacheKeyStr = (typeof cacheKey === 'function' ? cacheKey(params) : cacheKey);

        return (await swr(
          cacheKeyStr,
          async () => logRuntime(() => addGeneratedTime(cb(params)), cacheKeyStr),
          { minTimeToStale: maxAgeSec * 1000 } // See CacheSettings.js
        )).value;
      }
    ) : (
      async (query) => {
        const params = sanitizeParams(cb, query, paramSanitizers);
        const cacheKeyStr = (typeof cacheKey === 'function' ? cacheKey(params) : cacheKey);

        return logRuntime(() => addGeneratedTime(cb(params)), cacheKeyStr);
      }
    )
  );

  const apiCall = async (req, res) => (
    Promise.resolve(callback({
      ...req.query,
      ...req.params,
    }))
      .catch((err) => {
        const code = (
          (err instanceof ParamError) ? 400 :
            (err instanceof NotFoundError) ? 400 :
              500
        );

        if (code === 500) throw err;
        else return err;
      })
      .then((data) => {
        // maxAgeSec is halved so that the two swr caches don't add up to twice the caching time
        const maxAgeCdnValue = maxAgeCDN ?? (maxAgeSec / 2);
        const maxAgeBrowserValue = IS_DEV ? 0 : 30;

        // Send a 200 response for expected errors
        const isSoftError = (
          (data instanceof ParamError) ||
          (data instanceof NotFoundError)
        );
        if (isSoftError) {
          data = {
            err: data.toString(),
          };
        }

        if (maxAgeSec !== null) res.setHeader('Cache-Control', `max-age=${maxAgeBrowserValue}, s-maxage=${maxAgeCdnValue}, stale-while-revalidate`);
        const success = !isSoftError;
        res.status(200).json(
          returnFlatData ?
            data :
            formatJsonSuccess(data, success)
        );
      })
      .catch((err) => {
        res.status(500).json(formatJsonError(err));
      })
  );

  apiCall.straightCall = callback;

  return apiCall;
};

export {
  fn,
  formatJsonError,
  ParamError,
  NotFoundError,
};
