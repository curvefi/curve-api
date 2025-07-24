import compoundSwapABI from './json/compound/swap.json' assert { type: 'json' };
import usdtSwapABI from './json/usdt/swap.json' assert { type: 'json' };
import iearnSwapABI from './json/iearn/swap.json' assert { type: 'json' };
import iearnSCurveRewardsABI from './json/iearn/sCurveRewards.json' assert { type: 'json' };
import busdSwapABI from './json/busd/swap.json' assert { type: 'json' };
import susdv2SwapABI from './json/susdv2/swap.json' assert { type: 'json' };
import susdv2SCurveRewardsAbi from './json/susdv2/sCurveRewards.json' assert { type: 'json' };
import paxSwapABI from './json/pax/swap.json' assert { type: 'json' };
import renSwapABI from './json/ren/swap.json' assert { type: 'json' };
import sbtcSwapABI from './json/sbtc/swap.json' assert { type: 'json' };
import sbtcSCurveRewardsABI from './json/sbtc/sCurveRewards.json' assert { type: 'json' };
import hbtcSwapABI from './json/hbtc/swap.json' assert { type: 'json' };
import tripoolSwapABI from './json/3pool/swap.json' assert { type: 'json' };
import gusdSwapABI from './json/gusd/swap.json' assert { type: 'json' };
import husdSwapABI from './json/husd/swap.json' assert { type: 'json' };
import usdkSwapABI from './json/usdk/swap.json' assert { type: 'json' };
import usdnSwapABI from './json/usdn/swap.json' assert { type: 'json' };
import linkusdSwapABI from './json/linkusd/swap.json' assert { type: 'json' };
import musdSwapABI from './json/musd/swap.json' assert { type: 'json' };
import musdSCurveRewardsAbi from './json/musd/sCurveRewards.json' assert { type: 'json' };
import rsvSwapABI from './json/rsv/swap.json' assert { type: 'json' };
import rsvSCurveRewardsAbi from './json/rsv/sCurveRewards.json' assert { type: 'json' };
import tbtcSwapABI from './json/tbtc/swap.json' assert { type: 'json' };
import tbtcSCurveRewardsAbi from './json/tbtc/sCurveRewards.json' assert { type: 'json' };
import dusdSwapABI from './json/dusd/swap.json' assert { type: 'json' };
import dusdSCurveRewardsAbi from './json/dusd/sCurveRewards.json' assert { type: 'json' };
import pbtcSwapABI from './json/pbtc/swap.json' assert { type: 'json' };
import pbtcSCurveRewardsAbi from './json/pbtc/sCurveRewards.json' assert { type: 'json' };
import bbtcSwapABI from './json/bbtc/swap.json' assert { type: 'json' };
import obtcSwapABI from './json/obtc/swap.json' assert { type: 'json' };
import obtcSCurveRewardsAbi from './json/obtc/sCurveRewards.json' assert { type: 'json' };
import sethSwapABI from './json/seth/swap.json' assert { type: 'json' };
import eursSwapABI from './json/eurs/swap.json' assert { type: 'json' };
import eursSCurveRewardsAbi from './json/eurs/sCurveRewards.json' assert { type: 'json' };
import ustSwapABI from './json/ust/swap.json' assert { type: 'json' };
import aaveSwapABI from './json/aave/swap.json' assert { type: 'json' };
import idleSwapABI from './json/idle/swap.json' assert { type: 'json' };
import stethSwapABI from './json/steth/swap.json' assert { type: 'json' };
import stethSCurveRewardsAbi from './json/steth/sCurveRewards.json' assert { type: 'json' };
import saaveSwapABI from './json/saave/swap.json' assert { type: 'json' };
import ankrethSwapABI from './json/ankreth/swap.json' assert { type: 'json' };
import ankrethSCurveRewardsAbi from './json/ankreth/sCurveRewards.json' assert { type: 'json' };
import usdpSwapABI from './json/usdp/swap.json' assert { type: 'json' };
import ibSwapABI from './json/ib/swap.json' assert { type: 'json' };
import linkSwapABI from './json/link/swap.json' assert { type: 'json' };
import tusdSwapABI from './json/tusd/swap.json' assert { type: 'json' };
import fraxSwapABI from './json/frax/swap.json' assert { type: 'json' };
import lusdSwapABI from './json/lusd/swap.json' assert { type: 'json' };
import lusdRewardsabi from './json/lusd/rewards.json' assert { type: 'json' };
import balancerAbi from './json/balancer.json' assert { type: 'json' };
import rethSwapABI from './json/reth/swap.json' assert { type: 'json' };
import fraxRewardsabi from './json/frax/rewards.json' assert { type: 'json' };
import alusdSwapABI from './json/alusd/swap.json' assert { type: 'json' };
import triCryptoSwap from './json/tricrypto/swap.json' assert { type: 'json' };

