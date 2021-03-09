# Changelog

*This API doesn't offer versioning yet, so we'll post a deprecation notice in this changelog ahead of time if any breaking change is planned.*

## Oct 29, 2021

### Minor

- Factory v2 pool data can now be accessed from `/api/getFactoryV2Pools/[blockchainId]`, where `blockchainId` is any chain id that Curve has a factory on (e.g. `'ethereum'`, `'polygon'`, etc)
- Improvement: better asset price data and more accurate TVLs for factory v2 pool data

### *Deprecation notice*

- Current endpoints for querying factory v2 pool data will be removed in the future. Please update as follows:
  ```
  /api/getFactoryV2Pools -> no change for ethereum, although it can also be accessed from /api/getFactoryV2Pools/ethereum
  /api/getFactoryV2Pools-polygon -> /api/getFactoryV2Pools/polygon
  /api/getFactoryV2Pools-fantom -> /api/getFactoryV2Pools/fantom
  /api/getFactoryV2Pools-arbitrum -> /api/getFactoryV2Pools/arbitrum
  ```
