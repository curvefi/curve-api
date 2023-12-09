import express from 'express';
import routeSetup from '#root/routes/_setup.js';
import accessControl from '#root/middleware/access-control.js';

const app = express();

app.use(accessControl);
await routeSetup(app);
app.use(express.static('public'));

export default app;
