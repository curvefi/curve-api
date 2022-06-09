import Web3 from "web3";
import BigNumber from "big-number";
import { BASE_API_DOMAIN } from "constants/AppConstants";

import configs from "../../constants/configs";
import { fn } from "../../utils/api";
import registryAbi from "../../constants/abis/factory_registry.json";
import multicallAbi from "../../constants/abis/multicall.json";
import erc20Abi from "../../constants/abis/erc20.json";
import factorypool3Abi from "../../constants/abis/factory_swap.json";

const web3 = new Web3(
  `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_OPTIMISM}`
);

export default fn(
  async (query) => {
    const config = configs.optimism;
    const version = 2;

    const registryAddress = "0x2db0E83599a91b508Ac268a6197b8B14F5e72840";
    const multicallAddress = config.multicallAddress;
    const registry = new web3.eth.Contract(registryAbi, registryAddress);
    const multicall = new web3.eth.Contract(multicallAbi, multicallAddress);
    const res = await (
      await fetch(`${BASE_API_DOMAIN}/api/getFactoryV2Pools/optimism`)
    ).json();
    const poolDetails = [];
    let totalVolume = 0;

    const latest = await web3.eth.getBlockNumber();
    const DAY_BLOCKS_24H = config.approxBlocksPerDay;
    const DAY_BLOCKS = 1800;

    await Promise.all(
      res.data.poolData.map(async (pool, index) => {
        const poolContract = new web3.eth.Contract(
          factorypool3Abi,
          pool.address
        );

        let vPriceOldFetch;
        try {
          vPriceOldFetch = await poolContract.methods
            .get_virtual_price()
            .call("", latest - DAY_BLOCKS);
        } catch (e) {
          vPriceOldFetch = 1 * 10 ** 18;
        }
        const testPool = pool.address;
        const eventName = "TokenExchangeUnderlying";
        const eventName2 = "TokenExchange";

        const isMetaPool =
          pool.implementation?.startsWith("v1metausd") ||
          pool.implementation?.startsWith("metausd") ||
          pool.implementation?.startsWith("v1metabtc") ||
          pool.implementation?.startsWith("metabtc");

        const decimals =
          version === 1
            ? [pool.token.decimals, 18, 18, 18]
            : version === 2 && isMetaPool
            ? pool.underlyingDecimals
            : pool.decimals;
        let volume = 0;

        const events = await poolContract.getPastEvents(eventName, {
          filter: {}, // Using an array means OR: e.g. 20 or 23
          fromBlock: latest - DAY_BLOCKS,
          toBlock: "latest",
        });

        events.map((trade) => {
          const t =
            trade.returnValues.tokens_bought /
            10 ** decimals[trade.returnValues.bought_id];
          volume += t;
        });

        if (version == "2") {
          const events2 = await poolContract.getPastEvents(eventName2, {
            filter: {}, // Using an array means OR: e.g. 20 or 23
            fromBlock: latest - DAY_BLOCKS,
            toBlock: "latest",
          });

          events2.map((trade) => {
            const t =
              trade.returnValues[2] / 10 ** decimals[trade.returnValues[1]];
            volume += t;
          });
        }

        // Since we don't fetch blocks for the entirety of the past 24 hours,
        // we multiply the split volume accordingly
        const correctedVolume = volume * (DAY_BLOCKS_24H / DAY_BLOCKS);

        let vPriceFetch;
        try {
          vPriceFetch = await poolContract.methods.get_virtual_price().call();
        } catch (e) {
          vPriceFetch = 1 * 10 ** 18;
        }

        const vPrice = vPriceOldFetch;
        const vPriceNew = vPriceFetch;
        const apy = ((vPriceNew - vPrice) / vPrice) * 100 * 365;
        const apyFormatted = `${apy.toFixed(2)}%`;
        totalVolume += correctedVolume;
        const p = {
          index,
          poolAddress: pool.address,
          poolSymbol: version === 1 ? pool.token.symbol : pool.symbol,
          apyFormatted,
          apy,
          virtualPrice: vPriceFetch,
          volume: correctedVolume,
        };
        poolDetails.push(p);
      })
    );

    poolDetails.sort((a, b) =>
      a.index > b.index ? 1 : b.index > a.index ? -1 : 0
    );

    return { poolDetails, totalVolume, latest };
  },
  {
    maxAge: 30, // 30s
  }
);
