import getCacheNodes from './utils/getCacheNodes.js';
import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import { Client } from 'memjs';

const app = express();

getCacheNodes().then((cacheNodes) => {
  app.use(bodyParser.raw());
  app.use(methodOverride());
  if (cacheNodes.length > 0) {
    console.log('Using memcached store nodes:');
    console.log(cacheNodes);
  } else {
    console.log('Not using memcached store.');
  }

  app.get('/', async function(req, resp) {
    if (cacheNodes.length > 0) {
      const client = Client.create(cacheNodes.join(',')); // memjs takes a comma-separated list of hosts
      const { value } = await client.get('test');
      if (value === null) {
        await client.set('test', JSON.stringify(Math.random()), { expires: 10 })
        resp.send('no value found: set a random value that youll see on next refresh and that will last for 10s!')
      } else {
        resp.send(`value found: ${value} - ${JSON.stringify(value)} - ${JSON.parse(value)}`)
      }
    }
  });
});

export default app;
