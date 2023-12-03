import bodyParser from 'body-parser';
import test from './test.js';

export default function(app) {
  app.use(bodyParser.json());

  app.use('/test', test);
};
