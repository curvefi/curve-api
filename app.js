import express from 'express';
import routeSetup from './routes/_setup.js';

const app = express();
await routeSetup(app);

export default app;
