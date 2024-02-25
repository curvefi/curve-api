## Table of Contents

  - [getPlatforms](#getplatforms)
  - [getPools](#getpools)
  - [getETHprice](#getethprice)
  - [getFactoryTVL](#getfactorytvl)
  - [getRegistryAddress](#getfactoryaddress)
  - [getTVL](#getTVL)
  - [getWeeklyFees](#getweeklyfees)


## List of Endpoints

**Base is always: https://api.curve.fi/**

Last generation time of an endpoint can be found in the `generatedTimeMs` property.

### getPlatforms

Returns platforms that Curve is deployed on, and which pool registries are available on each platform.
Useful to then query pools (see [`getPools`](#getpools) below)

```
GET /api/getPlatforms
```

**View**:
[getPlatforms](https://api.curve.fi/api/getPlatforms)

### getPools

Retrieves all pools for any registry on any chain where Curve is deployed.

```
GET /api/getPools/<blockchainId>/<registryId>
```

**Parameters:**

- `blockchainId`: blockchain id where Curve pools are deployed
- `registryId`: registry id where Curve pools are deployed

Possible values for `registryId` are:

| value               | description                    |
|---------------------|--------------------------------|
| `main`              | non-factory stableswap pools   |
| `crypto`            | non-factory cryptoswap pools   |
| `factory`           | stableswap factory pools       |
| `factory-crypto`    | 2coin cryptoswap factory pools |
| `factory-crvusd`    | crvUSD stableswap factory pools|
| `factory-tricrypto` | tricrypto factory pools        |
| `factory-stable-ng` | stableswap-NG factory pools    |


**View**:

Example endpoints available:

- https://api.curve.fi/api/getPools/ethereum/factory-crvusd
- https://api.curve.fi/api/getPools/polygon/factory-crypto

For each pool object in the endpoints above, the `id` prop is unique.

### getETHprice
```
GET /api/getETHprice
```
Current Ethereum price used to calculate gas price

**View**:
[getETHprice](https://api.curve.fi/api/getETHprice)

**Parameters:**
NONE


**Response :**

```
"data": {
   "price": 1826.11, //price of Ethereum in USD
   "generatedTimeMs": 1615380294701 //when the response was generated
}
```

### getFactoryTVL
```
GET /api/getFactoryTVL
```
Returns factory TVL excluding LP tokens (which are already counted in the main Curve TVL.

**View**:
[getFactoryTVL](https://api.curve.fi/api/getFactoryTVL)

**Parameters:**
NONE


**Response :**

```
"data": {
  "factoryBalances": 139264023, //factory balances in USD
  "generatedTimeMs": 1615381415356
}
```

### getRegistryAddress
```
GET /api/getRegistryAddress
```
Returns registry address which is subject to change.

**View**:
[getRegistryAddress](https://api.curve.fi/api/getRegistryAddress)

**Parameters:**
NONE


**Response :**

```
"data": {
  "registryAddress": "0x7D86446dDb609eD0F5f8684AcF30380a356b2B4c",
  "generatedTimeMs": 1615381483925
}
```


### getTVL
```
GET /api/getTVL
```
Returns Curve TVL

**View**:
[getTVL](https://api.curve.fi/api/getTVL)

**Parameters:**
NONE


**Response :**

```
"data": {
  "tvl": 3961187920.275839, //total tvl excluding the factory
  "usdTVL": 1761657547.966614, //stable tvl
  "ethTVL": {
    "native": 393332.35772124684, //number of eth
    "usd": 730209722.1387632, //amount of eth in usd
    "asset": "ethereum"
  },
}
```

### getTVLFantom
```
GET /api/getTVLFantom
```
Returns TVL on Fantom

**View**:
[getTVLFantom](https://api.curve.fi/api/getTVLFantom)

**Parameters:**
NONE


**Response :**

```
"data": {
  "tvl": 11283973.12937601,
  "generatedTimeMs": 1620458596596
}
```

### getTVLPolygon
```
GET /api/getTVLPolygon
```
Returns TVL on Polygon

**View**:
[getTVLPolygon](https://api.curve.fi/api/getTVLPolygon)

**Parameters:**
NONE


**Response :**

```
"data": {
  "tvl": 11283973.12937601,
  "generatedTimeMs": 1620458596596
}
```

### getWeeklyFees
```
GET /api/getWeeklyFees
```
Returns weekly fees distributed to veCRV holders.

**View**:
[getWeeklyFees](https://api.curve.fi/api/getWeeklyFees)

**Parameters:**
NONE


**Response :**

```
"data": {
  "weeklyFeesTable": [
    {
      "date": "Thu Mar 04 2021",
      "ts": 1614816000000, //timestamp of epoch start
      "rawFees": 23928.77840856761 //fees for the week in USD
    }
```
