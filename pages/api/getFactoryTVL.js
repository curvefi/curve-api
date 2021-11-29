import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';

const web3 = new Web3(`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_ETHEREUM}`);


export default fn(async () => {

    let res = await (await fetch(`https://api.curve.fi/api/getFactoryV2Pools`)).json()
    const factoryBalances = res.data.tvl
    return { factoryBalances };

}, {
  maxAge: 30, // 30s
});
