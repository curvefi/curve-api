#!/usr/bin/env node

import app from '#root/app.js';
import { IS_DEV } from '#root/constants/AppConstants.js';
import cluster from 'cluster';
import Debug from 'debug';
import http from 'http';
import os from 'os';

const debug = Debug('nodejs-example-express-elasticache:server');
const cpuCount = os.cpus().length;
const workers = {};

function spawn() {
  const worker = cluster.fork();
  workers[worker.pid] = worker;
  return worker;
}

// Get port from environment and store in Express.
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

if (cluster.isPrimary) {
  const workerCount = IS_DEV ? 1 : cpuCount;
  for (let i = 0; i < workerCount; i++) {
    spawn();
  }

  // If a worker dies, log it to the console and start another worker.
  cluster.on('exit', function(worker, code, signal) {
    console.log('Worker ' + worker.process.pid + ' died.');
    cluster.fork();
  });

  // Log when a worker starts listening
  cluster.on('listening', function(worker, address) {
    console.log('Worker started with PID ' + worker.process.pid + '.');
  });

} else {
  let server = http.createServer(app);

  function onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
  }

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
}

// Normalize a port into a number, string, or false.
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
