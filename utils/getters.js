import memoize from 'memoizee';
import Web3 from 'web3';
import configs from '#root/constants/configs/index.js'
import addressGetterAbi from '#root/constants/abis/address_getter.json' assert { type: 'json' };
const addressGetter = '0x0000000022d53366457f9d5e68ec105046fc4383'
const multiCall = '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441'

const feeDistributor3crv = '0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc'
const feeDistributorCrvusd = '0xD16d5eC345Dd86Fb63C6a9C43c517210F1027914'

const getRegistry = memoize(async ({ blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum';

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

const getFactoryRegistry = async () => '0x0959158b6040D32d04c301A72CBFD6b39E21c9AE'; // old factory

const get3crvFeeDistributor = async () => feeDistributor3crv;
const getCrvusdFeeDistributor = async () => feeDistributorCrvusd;

export {
  getFactoryRegistry,
  get3crvFeeDistributor,
  getCrvusdFeeDistributor,
  getMultiCall,
  getRegistry
};
