import axios from 'axios';
import Web3 from 'web3';
import { fn } from '../../utils/api';
import aggregatorInterfaceABI from '../../constants/abis/aggregator.json';
import multicallAbi from '../../constants/abis/multicall.json';
import gaugeControllerAbi from '../../constants/abis/gauge_controller.json';
import exampleGaugeAbi from '../../constants/abis/example_gauge.json';
import swapAbi from '../../constants/abis/tripool_swap.json';

import { getFactoryRegistry, getMultiCall } from '../../utils/getters';

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);

export default fn(async () => {

  const multicallAddress = await getMultiCall();
  const multicall = new web3.eth.Contract(multicallAbi, multicallAddress);
  const gaugeControllerAddress = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB'
  const gaugeController = new web3.eth.Contract(gaugeControllerAbi, gaugeControllerAddress);

  const exampleGauge = new web3.eth.Contract(exampleGaugeAbi, '0x7ca5b0a2910B33e9759DC7dDB0413949071D7575');

  const exampleSwap = new web3.eth.Contract(swapAbi, '0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56');



  let gauges = {
      compound: {
        swap: '0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56',
        swap_token: '0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2',
        name: 'compound',
        gauge: '0x7ca5b0a2910B33e9759DC7dDB0413949071D7575',
        type: 'stable',
      },
      usdt: {
        swap: '0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C',
        swap_token: '0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23',
        name: 'usdt',
        gauge: '0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53',
        type: 'stable',
      },
      y: {
        swap: '0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51',
        swap_token: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8',
        name: 'y',
        gauge: '0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1',
        type: 'stable',
      },
      busd: {
        swap: '0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27',
        swap_token: '0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B',
        name: 'busd',
        gauge: '0x69Fb7c45726cfE2baDeE8317005d3F94bE838840',
        type: 'stable',
      },
      susdv2: {
        swap: '0xA5407eAE9Ba41422680e2e00537571bcC53efBfD',
        swap_token: '0xC25a3A3b969415c80451098fa907EC722572917F',
        name: 'susdv2',
        gauge: '0xA90996896660DEcC6E997655E065b23788857849',
        type: 'stable',
      },
      pax: {
        swap: '0x06364f10B501e868329afBc005b3492902d6C763',
        swap_token: '0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8',
        name: 'pax',
        gauge: '0x64E3C23bfc40722d3B649844055F1D51c1ac041d',
        type: 'stable',
      },
      ren: {
        swap: '0x93054188d876f558f4a66B2EF1d97d16eDf0895B',
        swap_token: '0x49849C98ae39Fff122806C06791Fa73784FB3675',
        name: 'ren',
        gauge: '0xB1F2cdeC61db658F091671F5f199635aEF202CAC',
        type: 'bitcoin',
      },
      sbtc: {
        swap: '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714',
        swap_token: '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3',
        name: 'sbtc',
        gauge: '0x705350c4BcD35c9441419DdD5d2f097d7a55410F',
        type: 'bitcoin',
      },
      hbtc: {
        swap: '0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F',
        swap_token: '0xb19059ebb43466C323583928285a49f558E572Fd',
        name: 'hbtc',
        gauge: '0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79',
        type: 'bitcoin',
      },
      '3pool': {
        swap: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7',
        swap_token: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
        name: '3pool',
        gauge: '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
        type: 'stable',
      },
      gusd: {
        swap: '0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956',
        swap_token: '0xD2967f45c4f384DEEa880F807Be904762a3DeA07',
        name: 'gusd',
        gauge: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
        type: 'stable',
      },
      husd: {
        swap: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
        swap_token: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
        name: 'husd',
        gauge: '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
        type: 'stable',
      },
      usdk: {
        swap: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
        swap_token: '0x97E2768e8E73511cA874545DC5Ff8067eB19B787',
        name: 'usdk',
        gauge: '0xC2b1DF84112619D190193E48148000e3990Bf627',
        type: 'stable',
      },
      usdn: {
        swap: '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
        swap_token: '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522',
        name: 'usdn',
        gauge: '0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4',
        type: 'stable',
      },
      musd: {
        swap: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6',
        swap_token: '0x1AEf73d49Dedc4b1778d0706583995958Dc862e6',
        name: 'musd',
        gauge: '0x5f626c30EC1215f4EdCc9982265E8b1F411D1352',
        type: 'stable',
      },
      tbtc: {
        swap: '0xC25099792E9349C7DD09759744ea681C7de2cb66',
        swap_token: '0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd',
        name: 'tbtc',
        gauge: '0x6828bcF74279eE32f2723eC536c22c51Eed383C6',
        type: 'bitcoin',
      },
      rsv: {
        swap: '0xC18cC39da8b11dA8c3541C598eE022258F9744da',
        swap_token: '0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35',
        name: 'rsv',
        gauge: '0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7',
        type: 'stable',
      },
      dusd: {
        swap: '0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c',
        swap_token: '0x3a664Ab939FD8482048609f652f9a0B0677337B9',
        name: 'dusd',
        gauge: '0xAEA6c312f4b3E04D752946d329693F7293bC2e6D',
        type: 'stable',
      },
      pbtc: {
        swap: '0x7F55DDe206dbAD629C080068923b36fe9D6bDBeF',
        swap_token: '0xDE5331AC4B3630f94853Ff322B66407e0D6331E8',
        name: 'pbtc',
        gauge: '0xd7d147c6Bb90A718c3De8C0568F9B560C79fa416',
        type: 'bitcoin',
      },
      bbtc: {
        swap: '0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b',
        swap_token: '0x410e3E86ef427e30B9235497143881f717d93c2A',
        name: 'bbtc',
        gauge: '0xdFc7AdFa664b08767b735dE28f9E84cd30492aeE',
        type: 'bitcoin',
      },
      obtc: {
        swap: '0xd81dA8D904b52208541Bade1bD6595D8a251F8dd',
        swap_token: '0x2fE94ea3d5d4a175184081439753DE15AeF9d614',
        name: 'obtc',
        gauge: '0x11137B10C210b579405c21A07489e28F3c040AB1',
        type: 'bitcoin',
      },
      ust: {
        swap: '0x890f4e345B1dAED0367A877a1612f86A1f86985f',
        swap_token: '0x94e131324b6054c0D789b190b2dAC504e4361b53',
        name: 'ust',
        gauge: '0x3B7020743Bc2A4ca9EaF9D0722d42E20d6935855',
        type: 'stable',
      },
      eurs: {
        swap: '0x0Ce6a5fF5217e38315f87032CF90686C96627CAA',
        swap_token: '0x194eBd173F6cDacE046C53eACcE9B953F28411d1',
        name: 'eurs',
        gauge: '0x90Bb609649E0451E5aD952683D64BD2d1f245840',
        type: 'tether-eurt',
      },
      seth: {
        swap: '0xc5424b857f758e906013f3555dad202e4bdb4567',
        swap_token: '0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c',
        name: 'seth',
        gauge: '0x3C0FFFF15EA30C35d7A85B85c0782D6c94e1d238',
        type: 'ethereum',
      },
      aave: {
        swap: '0xDeBF20617708857ebe4F679508E7b7863a8A8EeE',
        swap_token: '0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900',
        name: 'aave',
        gauge: '0xd662908ADA2Ea1916B3318327A97eB18aD588b5d',
        type: 'stable',
      },
      steth: {
        swap: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
        swap_token: '0x06325440D014e39736583c165C2963BA99fAf14E',
        name: 'steth',
        gauge: '0x182B723a58739a9c974cFDB385ceaDb237453c28',
        type: 'ethereum',
      },
      saave: {
        swap: '0xEB16Ae0052ed37f479f7fe63849198Df1765a733',
        swap_token: '0x02d341CcB60fAaf662bC0554d13778015d1b285C',
        name: 'saave',
        gauge: '0x462253b8F74B72304c145DB0e4Eebd326B22ca39',
        type: 'stable',
      },
      ankreth: {
        swap: '0xA96A65c051bF88B4095Ee1f2451C2A9d43F53Ae2',
        swap_token: '0xaA17A236F2bAdc98DDc0Cf999AbB47D47Fc0A6Cf',
        name: 'ankreth',
        gauge: '0x6d10ed2cF043E6fcf51A0e7b4C2Af3Fa06695707',
        type: 'ethereum',
      },
      ib: {
        swap: '0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF',
        swap_token: '0x5282a4eF67D9C33135340fB3289cc1711c13638C',
        name: 'ib',
        gauge: '0xF5194c3325202F456c95c1Cf0cA36f8475C1949F',
        type: 'stable',
      },
      link: {
        swap: '0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0',
        swap_token: '0xcee60cfa923170e4f8204ae08b4fa6a3f5656f3a',
        name: 'link',
        gauge: '0xFD4D8a17df4C27c1dD245d153ccf4499e806C87D',
        type: 'chainlink',
      },
      usdp: {
        swap: '0x42d7025938bEc20B69cBae5A77421082407f053A',
        swap_token: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
        name: 'usdp',
        gauge: '0x055be5DDB7A925BfEF3417FC157f53CA77cA7222',
        type: 'stable',
      },
      tusd: {
        swap: '0xecd5e75afb02efa118af914515d6521aabd189f1',
        swap_token: '0xecd5e75afb02efa118af914515d6521aabd189f1',
        name: 'tusd',
        gauge: '0x359FD5d6417aE3D8D6497d9B2e7A890798262BA4',
        type: 'stable',
      },
      busdv2: {
        swap: '0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a',
        swap_token: '0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a',
        name: 'busdv2',
        gauge: '0xd4B22fEdcA85E684919955061fDf353b9d38389b',
        type: 'stable',
      },
      frax: {
        swap: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
        swap_token: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
        name: 'frax',
        gauge: '0x72E158d38dbd50A483501c24f792bDAAA3e7D55C',
        type: 'stable',
      },
      lusd: {
        swap: '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
        swap_token: '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
        name: 'lusd',
        gauge: '0x9B8519A9a00100720CCdC8a120fBeD319cA47a14',
        type: 'stable',
      },
      reth: {
        swap: '0xF9440930043eb3997fc70e1339dBb11F341de7A8',
        swap_token: '0x53a901d48795C58f485cBB38df08FA96a24669D5',
        name: 'reth',
        gauge: '0x824F13f1a2F29cFEEa81154b46C0fc820677A637',
        type: 'ethereum',
      },
      alusd: {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'alusd',
        gauge: '0x9582C4ADACB3BCE56Fea3e590F05c3ca2fb9C477',
        type: 'stable',
      },
      "polygon-a3CRV": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'polygon-a3CRV',
        gauge: '0xC48f4653dd6a9509De44c92beb0604BEA3AEe714',
        type: 'stable',
        side_chain: true
      },
      "fantom-2pool": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'fantom-2pool',
        gauge: '0xb9C05B8EE41FDCbd9956114B3aF15834FDEDCb54',
        type: 'stable',
        side_chain: true
      },
      "fantom-geist": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'fantom-geist',
        gauge: '0xfE1A3dD8b169fB5BF0D5dbFe813d956F39fF6310',
        type: 'stable',
        side_chain: true
      },
      "tricrypto": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'tricrypto',
        gauge: '0x6955a55416a06839309018A8B0cB72c4DDC11f15',
        type: 'crypto',
        is_killed: true
      },
      "polygon-ren": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'polygon-ren',
        gauge: '0x488E6ef919C2bB9de535C634a80afb0114DA8F62',
        type: 'bitcoin',
        side_chain: true
      },
      "fantom-ren": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'fantom-ren',
        gauge: '0xfDb129ea4b6f557b07BcDCedE54F665b7b6Bc281',
        type: 'bitcoin',
        side_chain: true
      },
      "polygon-atricrypto": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'polygon-atricrypto',
        gauge: '0x060e386eCfBacf42Aa72171Af9EFe17b3993fC4F',
        type: 'crypto',
        side_chain: true
      },
      "xdai-3pool": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'xdai-3pool',
        gauge: '0x6C09F6727113543Fd061a721da512B7eFCDD0267',
        type: 'stable',
        side_chain: true
      },
      "tricrypto2": {
        swap: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46',
        swap_token: '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff',
        name: 'tricrypto2',
        gauge: '0xDeFd8FdD20e0f34115C7018CCfb655796F6B2168',
        type: 'crypto',
      },
      "eurt": {
        swap: '0xfd5db7463a3ab53fd211b4af195c5bccc1a03890',
        swap_token: '0xfd5db7463a3ab53fd211b4af195c5bccc1a03890',
        name: 'eurt',
        gauge: '0xe8060Ad8971450E624d5289A10017dD30F5dA85F',
        type: 'tether-eurt',
      },
      "mim": {
        swap: '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
        swap_token: '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
        name: 'mim',
        gauge: '0xd8b712d29381748dB89c36BCa0138d7c75866ddF',
        type: 'stable',
      },
      "f-cvxcrv": {
        swap: '0x9d0464996170c6b9e75eed71c68b99ddedf279e8',
        swap_token: '0x9d0464996170c6b9e75eed71c68b99ddedf279e8',
        name: 'f-cvxcrv',
        gauge: '0x903dA6213a5A12B61c821598154EfAd98C3B20E4',
        type: 'curve-dao-token',
        factory: true
      },
      "f-ibjpy": {
        swap: '0x8818a9bb44fbf33502be7c15c500d0c783b73067',
        swap_token: '0x8818a9bb44fbf33502be7c15c500d0c783b73067',
        name: 'f-ibjpy',
        gauge: '0xeFF437A56A22D7dD86C1202A308536ED8C7da7c1',
        type: 'jpyc',
        factory: true
      },

      "f-ibgbp": {
        swap: '0xd6ac1cb9019137a896343da59dde6d097f710538',
        swap_token: '0xd6ac1cb9019137a896343da59dde6d097f710538',
        name: 'f-ibgbp',
        gauge: '0x63d9f3aB7d0c528797A12a0684E50C397E9e79dC',
        type: 'truegbp',
        factory: true
      },
      "f-ibaud": {
        swap: '0x3f1b0278a9ee595635b61817630cc19de792f506',
        swap_token: '0x3f1b0278a9ee595635b61817630cc19de792f506',
        name: 'f-ibaud',
        gauge: '0x05ca5c01629a8E5845f12ea3A03fF7331932233A',
        type: 'saud',
        factory: true
      },
      "f-ibeur": {
        swap: '0x19b080fe1ffa0553469d20ca36219f17fcf03859',
        swap_token: '0x19b080fe1ffa0553469d20ca36219f17fcf03859',
        name: 'f-ibeur',
        gauge: '0x99fb76F75501039089AAC8f20f487bf84E51d76F',
        type: 'tether-eurt',
        factory: true
      },
      "f-ibchf": {
        swap: '0x9c2c8910f113181783c249d8f6aa41b51cde0f0c',
        swap_token: '0x9c2c8910f113181783c249d8f6aa41b51cde0f0c',
        name: 'f-ibchf',
        gauge: '0x2fA53e8fa5fAdb81f4332C8EcE39Fe62eA2f919E',
        type: 'cryptofranc',
        factory: true
      },
      "f-ibkrw": {
        swap: '0x8461a004b50d321cb22b7d034969ce6803911899',
        swap_token: '0x8461a004b50d321cb22b7d034969ce6803911899',
        name: 'f-ibkrw',
        gauge: '0x1750a3a3d80A3F5333BBe9c4695B0fAd41061ab1',
        type: 'terra-krw',
        factory: true
      },
      "ousd": {
        swap: '0x87650D7bbfC3A9F10587d7778206671719d9910D',
        swap_token: '0x87650D7bbfC3A9F10587d7778206671719d9910D',
        name: 'ousd',
        gauge: '0x25f0cE4E2F8dbA112D9b115710AC297F816087CD',
        type: 'stable',
        factory: true,
      },
      "arbitrum-tricrypto": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'arbitrum-tricrypto',
        gauge: '0x9044E12fB1732f88ed0c93cfa5E9bB9bD2990cE5',
        type: 'crypto',
        side_chain: true
      },
      "arbitrum-2pool": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'arbitrum-2pool',
        gauge: '0xFf17560d746F85674FE7629cE986E949602EF948',
        type: 'stable',
        side_chain: true
      },
      "arbitrum-ren": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'arbitrum-ren',
        gauge: '0x9F86c5142369B1Ffd4223E5A2F2005FC66807894',
        type: 'bitcoin',
        side_chain: true
      },
      "fantom-tricrypto": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'fantom-tricrypto',
        gauge: '0x260e4fBb13DD91e187AE992c3435D0cf97172316',
        type: 'crypto',
        side_chain: true
      },
      "f-aleth": {
        swap: '0xc4c319e2d4d66cca4464c0c2b32c9bd23ebe784e',
        swap_token: '0xc4c319e2d4d66cca4464c0c2b32c9bd23ebe784e',
        name: 'f-aleth',
        gauge: '0x12dCD9E8D1577b5E4F066d8e7D404404Ef045342',
        type: 'ethereum',
        factory: true,
      },
      "f-eurn": {
        swap: '0x3fb78e61784c9c637d560ede23ad57ca1294c14a',
        swap_token: '0x3fb78e61784c9c637d560ede23ad57ca1294c14a',
        name: 'f-eurn',
        gauge: '0xD9277b0D007464eFF133622eC0d42081c93Cef02',
        type: 'tether-eurt',
        factory: true,
      },
      "f-usdm": {
        swap: '0x5b3b5df2bf2b6543f78e053bd91c4bdd820929f1',
        swap_token: '0x5b3b5df2bf2b6543f78e053bd91c4bdd820929f1',
        name: 'f-usdm',
        gauge: '0x9AF13a7B1f1Bbf1A2B05c6fBF23ac23A9E573b4E',
        type: 'stable',
        is_killed: true,
        factory: true,
      },
      "f-ust-mim": {
        swap: '0x55a8a39bc9694714e2874c1ce77aa1e599461e18',
        swap_token: '0x55a8a39bc9694714e2874c1ce77aa1e599461e18',
        name: 'f-ust-mim',
        gauge: '0xB518f5e3242393d4eC792BD3f44946A3b98d0E48',
        type: 'stable',
        factory: true,
      },
      "avalanche-a3CRV": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'avalanche-a3CRV',
        gauge: '0xB504b6EB06760019801a91B451d3f7BD9f027fC9',
        type: 'stable',
        side_chain: true
      },
      "avalanche-ren": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'avalanche-ren',
        gauge: '0x75D05190f35567e79012c2F0a02330D3Ed8a1F74',
        type: 'bitcoin',
        side_chain: true
      },
      "avalanche-atricrypto": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'avalanche-atricrypto',
        gauge: '0xa05E565cA0a103FcD999c7A7b8de7Bd15D5f6505',
        type: 'crypto',
        side_chain: true
      },
      "harmony-3pool": {
        swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        swap_token: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
        name: 'harmony-3pool',
        gauge: '0xf2Cde8c47C20aCbffC598217Ad5FE6DB9E00b163',
        type: 'stable',
        side_chain: true
      },
      "f-d3pool": {
        swap: '0xbaaa1f5dba42c3389bdbc2c9d2de134f5cd0dc89',
        swap_token: '0xbaaa1f5dba42c3389bdbc2c9d2de134f5cd0dc89',
        name: 'f-d3pool',
        gauge: '0x16C2beE6f55dAB7F494dBa643fF52ef2D47FBA36',
        type: 'stable',
        factory: true,
      },
      "f-usdpax": {
        swap: '0xc270b3b858c335b6ba5d5b10e2da8a09976005ad',
        swap_token: '0xc270b3b858c335b6ba5d5b10e2da8a09976005ad',
        name: 'f-usdpax',
        gauge: '0xC95bdf13A08A547E4dD9f29B00aB7fF08C5d093d',
        type: 'stable',
        factory: true,
      },
      "f-ustw": {
        swap: '0xceaf7747579696a2f0bb206a14210e3c9e6fb269',
        swap_token: '0xceaf7747579696a2f0bb206a14210e3c9e6fb269',
        name: 'f-ustw',
        gauge: '0xb0f5d00e5916c8b8981e99191A1458704B587b2b',
        type: 'stable',
        factory: true,
      },
      "f-ibbtc": {
        swap: '0xfbdca68601f835b27790d98bbb8ec7f05fdeaa9b',
        swap_token: '0xfbdca68601f835b27790d98bbb8ec7f05fdeaa9b',
        name: 'f-ibbtc',
        gauge: '0x346C7BB1A7a6A30c8e81c14e90FC2f0FBddc54d8',
        type: 'bitcoin',
        factory: true,
      },
      "eursusd": {
        swap: '0x98a7F18d4E56Cfe84E3D081B40001B3d5bD3eB8B',
        swap_token: '0x3d229e1b4faab62f621ef2f6a610961f7bd7b23b',
        name: 'eursusd',
        gauge: '0x65CA7Dc5CB661fC58De57B1E1aF404649a27AD35',
        type: 'crypto',
      },
      "eurtusd": {
        swap: '0x9838eCcC42659FA8AA7daF2aD134b53984c9427b',
        swap_token: '0x3b6831c0077a1e44ED0a21841C3bC4dC11bCE833',
        name: 'eurtusd',
        gauge: '0x4Fd86Ce7Ecea88F7E0aA78DC12625996Fb3a04bC',
        type: 'crypto',
      },
      "arbitrum-eursusd": {
        swap: '0xA827a652Ead76c6B0b3D19dba05452E06e25c27e',
        swap_token: '0x3dFe1324A0ee9d86337d06aEB829dEb4528DB9CA',
        name: 'arbitrum-eursusd',
        gauge: '0x56eda719d82aE45cBB87B7030D3FB485685Bea45',
        type: 'crypto',
        side_chain: true
      },
      "polygon-eurtusd": {
        swap: '0xB446BF7b8D6D4276d0c75eC0e3ee8dD7Fe15783A',
        swap_token: '0x600743B1d8A96438bD46836fD34977a00293f6Aa',
        name: 'polygon-eurtusd',
        gauge: '0xAF78381216a8eCC7Ad5957f3cD12a431500E0B0D',
        type: 'crypto',
        side_chain: true
      },
      "f-dola": {
        swap: '0xaa5a67c256e27a5d80712c51971408db3370927d',
        swap_token: '0xaa5a67c256e27a5d80712c51971408db3370927d',
        name: 'f-dola',
        gauge: '0x8Fa728F393588E8D8dD1ca397E9a710E53fA553a',
        type: 'stable',
        factory: true,
      },
    }

    // get pool addresses
    let calls = [];

    Object.keys(gauges).forEach(function(key) {
        calls.push([gaugeControllerAddress, gaugeController.methods.get_gauge_weight(gauges[key].gauge).encodeABI()]);
        calls.push([gaugeControllerAddress, gaugeController.methods.gauge_types(gauges[key].gauge).encodeABI()]);
        calls.push([gaugeControllerAddress, gaugeController.methods.gauge_relative_weight(gauges[key].gauge).encodeABI()]);
    });


    let gaugeCalls = []
    let nonSideChainKeys = []
    Object.keys(gauges).forEach(function(key) {
      if (!gauges[key].side_chain) {
        gaugeCalls.push([gauges[key].gauge, exampleGauge.methods.working_supply().encodeABI()]);
        gaugeCalls.push([gauges[key].gauge, exampleGauge.methods.inflation_rate().encodeABI()]);
        nonSideChainKeys.push(key)
      }
    });
    let aggGaugecalls = await multicall.methods.aggregate(gaugeCalls).call();
    aggGaugecalls = aggGaugecalls[1]


    let swapCalls = []
    Object.keys(gauges).forEach(function(key) {
      if (!gauges[key].side_chain) {
        swapCalls.push([gauges[key].swap, exampleSwap.methods.get_virtual_price().encodeABI()]);
      }
    });

    let aggswapCalls = await multicall.methods.aggregate(swapCalls).call();
    aggswapCalls = aggswapCalls[1].map(hex => web3.eth.abi.decodeParameter('uint256', hex))

    let allGaugeWorkDetails = []
    for (var i = 0; i < aggGaugecalls.length; i++) {
      let working_supply = web3.eth.abi.decodeParameter('uint256', aggGaugecalls[i])
      i += 1
      let inflation_rate = web3.eth.abi.decodeParameter('uint256', aggGaugecalls[i])

      let gaugeData = {
        'working_supply': working_supply,
        'inflation_rate': inflation_rate
      }
      allGaugeWorkDetails.push(gaugeData)
    }


    let aggcalls = await multicall.methods.aggregate(calls).call();
    aggcalls = aggcalls[1]

    let allGaugeDetails = []
    for (var i = 0; i < aggcalls.length; i++) {
      let get_gauge_weight = web3.eth.abi.decodeParameter('uint256', aggcalls[i])
      i += 1
      let gauge_types = web3.eth.abi.decodeParameter('int128', aggcalls[i])
      i += 1
      let gauge_relative_weight = web3.eth.abi.decodeParameter('uint256', aggcalls[i])

      let gaugeData = {
        'get_gauge_weight': get_gauge_weight,
        'gauge_types': gauge_types,
        'gauge_relative_weight': gauge_relative_weight
      }
      allGaugeDetails.push(gaugeData)
    }

    let index = 0
    //pack data from gauge controller
    Object.keys(gauges).forEach(function(key) {
        gauges[key].gauge_controller = allGaugeDetails[index]
        index++
    });

    //pack gaugeData
    nonSideChainKeys.map(async (skey, index) => {
      gauges[skey].gauge_data = allGaugeWorkDetails[index]
    })

    //pack v_price
    nonSideChainKeys.map(async (skey, index) => {
      gauges[skey].swap_data = {
        'virtual_price': aggswapCalls[index]
      }
    })





  return { gauges };

}, {
  maxAge: 30,
});
