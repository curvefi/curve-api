import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs/promises';
import { Router } from 'express';
import v1Redirects from '#root/routes/v1/_redirects.json' assert { type: 'json' };

export default async function(app) {
  app.use(bodyParser.json());

  /**
   * Next-like filename-based routes
   * Supports simple routes like `/getPlatforms.js` and params like '/getPoolList/[blockchainId].js'
   */
  const v1Router = Router();
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

  /**
   * Setup redirects as defined in simple config file
   */
  for (const [from, to] of v1Redirects) {
    v1Router.get(`/${from}`, (_, res) => res.redirect(301, `/v1/${to}`));
  }

  app.use('/v1', v1Router);
};
