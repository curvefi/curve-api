import express from 'express';
import routeSetup from '#root/routes/_setup.js';

const app = express();

await routeSetup(app);
app.use(express.static('public'));

export default app;
