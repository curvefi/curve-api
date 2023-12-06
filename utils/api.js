import swr from '#root/utils/swr.js';
import { IS_DEV } from '#root/constants/AppConstants.js';

const getNowMs = () => Number(Date.now());

const formatJsonSuccess = ({ generatedTimeMs, ...data }) => ({
  success: true,
  data,
  generatedTimeMs,
});

const formatJsonError = (err) => ({
  success: false,
  err: err.toString ? err.toString() : err,
});

const addGeneratedTime = async (res) => ({
  ...await res,
  generatedTimeMs: getNowMs(),
});

const logRuntime = async (fn, cacheKey) => {
  const startMs = getNowMs();

  const res = await fn();

  const endMs = getNowMs();
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

const fn = (cb, options = {}) => {
  const {
    maxAge: maxAgeSec = null, // Caching duration for both redis and CDN, in seconds
    cacheKey, // Either a function that's passed the call's params and returns a string, or a static string
    maxAgeCDN = null, // Caching duration for CDN only, in seconds
    returnFlatData = false,
  } = options;

  if (maxAgeSec !== null && !cacheKey) {
    throw new Error('cacheKey not defined: a cacheKey must be set when using maxAge');
  }

  const callback = (
    maxAgeSec !== null ? (
      async (query) => (await swr(
        (typeof cacheKey === 'function' ? cacheKey(query) : cacheKey),
        async () => logRuntime(() => addGeneratedTime(cb(query)), (typeof cacheKey === 'function' ? cacheKey(query) : cacheKey)),
        { minTimeToStale: maxAgeSec * 1000 } // See CacheSettings.js
      )).value
    ) : (
      async (query) => logRuntime(() => addGeneratedTime(cb(query)), (typeof cacheKey === 'function' ? cacheKey(query) : cacheKey))
    )
  );

  const apiCall = async (req, res) => (
    Promise.resolve(callback({
      ...req.query,
      ...req.params,
    }))
      .then((data) => {
        // max-age is browser caching, s-maxage is cdn caching
        if (maxAgeSec !== null) res.setHeader('Cache-Control', `max-age=${IS_DEV ? '0' : '30'}, s-maxage=${maxAgeCDN ?? maxAgeSec}, stale-while-revalidate`);
        res.status(200).json(
          returnFlatData ?
            data :
            formatJsonSuccess(data)
        );
      })
      .catch((err) => {
        if (IS_DEV) {
          throw err;
        } else {
          const code = (
            (err instanceof ParamError) ? 200 :
              (err instanceof NotFoundError) ? 404 :
                500
          );
          res.status(code).json(formatJsonError(err));
        }
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
