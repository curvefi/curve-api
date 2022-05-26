import memoize from 'memoizee';
import Web3 from 'web3';
import WEB3_CONSTANTS from 'constants/Web3';
import configs from 'constants/configs';
import addressGetterAbi from 'constants/abis/address_getter.json';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);
const addressGetter = '0x0000000022d53366457f9d5e68ec105046fc4383'
const multiCall = '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441'

const feeDistributor = '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc'



const getRegistry = memoize(async ({ blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // eslint-disable-line no-param-reassign

  const web3 = new Web3(configs[blockchainId].rpcUrl);
  const contract = new web3.eth.Contract(addressGetterAbi, addressGetter);
  return contract.methods.get_registry().call();
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
  normalizer: ([{ blockchainId } = {}]) => blockchainId,
});

const getMultiCall = async () => {
  return multiCall
}



const getFactoryRegistry = memoize(async () => {
  const contract = new web3.eth.Contract(addressGetterAbi, addressGetter);
  return '0x0959158b6040D32d04c301A72CBFD6b39E21c9AE' //pold factory
  //return contract.methods.get_address(3).call();
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
});

const getFeeDistributor = async () => {
  return feeDistributor
}

export {
  getFactoryRegistry,
  getFeeDistributor,
  getMultiCall,
  getRegistry
};
