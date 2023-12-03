import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs/promises';
import { Router } from 'express';

export default async function(app) {
  app.use(bodyParser.json());

  // Next-like filename-based routes
  const v1Router = Router();
  const v1Files = await fs.readdir(path.resolve(process.cwd(), './routes/v1'), { recursive: true });
  const v1RouteFiles = v1Files.filter((name) => name.endsWith('.js'));

  for (const name of v1RouteFiles) {
    const route = name.slice(0, -3); // Name without the .js extension
    v1Router.get(`/${route}`, (await import(`./v1/${name}`)).default);
  }

  app.use('/v1', v1Router);
};
