const test = require("node:test");
const assert = require("node:assert/strict");

const { AuthController } = require("../dist/modules/auth/auth.controller");
const { OAuthUtils } = require("../dist/utils/oauth");
const { UserService } = require("../dist/modules/user/user.service");
const { RefreshTokenService } = require("../dist/modules/auth/refresh-token.service");
const { JWTUtils } = require("../dist/utils/jwt");

const createMockResponse = () => {
  const cookies = [];
  const clearedCookies = [];

  return {
    statusCode: 200,
    body: undefined,
    redirectUrl: undefined,
    cookies,
    clearedCookies,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options) {
      cookies.push({ name, value, options });
      return this;
    },
    clearCookie(name) {
      clearedCookies.push(name);
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
  };
};

const withPatchedMethod = async (target, methodName, replacement, callback) => {
  const original = target[methodName];
  target[methodName] = replacement;

  try {
    await callback();
  } finally {
    target[methodName] = original;
  }
};

test("githubCallback browser flow sets auth cookies, CSRF cookie, and redirects", async () => {
  const req = {
    query: { code: "oauth-code", state: "expected-state" },
    session: {
      state: "expected-state",
      codeVerifier: "pkce-verifier",
    },
    headers: {
      "user-agent": "Mozilla/5.0",
    },
    cookies: {},
  };
  const res = createMockResponse();

  await withPatchedMethod(
    OAuthUtils,
    "exchangeCodeForToken",
    async () => ({ access_token: "github-access-token" }),
    async () => withPatchedMethod(
      OAuthUtils,
      "getGitHubUser",
      async () => ({
        id: 1,
        login: "octocat",
        email: "octocat@example.com",
        avatar_url: "https://example.com/avatar.png",
        name: "Octo Cat",
      }),
      async () => withPatchedMethod(
        UserService,
        "createOrUpdateUser",
        async () => ({
          id: "user-1",
          github_id: "1",
          username: "octocat",
          email: "octocat@example.com",
          avatar_url: "https://example.com/avatar.png",
          role: "analyst",
          is_active: true,
          created_at: new Date().toISOString(),
        }),
        async () => withPatchedMethod(
          RefreshTokenService,
          "issueAuthTokens",
          async () => ({
            access_token: "access-token",
            refresh_token: "refresh-token",
          }),
          async () => {
            await AuthController.githubCallback(req, res);
          },
        ),
      ),
    ),
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.redirectUrl, "http://localhost:3001/dashboard");
  assert.deepEqual(
    res.cookies.map((cookie) => cookie.name).sort(),
    ["access_token", "csrf_token", "refresh_token"],
  );
});

test("refreshToken rotates tokens, returns the new pair, and refreshes the CSRF cookie", async () => {
  const req = {
    body: { refresh_token: "old-refresh-token" },
    cookies: {},
    headers: {},
  };
  const res = createMockResponse();

  await withPatchedMethod(
    JWTUtils,
    "verifyRefreshToken",
    () => ({ userId: "user-1", tokenId: "token-1" }),
    async () => withPatchedMethod(
      UserService,
      "findById",
      async () => ({
        id: "user-1",
        github_id: "1",
        username: "octocat",
        email: "octocat@example.com",
        avatar_url: "https://example.com/avatar.png",
        role: "analyst",
        is_active: true,
        created_at: new Date().toISOString(),
      }),
      async () => withPatchedMethod(
        RefreshTokenService,
        "rotateToken",
        async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
        }),
        async () => {
          await AuthController.refreshToken(req, res);
        },
      ),
    ),
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: "success",
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
  });
  assert.deepEqual(
    res.cookies.map((cookie) => cookie.name).sort(),
    ["access_token", "csrf_token", "refresh_token"],
  );
});

test("logout clears auth and CSRF cookies", async () => {
  const req = {
    body: { refresh_token: "old-refresh-token" },
    cookies: {},
    headers: {},
  };
  const res = createMockResponse();

  await withPatchedMethod(
    RefreshTokenService,
    "revokeToken",
    async () => {},
    async () => {
      await AuthController.logout(req, res);
    },
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.clearedCookies.sort(), [
    "access_token",
    "csrf_token",
    "refresh_token",
  ]);
});
