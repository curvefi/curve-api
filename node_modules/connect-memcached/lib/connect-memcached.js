/*!
 * connect-memcached
 * MIT Licensed
 */
const bufferFrom = require('buffer-from');

var Memcached = require("memcached");
var oneDay = 86400;

function ensureCallback(fn) {
  return function() {
    fn && fn.apply(null, arguments);
  };
}

/**
 * Return the `MemcachedStore` extending `connect`'s session Store.
 *
 * @param {object} session
 * @return {Function}
 * @api public
 */
module.exports = function(session) {
  var Store = session.Store;

  /**
   * Initialize MemcachedStore with the given `options`.
   *
   * @param {Object} options
   * @api public
   */
  function MemcachedStore(options) {
    options = options || {};
    Store.call(this, options);

    this.prefix = options.prefix || "";
    this.ttl = options.ttl;
    if (!options.client) {
      if (!options.hosts) {
        options.hosts = "127.0.0.1:11211";
      }

      options.client = new Memcached(options.hosts, options);
    }

    if (options.secret) { 
      options.algorithm = options.algorithm || 'aes-256-gcm';
      options.hashing = options.hashing || 'sha512';
      this.kruptein = require("kruptein")(options);
      this.secret = options.secret;
    }

    this.client = options.client;
  }

  MemcachedStore.prototype.__proto__ = Store.prototype;

  /**
   * Translates the given `sid` into a memcached key, optionally with prefix.
   *
   * @param {String} sid
   * @api private
   */
  MemcachedStore.prototype.getKey = function getKey(sid) {
    return this.prefix + sid;
  };

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */
  MemcachedStore.prototype.get = function(sid, fn) {
    var self = this, sid = this.getKey(sid),
        parseable_string;

    this.client.get(sid, function(err, data) {
      if (err) {
        return fn(err, {});
      }
      try {
        if (!data) {
          return fn();
        }

        if (self.secret) {
          self.kruptein.get(self.secret, data, function(err, ct) {
            if (err)
              return fn(err, {});

            parseable_string = JSON.parse(ct);
          });
        } else {
          parseable_string = data;
        }

	fn(null, parseable_string);
      } catch (e) {
        fn(e);
      }
    });
  };

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */
  MemcachedStore.prototype.set = function(sid, sess, fn) {
    sid = this.getKey(sid);

    try {
      var maxAge = sess.cookie.maxAge;
      var ttl =
        this.ttl || ("number" == typeof maxAge ? (maxAge / 1000) | 0 : oneDay);

      if (this.secret) {
        this.kruptein.set(this.secret, sess, function(err, ct) {
          if (err)
            return fn(err);

          sess = ct;
        });
      }

      this.client.set(sid, sess, ttl, ensureCallback(fn));
    } catch (err) {
      fn && fn(err);
    }
  };

  /**
   * Destroy the session associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */
  MemcachedStore.prototype.destroy = function(sid, fn) {
    sid = this.getKey(sid);
    this.client.del(sid, ensureCallback(fn));
  };

  /**
   * Fetch number of sessions.
   *
   * @param {Function} fn
   * @api public
   */
  MemcachedStore.prototype.length = function(fn) {
    this.client.items(ensureCallback(fn));
  };

  /**
   * Clear all sessions.
   *
   * @param {Function} fn
   * @api public
   */
  MemcachedStore.prototype.clear = function(fn) {
    this.client.flush(ensureCallback(fn));
  };

  /**
   * Refresh the time-to-live for the session with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */

  MemcachedStore.prototype.touch = function(sid, sess, fn) {
    this.set(sid, sess, fn);
  };

  return MemcachedStore;
};
