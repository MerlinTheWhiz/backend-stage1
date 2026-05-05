const test = require("node:test");
const assert = require("node:assert/strict");

const profileService = require("../dist/modules/profile/profile.service");
const profileRepo = require("../dist/modules/profile/profile.repository");
const {
  buildProfileCacheKey,
  normalizeProfileName,
  normalizeProfileQuery,
} = require("../dist/modules/profile/profile.normalization");
const { getGender } = require("../dist/clients/genderize.client");
const { getAge } = require("../dist/clients/agify.client");
const { getNationality } = require("../dist/clients/nationalize.client");

const withPatchedMethod = async (target, methodName, replacement, callback) => {
  const original = target[methodName];
  target[methodName] = replacement;

  try {
    await callback();
  } finally {
    target[methodName] = original;
  }
};

test("normalizeProfileName collapses whitespace and casing for idempotency", () => {
  assert.equal(normalizeProfileName("  Jane   DOE "), "jane doe");
});

test("equivalent parsed filters produce the same canonical cache key", () => {
  const first = normalizeProfileQuery(
    {
      country_id: "ng",
      gender: "Female",
      min_age: 20,
      max_age: 45,
    },
    {
      page: 1,
      limit: 10,
    },
  );

  const second = normalizeProfileQuery(
    {
      max_age: 45,
      min_age: 20,
      gender: "female",
      country_id: "NG",
    },
    {
      page: 1,
      limit: 10,
      sort_by: "created_at",
      order: "asc",
    },
  );

  assert.deepEqual(first, second);
  assert.equal(
    buildProfileCacheKey("/api/profiles/search", first),
    buildProfileCacheKey("/api/profiles/search", second),
  );
});

test("repeated equivalent profile list queries reuse the same cache entry", async () => {
  let findAllPaginatedCalls = 0;

  await withPatchedMethod(
    profileRepo,
    "findAllPaginated",
    async () => {
      findAllPaginatedCalls += 1;
      return {
        data: [],
        total: 0,
      };
    },
    async () => {
      await profileService.getProfiles(
        { gender: "Female", country_id: "ng", page: "1", limit: "10" },
        "/api/profiles/cache-hit-test",
      );
      await profileService.getProfiles(
        {
          country_id: "NG",
          limit: "10",
          page: "1",
          order: "asc",
          sort_by: "created_at",
          gender: "female",
        },
        "/api/profiles/cache-hit-test",
      );
    },
  );

  assert.equal(findAllPaginatedCalls, 1);
});

test("writes invalidate cached profile list results", async () => {
  let findAllPaginatedCalls = 0;

  await withPatchedMethod(
    profileRepo,
    "findAllPaginated",
    async () => {
      findAllPaginatedCalls += 1;
      return {
        data: [],
        total: 0,
      };
    },
    async () => withPatchedMethod(
      profileRepo,
      "findByNormalizedName",
      async () => null,
      async () => withPatchedMethod(
        profileRepo,
        "create",
        async (profile) => profile,
        async () => withPatchedMethod(
          require("../dist/clients/genderize.client"),
          "getGender",
          async () => ({ gender: "female", probability: 0.97, count: 100 }),
          async () => withPatchedMethod(
            require("../dist/clients/agify.client"),
            "getAge",
            async () => ({ age: 28, count: 100 }),
            async () => withPatchedMethod(
              require("../dist/clients/nationalize.client"),
              "getNationality",
              async () => ({
                country: [{ country_id: "NG", probability: 0.9 }],
              }),
              async () => {
                await profileService.getProfiles(
                  { page: "1", limit: "10" },
                  "/api/profiles/cache-invalidation-test",
                );
                await profileService.getProfiles(
                  { page: "1", limit: "10" },
                  "/api/profiles/cache-invalidation-test",
                );

                await profileService.createProfile("Ada Lovelace");

                await profileService.getProfiles(
                  { page: "1", limit: "10" },
                  "/api/profiles/cache-invalidation-test",
                );
              },
            ),
          ),
        ),
      ),
    ),
  );

  assert.equal(findAllPaginatedCalls, 2);
});
