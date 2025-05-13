import { config } from 'dotenv-safer';

// Ensure all required env variables are defined
config({
  example: './.env.default',
});

const IS_DEV = process.env.NODE_ENV !== 'production';

const BASE_API_DOMAIN = IS_DEV ? 'http://localhost:3000' : 'https://api.curve.finance';

const REWARD_TOKENS_REPLACE_MAP = {
};

/**
 * Flip to true to force using fallback data for thegraph (fallback data ideally
 * needs to be updated ahead of time if issues are predictable, e.g. planned maintenance).
 * Fallback data will already be used automatically if any thegraph request is failing,
 * so using that flip shouldn't be necessary at all.
 */
const USE_FALLBACK_THEGRAPH_DATA = false;

// Flip to true in order to easily populate thegraph fallback data: each
// place that's querying thegraph will dump its output, prefixed with
// "FALLBACK_THEGRAPH_DATA_POPULATE_MODE" and the filename where to store
// this data, in order to update that filename easily.
const FALLBACK_THEGRAPH_DATA_POPULATE_MODE = false;

const SMALL_POOLS_USDTOTAL_THRESHOLD = 10000;

export {
  IS_DEV,
  REWARD_TOKENS_REPLACE_MAP,
  BASE_API_DOMAIN,
  USE_FALLBACK_THEGRAPH_DATA,
  FALLBACK_THEGRAPH_DATA_POPULATE_MODE,
  SMALL_POOLS_USDTOTAL_THRESHOLD,
};
