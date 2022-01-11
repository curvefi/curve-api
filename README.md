# Curve API

This API is used by various services to serve data. It is a public API intended for all those seeking to integrate Curve data onto their own projects.

## [Status / Uptime monitoring](https://statuspage.freshping.io/59335-CurveAPI)

## [Changelog](https://github.com/curvefi/curve-api/blob/main/CHANGELOG.md)

## Public REST API Endpoints

Endpoints list and example response can be found by **[clicking here](https://github.com/curvefi/curve-api/blob/main/endpoints.md)**

## How to add a new endpoint

1. Create a new file under `/pages/api`: the endpoint will be accessible through the same path, e.g. `/pages/api/hithere` would accessible through `api.curve.fi/api/hithere`
2. If this endpoint requires passing any data as a query parameter, name that parameter in the path itself (e.g. `/pages/api/user/[id].js`)
3. The endpoint script must export a function, wrapped in the utility `fn()`, that returns a json object – that's it
4. **Query params:** any query params defined as in (2) are accessible in the first argument passed to `fn`, e.g. `fn(({ id }) => ({ message: \`Id passed as argument: ${id}\`}))`
5. **Caching:** pass an object as second argument to `fn`, and set the cache duration in seconds with the `maxAge` property: `{ maxAge: 60 }`

## Dev

Run: `vercel dev`
