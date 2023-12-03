import bodyParser from 'body-parser';
import test from './test.js';
import getGas from './v1/getGas.js';

export default function(app) {
  app.use(bodyParser.json());

  app.use('/test', test);
  app.use('/v1', getGas);
};
