import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs/promises';
import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import v1Redirects from '#root/routes/v1/_redirects.json' assert { type: 'json' };
import rootRouteHandler from '#root/routes/root.js';
import { allBlockchainIds, allRegistryIds, allLendingRegistryIds, allLendingBlockchainIds } from '#root/utils/api.js';

const REDIRECT_PARAM_REGEX = /(\[[a-zA-Z0-9]+(?:=[a-zA-Z0-9]+)?\])/g;

export default async function(app) {
  app.use(bodyParser.json());
  app.get('/', rootRouteHandler);

  const v1Router = Router();

  /**
   * 1. Setup redirects as defined in `_redirects.json`
   *
   * Examples:
   * - Simple static redirect:
   *   `["getFactoryV2Pools-arbitrum", "getFactoryV2Pools/arbitrum"]`
   * - Redirect with param read from `req.query` and a default value:
   *   `["getFactoryAPYs/fantom", "getFactoryAPYs/fantom/[version=stable]"]`
   *   Visiting `getFactoryAPYs/fantom` would redirect to `getFactoryAPYs/fantom/stable`,
   *   and visiting `getFactoryAPYs/fantom?version=crypto` would redirect to `getFactoryAPYs/fantom/crypto`
   */
  for (const [from, to] of v1Redirects) {
    v1Router.get(`/${from}`, (req, res) => {
      let target = to;

      const redirectQueryParams = to.match(REDIRECT_PARAM_REGEX) ?? [];
      for (const placeholder of redirectQueryParams) {
        const [paramName, defaultValue] = placeholder.slice(1, -1).split('=');
        const paramValue = req.query[paramName] ?? defaultValue ?? '';
        target = target.replace(placeholder, paramValue);
      }

      res.redirect(301, `/v1/${target}`);
    });
  }

  /**
   * 2. Setup next-like filename-based routes
   * Supports simple routes like `/getPlatforms.js` and params like '/getPoolList/[blockchainId].js'
   */
  const v1Files = await fs.readdir(path.resolve(process.cwd(), './routes/v1'), { recursive: true });
  const v1RouteFiles = v1Files.filter((name) => (
    name.endsWith('.js') &&
    !name.includes('/_') // Exclude folders or files marked internal with an underscore prefix
  ));

  for (const name of v1RouteFiles) {
    // e.g. 'getPlatforms.js' -> 'getPlatforms'
    const routeWithoutFileExtension = name.slice(0, -3); // Name without the .js extension

    // e.g. 'getPoolList/[blockchainId].js' -> 'getPoolList/:blockchainId?'
    // See https://github.com/pillarjs/path-to-regexp for syntax passed to express
    const routeWithExpressParams = routeWithoutFileExtension.replace(/\[([^\]]+)\]/g, ":$1?");

    v1Router.get(`/${routeWithExpressParams}`, (await import(`./v1/${name}`)).default);
  }

  app.use('/v1', v1Router);
  app.use('/api', v1Router); // /api is a legacy alias for /v1 routes

  /**
   * 3. Setup documentation
   */
  const swaggerDoc = swaggerJsdoc({
    failOnErrors: true,
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Curve.fi API',
        version: '1.0.0',
      },
      servers: [{ url: 'https://api.curve.fi/v1' }],
      components: {
        parameters: {
          blockchainId: {
            in: 'path',
            name: 'blockchainId',
            required: true,
            schema: {
              type: 'string',
              enum: allBlockchainIds.sort((a, b) => (
                a === 'ethereum' ? -1 :
                  b === 'ethereum' ? 1 :
                    (a < b) ? -1 :
                      (a > b) ? 1 : 0
              )),
            },
          },
          registryId: {
            in: 'path',
            name: 'registryId',
            required: true,
            schema: {
              type: 'string',
              enum: allRegistryIds,
            },
          },
          lendingRegistryId: {
            in: 'path',
            name: 'lendingRegistryId',
            required: true,
            schema: {
              type: 'string',
              enum: allLendingRegistryIds,
            },
          },
          lendingBlockchainId: {
            in: 'path',
            name: 'lendingBlockchainId',
            required: true,
            schema: {
              type: 'string',
              enum: allLendingBlockchainIds,
            },
          },
        },
      },
    },
    apis: ['./routes/v1/**/*.js'],
  });

  app.get('/v1/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDoc);
  });

  app.use('/v1/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCssUrl: [
      '/css/swaggerui.css',
    ],
    customSiteTitle: 'Curve API Documentation',
    swaggerOptions: {
      tryItOutEnabled: true,
      tagsSorter: (a, b) => (
        a === 'Deprecated' ? 1 :
          b === 'Deprecated' ? -1 :
            a === 'Misc' ? 1 :
              b === 'Misc' ? -1 :
                (a.toLowerCase() < b.toLowerCase()) ? -1 :
                  (a.toLowerCase() > b.toLowerCase()) ? 1 : 0
      ),
    },
  }));
};
