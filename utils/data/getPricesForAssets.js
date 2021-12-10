import memoize from 'memoizee';
import Request from '../Request';

export default memoize((assetIds) => (
    Request.get(`https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${assetIds.join(',')}`)
        .then((response) => response.json())
        .then((prices) => assetIds.map((assetId) => (
            assetId === 'dollar' ? 1 : prices[assetId].usd
        )))
), {
    promise: true,
    maxAge: 60 * 1000, // 1 min
    primitive: true,
});
