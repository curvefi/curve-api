import { fn } from 'utils/api';
import { sum } from 'utils/Array';

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

  const { data } = await (await fetch(GRAPH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })).json();

  const amms = data.amms.map(({ id, volumeSnapshots }) => ({
    address: id,
    volumeUSD: Math.trunc(volumeSnapshots[0]?.swapVolumeUSD || 0),
  }));

  return {
    amms,
    totalVolume: sum(amms.map(({ volumeUSD }) => volumeUSD)),
  };
}, {
  maxAge: 5 * 60, // 15 min
});
