import { fn } from '#root/utils/api.js';
import { sum } from '#root/utils/Array.js';
import { request } from '#root/utils/Graphql/index.js';

const GRAPH_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/convex-community/crvusd';

export default fn(async () => {
  const query = `
    {
      amms{
        id
        volumeSnapshots(orderBy:timestamp orderDirection:desc first:1) {
          swapVolumeUSD
          timestamp
        }
      }
    }
  `;

  const data = await request(GRAPH_ENDPOINT, query, undefined, 'crvusd-amms');

  const amms = data.amms.map(({ id, volumeSnapshots }) => ({
    address: id,
    volumeUSD: Math.trunc(volumeSnapshots[0]?.swapVolumeUSD || 0),
  }));

  return {
    amms,
    totalVolume: sum(amms.map(({ volumeUSD }) => volumeUSD)),
  };
}, {
  maxAge: 5 * 60, // 5 min
  cacheKey: 'getVolumes/ethereum/crvusd-amms',
});
