const test = require("node:test");
const assert = require("node:assert/strict");

process.env.GITHUB_CLIENT_ID = "test-client-id";

const app = require("../dist/app").default;
const authRoutes = require("../dist/modules/auth/auth.routes").default;
const apiRouter = require("../dist/routes").router;
const profileRouter = require("../dist/modules/profile/profile.routes").default;
const {
  requireCsrfProtection,
} = require("../dist/middlewares/csrf.middleware");

const createMockResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("app mounts auth routes on both /auth/* and /api/auth/* paths", () => {
  const authAliasLayer = app.router.stack.find((layer) => layer.handle === authRoutes);
  const apiLayer = app.router.stack.find((layer) => layer.handle === apiRouter);

  assert.ok(authAliasLayer, "expected direct /auth router mount");
  assert.ok(apiLayer, "expected /api router mount");
  assert.ok(authAliasLayer.matchers[0]("/auth/github"));
  assert.equal(authAliasLayer.matchers[0]("/api/auth/github"), false);
  assert.ok(apiLayer.matchers[0]("/api/auth/github"));
});

test("CSRF middleware rejects cookie-authenticated unsafe requests without a token", () => {
  const req = {
    method: "POST",
    headers: {},
    cookies: {
      refresh_token: "stale-token",
    },
  };
  const res = createMockResponse();
  let nextCalled = false;

  requireCsrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    status: "error",
    message: "CSRF token invalid or missing",
  });
});

test("CSRF middleware accepts cookie-authenticated unsafe requests with a matching token", () => {
  const req = {
    method: "POST",
    headers: {
      "x-csrf-token": "csrf-123",
    },
    cookies: {
      refresh_token: "stale-token",
      csrf_token: "csrf-123",
    },
  };
  const res = createMockResponse();
  let nextCalled = false;

  requireCsrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("profile routes require X-API-Version before authentication middleware runs", () => {
  const versionMiddleware = profileRouter.stack[0].handle;
  const req = {
    headers: {},
  };
  const res = createMockResponse();
  let nextCalled = false;

  versionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    status: "error",
    message: "API version header required",
  });
});
