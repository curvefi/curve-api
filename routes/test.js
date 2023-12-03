import { Router } from 'express';
import swr from '../utils/swr.js';

const router = Router();

router.get('/', async function(req, resp) {
  const { value: result } = await swr('test', async () => Math.random());
  console.log('result', result)

  resp.send(`result: ${JSON.stringify(result)}`);
});

export default router;