const abiData = {
  compound: {
    swap_address: '0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56',
    swap_abi: compoundSwapABI,
  },
  usdt: {
    swap_address: '0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C',
    swap_abi: usdtSwapABI,
  },
  iearn: {
    swap_address: '0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51',
    swap_abi: iearnSwapABI,
    sCurveRewards_abi: iearnSCurveRewardsABI,
    sCurveRewards_address: '0x0001FB050Fe7312791bF6475b96569D83F695C9f',
  },
  busd: {
    swap_address: '0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27',
    swap_abi: busdSwapABI,
  },
  susdv2: {
    swap_abi: susdv2SwapABI,
    swap_address: '0xA5407eAE9Ba41422680e2e00537571bcC53efBfD',
    sCurveRewards_abi: susdv2SCurveRewardsAbi,
    sCurveRewards_address: '0xdcb6a51ea3ca5d3fd898fd6564757c7aaec3ca92',
  },
  pax: {
    swap_abi: paxSwapABI,
    swap_address: '0x06364f10B501e868329afBc005b3492902d6C763',
  },
  ren: {
    swap_address: '0x93054188d876f558f4a66B2EF1d97d16eDf0895B',
    swap_abi: renSwapABI,
  },
  sbtc: {
    swap_address: '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714',
    swap_abi: sbtcSwapABI,
    sCurveRewards_abi: sbtcSCurveRewardsABI,
    sCurveRewards_address: '0x13C1542A468319688B89E323fe9A3Be3A90EBb27',
  },
  hbtc: {
    swap_abi: hbtcSwapABI,
    swap_address: '0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F',
  },
  '3pool': {
    swap_abi: tripoolSwapABI,
    swap_address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
  },
  gusd: {
    swap_address: '0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956',
    swap_abi: gusdSwapABI,
  },
  husd: {
    swap_address: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
    swap_abi: husdSwapABI,
  },
  usdk: {
    swap_address: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
    swap_abi: usdkSwapABI,
  },
  usdn: {
    swap_address: '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
    swap_abi: usdnSwapABI,
  },
  linkusd: {
    swap_address: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
    swap_abi: linkusdSwapABI,
  },
  musd: {
    swap_address: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6',
    swap_abi: musdSwapABI,
    sCurveRewards_abi: musdSCurveRewardsAbi,
    sCurveRewards_address: '0xE6E6E25EfdA5F69687aA9914f8d750C523A1D261',
  },
  rsv: {
    swap_address: '0xC18cC39da8b11dA8c3541C598eE022258F9744da',
    swap_abi: rsvSwapABI,
    sCurveRewards_abi: rsvSCurveRewardsAbi,
    sCurveRewards_address: '0xAD4768F408dD170e62E074188D81A29AE31B8Fd8',
  },
  tbtc: {
    swap_address: '0xC25099792E9349C7DD09759744ea681C7de2cb66',
    swap_abi: tbtcSwapABI,
    sCurveRewards_abi: tbtcSCurveRewardsAbi,
    sCurveRewards_address: '0xAF379f0228ad0d46bB7B4f38f9dc9bCC1ad0360c',
  },
  dusd: {
    swap_address: '0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c',
    swap_abi: dusdSwapABI,
    sCurveRewards_abi: dusdSCurveRewardsAbi,
    sCurveRewards_address: '0xd9Acb0BAeeD77C99305017821167674Cc7e82f7a',
  },
  pbtc: {
    swap_abi: pbtcSwapABI,
    swap_address: '0x7F55DDe206dbAD629C080068923b36fe9D6bDBeF',
    sCurveRewards_abi: pbtcSCurveRewardsAbi,
    sCurveRewards_address: '0xf7977edc1fa61aa9b5f90d70a74a3fbc46e9dad3',
    reward_token: '0x89Ab32156e46F46D02ade3FEcbe5Fc4243B9AAeD',
  },
  bbtc: {
    swap_abi: bbtcSwapABI,
    swap_address: '0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b',
  },
  obtc: {
    swap_abi: obtcSwapABI,
    swap_address: '0xd81dA8D904b52208541Bade1bD6595D8a251F8dd',
    sCurveRewards_abi: obtcSCurveRewardsAbi,
    sCurveRewards_address: '0xcee63697ccaa5b14d20bb111639b13e78fc64ab0',
    reward_token: '0xbc19712feb3a26080ebf6f2f7849b417fdd792ca',
  },
  seth: {
    swap_abi: sethSwapABI,
    swap_address: '0xc5424b857f758e906013f3555dad202e4bdb4567',
  },
  eurs: {
    swap_abi: eursSwapABI,
    swap_address: '0x0Ce6a5fF5217e38315f87032CF90686C96627CAA',
    sCurveRewards_abi: eursSCurveRewardsAbi,
    sCurveRewards_address: '0xc0d8994cd78ee1980885df1a0c5470fc977b5cfe',
    reward_token: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
  },
  ust: {
    swap_abi: ustSwapABI,
    swap_address: '0x890f4e345B1dAED0367A877a1612f86A1f86985f',
  },
  aave: {
    swap_address: '0xDeBF20617708857ebe4F679508E7b7863a8A8EeE',
    swap_abi: aaveSwapABI,
    coin_precisions: [1e18, 1e6, 1e6],
    underlying_coins: [
      '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    ],
  },
  idle: {
    swap_address: '0x83f252f036761a1E3d10DACa8e16D7b21E3744D7',
    swap_abi: idleSwapABI,
  },
  steth: {
    swap_abi: stethSwapABI,
    swap_address: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
    sCurveRewards_abi: stethSCurveRewardsAbi,
    sCurveRewards_address: '0x99ac10631F69C753DDb595D074422a0922D9056B',
    reward_token: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
  },
  saave: {
    swap_address: '0xEB16Ae0052ed37f479f7fe63849198Df1765a733',
    swap_abi: saaveSwapABI,
    coin_precisions: [1e18, 1e18],
    underlying_coins: [
      '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
    ],
  },
  ankreth: {
    swap_abi: ankrethSwapABI,
    swap_address: '0xA96A65c051bF88B4095Ee1f2451C2A9d43F53Ae2',
    sCurveRewards_abi: ankrethSCurveRewardsAbi,
    sCurveRewards_address: '0x3547DFCa04358540891149559e691B146c6B0043',
    reward_token: '0xe0ad1806fd3e7edf6ff52fdb822432e847411033',
    reward_tokens: ['0xe0ad1806fd3e7edf6ff52fdb822432e847411033', '0x8290333cef9e6d528dd5618fb97a76f268f3edd4'],
  },
  usdp: {
    swap_abi: usdpSwapABI,
    swap_address: '0x42d7025938bEc20B69cBae5A77421082407f053A',
  },
  ib: {
    swap_abi: ibSwapABI,
    swap_address: '0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF',
  },
  link: {
    swap_abi: linkSwapABI,
    swap_address: '0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0',
  },
  tusd: {
    swap_abi: tusdSwapABI,
    swap_address: '0xecd5e75afb02efa118af914515d6521aabd189f1',
  },
  frax: {
    swap_abi: fraxSwapABI,
    swap_address: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
    sCurveRewards_abi: fraxRewardsabi,
    sCurveRewards_address: '0xBBbAf1adf4d39B2843928CCa1E65564e5ce99ccC',
    reward_token: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
  },
  lusd: {
    swap_abi: lusdSwapABI,
    swap_address: '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
    sCurveRewards_abi: lusdRewardsabi,
    sCurveRewards_address: '0xeb31da939878d1d780fdbcc244531c0fb80a2cf3',
    reward_token: '0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d',
  },
  busdv2: {
    swap_abi: lusdSwapABI,
    swap_address: '0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a',
  },
  reth: {
    swap_abi: rethSwapABI,
    swap_address: '0xF9440930043eb3997fc70e1339dBb11F341de7A8',
    sCurveRewards_abi: fraxRewardsabi,
    sCurveRewards_address: '0x3b7382805A1d887b73e98570796C5cEFeA32A462',
    reward_token: '0xef3a930e1ffffacd2fc13434ac81bd278b0ecc8d',
  },
  alusd: {
    swap_abi: alusdSwapABI,
    swap_address: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    sCurveRewards_abi: fraxRewardsabi,
    sCurveRewards_address: '0xb76256d1091e93976c61449d6e500d9f46d827d4',
  },
  tricrypto: {
    swap_abi: triCryptoSwap,
    swap_address: '0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5',
  },
  balancerAbi,
  balancer_address: '0x330416C863f2acCE7aF9C9314B422d24c672534a',
};

export default abiData;
