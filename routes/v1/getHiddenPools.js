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
};

export default fn(async () => HIDDEN_POOLS_IDS);
