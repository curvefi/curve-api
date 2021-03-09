import memoize from 'memoizee';
import { IS_DEV } from 'constants/AppConstants';

const formatJsonSuccess = (data) => ({
  success: true,
  data,
});

const formatJsonError = (err) => ({
  success: false,
  err: err.toString ? err.toString() : err,
});

const addGeneratedTime = async (res) => ({
  ...await res,
  generatedTimeMs: +Date.now(),
});

const fn = (cb, options = {}) => {
  const {
    maxAge: maxAgeSec = null, // Caching duration, in seconds
  } = options;

  const callback = maxAgeSec !== null ?
    memoize(async (query) => addGeneratedTime(cb(query)), {
      promise: true,
      maxAge: maxAgeSec * 1000,
      normalizer: ([query]) => JSON.stringify(query), // Separate cache entries for each route & query params,
    }) :
    async (query) => addGeneratedTime(cb(query));

  const apiCall = async (req, res) => (
    Promise.resolve(callback(req.query))
      .then((data) => {
        if (maxAgeSec !== null) res.setHeader('Cache-Control', `max-age=0, s-maxage=${maxAgeSec}, stale-while-revalidate`);
        res.status(200).json(formatJsonSuccess(data));
      })
      .catch((err) => {
        if (IS_DEV) throw err;
        else res.status(500).json(formatJsonError(err));
      })
  );

  apiCall.straightCall = callback;

  return apiCall;
};

export {
  fn,
  formatJsonError,
};
