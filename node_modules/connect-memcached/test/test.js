const supertest = require("supertest");


describe("Plain memcached session store", () => {
  const { app, memcachedStore } = require("./services/memcached_basic.js");
  const serverAgent = supertest.agent(app);

  it("GET / should increment views value at each request", async () => {
    let lastPageView = 0;
    for (var i = 1; i < 50; i++) {
      const res = await serverAgent.get("/");
      expect(res.status).toEqual(200);
      expect(res.type).toEqual(expect.stringContaining("json"));
      expect(res.body.pageviews).toBeGreaterThan(lastPageView);
      lastPageView = res.body.pageviews;
    }
  });

  afterAll(() => {
    memcachedStore.client.end();
  });
});

describe("Encrypted memcached session store", () => {
  const { app, memcachedStore } = require("./services/memcached_crypt.js");
  const serverAgent = supertest.agent(app);

  it("GET / should increment views value at each request", async () => {
    let lastPageView = 0;
    for (var i = 1; i < 50; i++) {
      const res = await serverAgent.get("/");
      expect(res.status).toEqual(200);
      expect(res.type).toEqual(expect.stringContaining("json"));
      expect(res.body.pageviews).toBeGreaterThan(lastPageView);
      lastPageView = res.body.pageviews;
    }
  });

  afterAll(() => {
    memcachedStore.client.end();
  });
});

describe("Encrypted session store using preexising memcached client", () => {
  const { app, memcachedStore } = require("./services/memcached_preexisting_crypt_connection.js");
  const serverAgent = supertest.agent(app);

  it("GET / should increment views value at each request", async () => {
    let lastPageView = 0;
    for (var i = 1; i < 50; i++) {
      const res = await serverAgent.get("/");
      expect(res.status).toEqual(200);
      expect(res.type).toEqual(expect.stringContaining("json"));
      expect(res.body.pageviews).toBeGreaterThan(lastPageView);
      expect(memcachedStore.kruptein.crypto).toBe(require("crypto"));
      lastPageView = res.body.pageviews;
    }
  });

  afterAll(() => {
    memcachedStore.client.end();
  });
});
