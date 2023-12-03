import swr from './swr.js';
import { IS_DEV } from '../constants/AppConstants.js';

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

const logRuntime = async (fn, name, query, silenceParamsLog) => {
  const startMs = getNowMs();

  const res = await fn();

  const endMs = getNowMs();
  if (IS_DEV) {
    const queryText = silenceParamsLog ? 'QUERY_LOGGING_SILENCED' : query;
    console.log('Run time (ms):', endMs - startMs, name, queryText);
  }

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
    maxAge: maxAgeSec = null, // Caching duration, in seconds
    cacheKey,
    name = null, // Name, used for logging purposes
    returnFlatData = false,
    silenceParamsLog = false, // Don't log params (can be used because the fn is passed a huge object that creates noise)
  } = options;

  if (maxAgeSec !== null && !cacheKey) {
    throw new Error('cacheKey not defined: a cacheKey must be set when using maxAge');
  }

  const callback = (
    maxAgeSec !== null ? (
      async (query) => (await swr(
        cacheKey,
        async () => logRuntime(() => addGeneratedTime(cb(query)), name, query, silenceParamsLog),
        { minTimeToStale: maxAgeSec * 1000 } // See CacheSettings.js
      )).value
    ) : (
      async (query) => logRuntime(() => addGeneratedTime(cb(query)), name, query, silenceParamsLog)
    )
  );

  const apiCall = async (req, res) => (
    Promise.resolve(callback(req.query))
      .then((data) => {
        if (maxAgeSec !== null) res.setHeader('Cache-Control', `max-age=0, s-maxage=${maxAgeSec}, stale-while-revalidate`);
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
