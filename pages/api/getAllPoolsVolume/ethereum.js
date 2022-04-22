import { fn } from 'utils/api';

export default fn(async () => {
  const { data: { totalVolume } } = await (await fetch('https://api.curve.fi/api/getSubgraphData/ethereum')).json();

  return {
    totalVolume,
  };
}, {
  maxAge: 10 * 60, // 10m
});
