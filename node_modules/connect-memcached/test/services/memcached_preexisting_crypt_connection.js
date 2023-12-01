const express = require("express"),
  session = require("express-session"),
  app = express(),
  Memcached = require("memcached"),
  MemcachedStore = require("../../lib/connect-memcached")(session);

const memcachedClient = new Memcached("127.0.0.1:11211");

const memcachedStore = new MemcachedStore({
  client: memcachedClient,
  prefix: "testapp_encrypt_",
  secret: "Hello there stranger!",
});

app.use(
  session({
    secret: "TestEncryptSecret",
    key: "test_encrypt",
    proxy: "true",
    resave: false,
    saveUninitialized: false,
    store: memcachedStore,
  })
);

app.get("/", function (req, res) {
  if (req.session.views) {
    ++req.session.views;
  } else {
    req.session.views = 1;
  }
  res.json({ pageviews: req.session.views });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(9341, function () {
    console.log("Listening on %d", this.address().port);
  });
}

module.exports = {
  app: app,
  memcachedStore: memcachedStore,
};
