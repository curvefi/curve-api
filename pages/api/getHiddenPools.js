import { fn } from '../../utils/api';

const HIDDEN_POOLS_IDS = {
  ethereum: [
    'factory-v2-0', // non pegged andre boo boo
    'factory-v2-4', // scrv doesnt exist
    'factory-v2-6', // old cvxcrv pool
    'factory-v2-8', // by team request
    'factory-v2-36', //by team request
    'factory-v2-15', //ruler dead
    'factory-v2-17', //ruler dead
    'factory-v2-18', //ruler dead
    'factory-v2-19', //ruler dead
    'factory-v2-26', //never seeded
    'factory-v2-39', //broken non pegged
    'factory-v2-40', //broken non pegged
    'factory-v2-46', //non pegged
    'factory-v2-54', //duplicate
    'factory-v2-65', //non pegged
    'factory-crypto-0', //price borked
  ],
  fantom: [
    'factory-v2-2', // Exact duplicate of another facto pool, with 0 liquidity
    'factory-v2-5', // non stable pool
    'factory-v2-12', // non stable pool
  ],
  arbitrum: [
    'factory-v2-1', //duplicate MIM pool
    'factory-v2-3', //non pegged pool
    'factory-v2-5', //empty non pegged pool?
    'factory-v2-6', //empty non pegged pool?
    'factory-v2-25', //wrong implementation
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
  ],
};

export default fn(async () => HIDDEN_POOLS_IDS);
