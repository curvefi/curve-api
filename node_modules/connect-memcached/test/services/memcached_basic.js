const express = require("express"),
  session = require("express-session"),
  app = express(),
  MemcachedStore = require("../../lib/connect-memcached")(session);

const memcachedStore = new MemcachedStore({
  hosts: ["127.0.0.1:11211"],
  prefix: "testapp_",
});

app.use(
  session({
    secret: "TestSecret",
    key: "test",
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
