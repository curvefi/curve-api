import { fn } from 'utils/api';

export default fn(async () => {
  const { data: { totalVolume, cryptoShare } } = await (await fetch('https://api.curve.fi/api/getSubgraphData/fantom')).json();

  return {
    totalVolume,
    cryptoShare
  };
}, {
  maxAge: 10 * 60, // 10m
});
