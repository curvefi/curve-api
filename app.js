/**
 * Module dependencies.
 */

import express from 'express';
import session from 'express-session';
import { raw } from 'body-parser';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import { readFile } from 'fs';

const filename = '/var/nodelist';
const app = express();

let MemcachedStore = require('connect-memcached')(session);

function setup(cacheNodes) {
  app.use(raw());
  app.use(methodOverride());
  if (cacheNodes.length > 0) {
    app.use(cookieParser());

    console.log('Using memcached store nodes:');
    console.log(cacheNodes);

    app.use(session({
      secret: 'your secret here',
      resave: false,
      saveUninitialized: false,
      store: new MemcachedStore({ 'hosts': cacheNodes })
    }));
  } else {
    console.log('Not using memcached store.');
    app.use(session({
      resave: false,
      saveUninitialized: false, secret: 'your secret here'
    }));
  }

  app.get('/', function(req, resp) {
    if (req.session.views) {
      req.session.views++
      resp.setHeader('Content-Type', 'text/html')
      resp.send(`You are session: ${req.session.id}. Views: ${req.session.views}`)
    } else {
      req.session.views = 1
      resp.send(`You are session: ${req.session.id}. No views yet, refresh the page!`)
    }
  });

  if (!module.parent) {
    console.log('Running express without cluster. Listening on port %d', process.env.PORT || 5000)
    app.listen(process.env.PORT || 5000)
  }
}

console.log("Reading elastic cache configuration")
// Load elasticache configuration.
readFile(filename, 'UTF8', function(err, data) {
  if (err) throw err;

  let cacheNodes = []
  if (data) {
    let lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 0) {
        cacheNodes.push(lines[i])
      }
    }
  }

  setup(cacheNodes)
});

export default app;
