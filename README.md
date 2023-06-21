# Curve API

* [Introduction](#introduction)
* [Features](#features)
* [Getting Started](#getting-started)
* [Public REST API Endpoints](#public-rest-api-endpoints)
  *  [How to add a new endpoint](#how-to-add-a-new-endpoint)
* [Development Server](#development-server)
* [Community and Support](#community-and-support)

## Introduction
The Curve API provides developers a powerful and efficient way to interact with the CurveFi protocol. CurveFi is a decentralized exchange optimized for stablecoin trading, offering low slippage and low fees for stablecoin swaps.

This repository serves as the central hub for the Curve API, containing all the necessary code and documentation to get started. Whether you're a developer looking to integrate CurveFi into your application or a curious enthusiast seeking to explore the protocol's capabilities, you've come to the right place.

## Features
* **Stablecoin Swaps**: The Curve API allows users to seamlessly swap between various stablecoins, including but not limited to DAI, USDC, USDT, TUSD, and more. With CurveFi's optimized algorithm, you can achieve low slippage and reduced fees for your stablecoin trades.

* **Liquidity Pool Information**: Obtain real-time data on CurveFi liquidity pools, including pool balances, available liquidity, and historical trade volumes. Access this information to make informed decisions or build analytics tools around CurveFi's liquidity pools.

* **Transaction Support**: Perform swaps, deposits, and withdrawals directly through the Curve API. Seamlessly integrate these actions into your applications or trading bots, and take advantage of the optimized trading experience CurveFi provides.

* **Detailed Documentation**: We believe provide comprehensive documentation to assist developers in understanding and utilizing the Curve API. The repository includes detailed guides, code examples, and API references, making it easy for beginners and experienced developers to get started.

## Getting Started

To get started with the Curve API, follow these simple steps:

1. Clone the Curve API repository to your local machine.

```bash
git clone https://github.com/curvefi/curve-api.git
```

2. Explore the documentation folder to understand the various API endpoints and their functionalities.

3. Familiarize yourself with the code examples to see how to interact with the Curve API effectively.

4. Configure your development environment and set up any necessary dependencies.

5. Begin integrating the Curve API into your application or project.

## Public REST API Endpoints

Find the endpoints list and example responses by **[clicking here](https://github.com/curvefi/curve-api/blob/main/endpoints.md)**

### How to add a new endpoint

1. Create a new file under `/pages/api`: the endpoint will be accessible through the same path, e.g. `/pages/api/hithere` would accessible through `api.curve.fi/api/hithere`
2. If this endpoint requires passing any data as a query parameter, name that parameter in the path itself (e.g. `/pages/api/user/[id].js`)
3. The endpoint script must export a function, wrapped in the utility `fn()`, that returns a json object – that's it
4. **Query params:** any query params defined as in (2) are accessible in the first argument passed to `fn`, e.g. `fn(({ id }) => ({ message: \`Id passed as argument: ${id}\`}))`
5. **Caching:** pass an object as second argument to `fn`, and set the cache duration in seconds with the `maxAge` property: `{ maxAge: 60 }`

## Development Server
To start the local development server, run `vercel dev`

## Community and Support
CurveFi has a vibrant and active community that welcomes developers and enthusiasts alike. If you have any questions, need assistance, or want to share your experiences, we encourage you to join our community channels:

* [CurveFi Discord](https://discord.com/invite/uXsRdJu)
* [CurveFi Forum](https://gov.curve.fi/)

Additionally, if you encounter any issues or have suggestions for improving the Curve API, please open an issue in this repository. We value community feedback and appreciate your contributions to improving the CurveFi ecosystem.

* [Status / Uptime monitoring](https://statuspage.freshping.io/59335-CurveAPI)
* [Changelog](https://github.com/curvefi/curve-api/blob/main/CHANGELOG.md)
