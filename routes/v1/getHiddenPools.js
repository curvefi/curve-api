/**
 * @openapi
 * /getHiddenPools:
 *   get:
 *     tags:
 *       - Pools
 *     description: Returns a list of pool ids, grouped by chain id, that are known to be dysfunctional in some way. This list can be used by front-ends to avoid displaying these pools, and protect users from interacting with these pools.
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '../../utils/api.js';

const HIDDEN_POOLS_IDS = {
  ethereum: [
    'factory-v2-0', // non pegged andre boo boo
    'factory-v2-4', // scrv doesnt exist
    'factory-v2-6', // old cvxcrv pool
    'factory-v2-8', // by team request
    'factory-v2-36', // by team request
    'factory-v2-15', // ruler dead
    'factory-v2-17', // ruler dead
    'factory-v2-18', // ruler dead
    'factory-v2-19', // ruler dead
    'factory-v2-26', // never seeded
    'factory-v2-39', // broken non pegged
    'factory-v2-40', // broken non pegged
    'factory-v2-46', // non pegged
    'factory-v2-54', // duplicate
    'factory-v2-81', // outdated, team asked to hide it
    'factory-v2-103', // broken
    'factory-v2-65', // non pegged
    'factory-crypto-0', // price borked
    'factory-crypto-1', // price borked
    'factory-crypto-2', // price borked
    'factory-crypto-49', // broken
    'factory-crypto-265', // broken
    'factory-stable-ng-69', // broken
    'factory-stable-ng-405', // offensive
    'factory-stable-ng-406', // offensive
    'factory-twocrypto-154', // offensive
    'factory-twocrypto-155', // offensive
    'factory-twocrypto-156', // offensive
    'factory-twocrypto-200', // offensive
    'factory-tricrypto-53', // offensive
    'factory-tricrypto-54', // offensive
    'factory-tricrypto-55', // offensive
    'factory-tricrypto-56', // offensive
    'factory-tricrypto-71', // offensive
    'one-way-market-34', // price per share too high, will be redeployed
    'factory-twocrypto-274', // duplicate and empty
    'factory-twocrypto-275', // duplicate and empty
  ],
  fantom: [
    'factory-v2-2', // Exact duplicate of another facto pool, with 0 liquidity
    'factory-v2-5', // non stable pool
    'factory-v2-12', // non stable pool
  ],
  arbitrum: [
    'factory-v2-1', // duplicate MIM pool
    'factory-v2-3', // non pegged pool
    'factory-v2-5', // empty non pegged pool?
    'factory-v2-6', // empty non pegged pool?
    'factory-v2-18', // by team request
    'factory-v2-14', // non pegged pool
    'factory-v2-25', // wrong implementation
    'factory-v2-42', // broken
    'factory-stable-ng-212', // redeployed, team asked to hide it
  ],
  polygon: [
    'factory-v2-0', // Test pools not meant to be useful
    'factory-v2-1', // Test pools not meant to be useful
    'factory-v2-2', // Test pools not meant to be useful
    'factory-v2-3', // non pegged
    'factory-v2-6', // duplicate,
    'factory-v2-8', // non pegged
    'factory-v2-13', // non pegged
    'factory-v2-35', // by request (charlie)
    'factory-v2-94', // duplicate and empty
    'factory-v2-95', // duplicate and empty
    'factory-v2-96', // duplicate and empty
    'factory-v2-97', // duplicate and empty
    'factory-v2-98', // duplicate and empty
    'factory-v2-99', // duplicate and empty
    'factory-v2-106', // duplicate and empty
    'factory-v2-113', // duplicate and empty
    'factory-v2-118', // duplicate and empty
    'factory-v2-119', // duplicate and empty
    'factory-v2-120', // duplicate and empty
    'factory-v2-121', // duplicate and empty
    'factory-v2-122', // duplicate and empty
    'factory-v2-123', // duplicate and empty
    'factory-v2-124', // duplicate and empty
    'factory-v2-125', // duplicate and empty
    'factory-v2-126', // duplicate and empty
    'factory-v2-127', // duplicate and empty
    'factory-v2-128', // duplicate and empty
    'factory-v2-129', // duplicate and empty
    'factory-v2-130', // duplicate and empty
    'factory-v2-131', // duplicate and empty
    'factory-v2-132', // duplicate and empty
    'factory-v2-134', // duplicate and empty
    'factory-v2-136', // duplicate and empty
    'atricrypto2', // killed
  ],
  avalanche: [
    'factory-v2-42', // empty/borked
    'factory-v2-47', // empty/borked
  ],
  moonbeam: [
    'factory-v2-5', // spam
  ],
  kava: [
    'factory-v2-1', // typo in name
  ],
  xdai: [
    'factory-v2-12',
  ],
  base: [
    'factory-crypto-0',
    'factory-tricrypto-0',
  ],
  hyperliquid: [
    'factory-stable-ng-6', // test pool, team asked to hide it
    'factory-stable-ng-26', // redeployed, team asked to hide it
  ],
};

export default fn(async () => HIDDEN_POOLS_IDS, {
  maxAge: 60 * 60,
  cacheKey: 'getHiddenPools',
});
