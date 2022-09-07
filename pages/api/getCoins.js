import Web3 from 'web3';
import WEB3_CONSTANTS from 'constants/Web3';
import { fn } from '../../utils/api';
import registryAbi from '../../constants/abis/registry-v1.1.json';
import multicallAbi from '../../constants/abis/multicall.json';
import { getMultiCall, getRegistry } from '../../utils/getters';
import erc20Abi from '../../constants/abis/erc20.json';

const web3 = new Web3(WEB3_CONSTANTS.RPC_BACKUP_URL);
const BASE_API_DOMAIN = 'https://api.curve.fi';

export default fn(async () => {
  const registryMainAddress = await getRegistry();
  const registryMain = new web3.eth.Contract(registryAbi, registryMainAddress);
  const multicallAddress = await getMultiCall()
  const multicall = new web3.eth.Contract(multicallAbi, multicallAddress)

  ///get factory list
  const factoPools = (await (await fetch(`${BASE_API_DOMAIN}/api/getFactoryV2Pools`)).json()).data.poolData
  let coinList = []
  for (var i = 0; i < factoPools.length; i++) {
    for (var o = 0; o < factoPools[i].coinsAddresses.length; o++) {
      if (factoPools[i].coinsAddresses[o] !== '0x0000000000000000000000000000000000000000') {
        coinList.push(factoPools[i].coinsAddresses[o])
      }
    }
  }
  coinList = [...new Set(coinList)];
  // get pool addresses
  const coinMainCoint = await registryMain.methods.coin_count().call()
  let calls = [];
  for (let i = 0; i < coinMainCoint; i += 1) {
    calls.push([registryMainAddress, registryMain.methods.get_coin(i).encodeABI()]);
  }
  let aggcalls = await multicall.methods.aggregate(calls).call();
  const coinListMain = aggcalls[1].map((hex) => web3.eth.abi.decodeParameter('address', hex));
  let fullList = [...coinList, ...coinListMain]
  fullList = [...new Set(fullList)];

  let filterList = [
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',//eth reverts
    '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', //matic shouldn't be there
  ]



  for (var i = 0; i < filterList.length; i++) {
    fullList = fullList.filter((value)=>value != filterList[i]);
  }


  const erc20Contract = new web3.eth.Contract(erc20Abi, fullList[0]);

  calls = []
  for (var i = 0; i < fullList.length; i++) {
    calls.push([fullList[i], erc20Contract.methods.symbol().encodeABI()]);
    calls.push([fullList[i], erc20Contract.methods.decimals().encodeABI()]);
    calls.push([fullList[i], erc20Contract.methods.totalSupply().encodeABI()]);
  }



  aggcalls = await multicall.methods.aggregate(calls).call();
  aggcalls = aggcalls[1]
  let detailedList = []
  let coinN = 0
  for (var i = 0; i < aggcalls.length; i++) {
    try {
      let coinSymbol = web3.eth.abi.decodeParameter('string', aggcalls[i])
      i += 1
      let coinDecimal = web3.eth.abi.decodeParameter('uint256', aggcalls[i])
      i += 1
      let coinSupply = web3.eth.abi.decodeParameter('uint256', aggcalls[i])

      let coin = {
        'coinAddress': fullList[coinN],
        coinSymbol,
        coinDecimal,
        coinSupply,
        'formattedSupply': coinSupply / 10 ** coinDecimal
      }


      detailedList.push(coin)
      coinN++
    } catch (e) {
      console.log('oops at ',  fullList[coinN])
    }


  }

  detailedList.sort((a,b) => (a.formattedSupply > b.formattedSupply) ? 1 : ((b.formattedSupply > a.formattedSupply) ? -1 : 0))
  detailedList = [].concat(detailedList).reverse();




  return { detailedList };


}, {
  maxAge: 20,
});
