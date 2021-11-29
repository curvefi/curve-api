import axios from 'axios';
import Web3 from 'web3';
import { fn } from '../../utils/api';
import aggregatorInterfaceABI from '../../constants/abis/aggregator.json';

const web3 = new Web3(`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_ETHEREUM}`);
const chainlinkETHUSDaddress = '0xF79D6aFBb6dA890132F9D7c355e3015f15F3406F';

export default fn(async () => {
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000, { data: 'chainlink' }));
  const { data } = await Promise.race([
    axios.get('https://api.coinpaprika.com/v1/tickers/eth-ethereum'),
    axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'),
    timeoutPromise,
  ]);

  let price;

  if (data.quotes) {
    price = data.quotes.USD.price;
  } else if (data.ethereum) {
    price = data.ethereum.usd;
  } else {
    const ETHUSDpricefeed = new web3.eth.Contract(aggregatorInterfaceABI, chainlinkETHUSDaddress);
    price = await ETHUSDpricefeed.methods.latestAnswer().call() / 1e8;
  }
  return { price };
}, {
  maxAge: 20,
});
