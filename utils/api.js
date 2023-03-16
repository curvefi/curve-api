import memoize from 'memoizee';
import { IS_DEV } from 'constants/AppConstants';

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

const logRuntime = async (fn, name, query) => {
  const startMs = getNowMs();

  const res = await fn();

  const endMs = getNowMs();
  if (IS_DEV) console.log('Run time (ms):', endMs - startMs, name, query);

  return res;
};

const fn = (cb, options = {}) => {
  const {
    maxAge: maxAgeSec = null, // Caching duration, in seconds
    name = null, // Name, used for logging purposes
    returnFlatData = false,
  } = options;

  const callback = maxAgeSec !== null ?
    memoize(async (query) => logRuntime(() => addGeneratedTime(cb(query)), name, query), {
      promise: true,
      maxAge: maxAgeSec * 1000,
      normalizer: ([query]) => JSON.stringify(query), // Separate cache entries for each route & query params,
    }) :
    async (query) => logRuntime(() => addGeneratedTime(cb(query)), name, query);

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
          console.log('ERROR that would be caught and served with success=false on prod', err);
          throw err;
        } else {
          res.status(500).json(formatJsonError(err));
        }
      })
  );

  apiCall.straightCall = callback;

  return apiCall;
};

export {
  fn,
  formatJsonError,
};
