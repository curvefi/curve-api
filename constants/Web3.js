import BN from 'bignumber.js';

const CHAIN_ID = 1;
const DECIMALS_WEI = 1e18;
const DECIMALS_GWEI = 1e9;
const MAX_UINT256 = BN(2).pow(256).minus(1);

const RPC_URL = `https://direct.drpc.org/ogrpc?network=ethereum&dkey=${process.env.DRPC_API_KEY}`;
const RPC_BACKUP_URL = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMI_API_KEY}`;

const RPC_URL_BSC = 'https://bsc-dataseed.binance.org/';

const BASE_URL_EXPLORER_ADDRESS = 'https://etherscan.io/address/';

export {
  CHAIN_ID,
  DECIMALS_WEI,
  DECIMALS_GWEI,
  RPC_URL,
  RPC_BACKUP_URL,
  RPC_URL_BSC,
  BASE_URL_EXPLORER_ADDRESS,
  MAX_UINT256,
};
