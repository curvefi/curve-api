## Table of Contents

  - [getETHprice](#getethprice)
  - [getFactoryPools](#getfactorypools)
  - [getFactoryTVL](#getfactorytvl)
  - [getRegistryAddress](#getfactoryaddress)
  - [getTVL](#getTVL)
  - [getWeeklyFees](#getweeklyfees)


## List of Endpoints

**Base is always: https://api.curve.fi/**

Last generation time of an endpoint can be found in the `generatedTimeMs` property.

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

### getFactoryPools
```
GET /api/getFactoryPools
```
Returns all factory pools with balances and token details

**Parameters:**
NONE

**View**:
[getFactoryPools](https://api.curve.fi/api/getFactoryPools)

**Response :**

```
{
  "address": "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c", //pool address
  "type": "USD", //asset type
  "balance": "274913010.55", //total balance
  "token": {
    "address": "0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9", //address of token 1
    "symbol": "alUSD",
    "decimals": 18,
    "rawBalance": "135704363696911375358522013",
    "balance": "135704363.70" //balance of token 1
  },
  "lpToken": {
    "address": "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", //address of token 2 (LP token)
    "symbol": "3Crv",
    "decimals": 18,
    "rawBalance": "139208646857596652823648677",
    "balance": "139208646.86" //balance of token 2
  }
},
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

### getApys
```
GET /api/getApys
GET /api/getApys?address=0xADDRESS
```
Returns all types of APYs for all Curve pools (base APY from trading fees, CRV APY from CRV distribution, and any additional rewards the pool may have)

**View**:
[getApys](https://api.curve.fi/api/getApys)

**Parameters:**
- `address` (optional): address to use to calculate CRV boosts and APYs; if no address is provided, the baseline boost value (`1`) is used


**Response :**

```
"data": {
  "apys": {
    "saave": {
      "baseApy": "2.21",
      "crvApy": 4.430468225441863,
      "crvBoost":1,
      "additionalRewards": [
        { "name": "STKAAVE", "apy": 0.6132910288661984 }
      ],
      "crvPrice": 1.38
    },
    …
  }
}
```
