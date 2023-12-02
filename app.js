/**
 * Module dependencies.
 */

const { IS_DEV } = require('./constants/AppConstants');
const getCacheNodes = require('./utils/getCacheNodes');

const express = require('express'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  cookieParser = require('cookie-parser'),
  app = express(),
  memjs = require('memjs');

let MemcachedStore = require('connect-memcached')(session);

getCacheNodes().then((cacheNodes) => {
  app.use(bodyParser.raw());
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

  app.get('/', async function(req, resp) {
    if (cacheNodes.length > 0) {
      const client = memjs.Client.create(cacheNodes.join(',')); // memjs takes a comma-separated list of hosts
      const { value } = await client.get('test');
      if (value === null) {
        await client.set('test', JSON.stringify(Math.random()), { expires: 10 })
        resp.send('no value found: set a random value that youll see on next refresh and that will last for 10s!')
      } else {
        resp.send(`value found: ${value} - ${JSON.stringify(value)} - ${JSON.parse(value)}`)
      }
    }

    // if (req.session.views) {
    //   req.session.views++
    //   resp.setHeader('Content-Type', 'text/html')
    //   resp.send(`You are session: ${req.session.id}. Views: ${req.session.views}`)
    // } else {
    //   req.session.views = 1
    //   resp.send(`You are session: ${req.session.id}. No views yet, refresh the page!`)
    // }
  });

  if (!module.parent) {
    console.log('Running express without cluster. Listening on port %d', process.env.PORT || 5000)
    app.listen(process.env.PORT || 5000)
  }
});

module.exports = app;
