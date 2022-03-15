const IS_DEV = process.env.NODE_ENV === 'development';

const BASE_API_DOMAIN = IS_DEV ? 'http://localhost:3000' : 'https://api.curve.fi';

const REWARD_TOKENS_REPLACE_MAP = {
};

module.exports = {
  IS_DEV,
  REWARD_TOKENS_REPLACE_MAP,
  BASE_API_DOMAIN,
};
