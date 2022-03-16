import memoize from 'memoizee';
import Web3 from 'web3';
import WEB3_CONSTANTS from 'constants/Web3';
import configs from 'constants/configs';
import addressGetterAbi from 'constants/abis/address_getter.json';
const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);
const addressGetter = '0x0000000022d53366457f9d5e68ec105046fc4383'
const multiCall = '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441'
const fantomMulticall = '0xb828c456600857abd4ed6c32facc607bd0464f4f'
const fantomFactoryRegistry = '0x686d67265703d1f124c45e33d47d794c566889ba'
const arbiMulticall = '0x5b5cfe992adac0c9d48e05854b2d91c73a003858'
const arbiactoryRegistry = '0xb17b674D9c5CB2e441F8e196a2f048A81355d031'
const polygonMulticall = '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604'
const polygonFactoryRegistry = '0x722272d36ef0da72ff51c5a65db7b870e2e8d4ee'
const avalancheFactoryRegistry = '0xb17b674D9c5CB2e441F8e196a2f048A81355d031'
const avalancheMulticall = '0xa00FB557AA68d2e98A830642DBbFA534E8512E5f'

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

const getfantomMulticall = () => {
  return fantomMulticall
}


const getfantomFactoryRegistry = async () => {
  return fantomFactoryRegistry
}

const getArbitrumMulticall = () => {
  return arbiMulticall
}

const getArbitrumFactoryRegistry = async () => {
  return arbiactoryRegistry
}

const getPolygonMulticall = () => {
  return polygonMulticall
}

const getPolygonFactoryRegistry = async () => {
  return polygonFactoryRegistry
}

const getAvalancheFactoryRegistry = async () => {
  return avalancheFactoryRegistry
}

const getAvalancheMulticall = () => {
  return avalancheMulticall
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

const getOpMulticall = () => {
  return '0x2DC0E2aa608532Da689e89e237dF582B783E552C'
}



export {
  getArbitrumFactoryRegistry,
  getArbitrumMulticall,
  getAvalancheFactoryRegistry,
  getAvalancheMulticall,
  getPolygonMulticall,
  getPolygonFactoryRegistry,
  getfantomFactoryRegistry,
  getfantomMulticall,
  getFactoryRegistry,
  getFeeDistributor,
  getMultiCall,
  getRegistry
};
