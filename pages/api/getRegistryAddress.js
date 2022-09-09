import axios from 'axios';
import Web3 from 'web3';
import { fn } from 'utils/api';
import { getRegistry } from 'utils/getters';

export default fn(async () => {

  let registryAddress = await getRegistry();
  return { registryAddress };

}, {
  maxAge: 3600, // 1 hour
});
