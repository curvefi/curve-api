import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import swr from './utils/swr.js';

const app = express();

app.use(bodyParser.raw());
app.use(methodOverride());

app.get('/', async function(req, resp) {
  const { value: result } = await swr('test', async () => Math.random());
  console.log('result', result)

  resp.send(`result: ${JSON.stringify(result)}`);
});

export default app;
