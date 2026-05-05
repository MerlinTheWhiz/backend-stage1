const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const repo = require("../dist/modules/profile/profile.repository");
const {
  ingestProfilesCsv,
} = require("../dist/modules/profile/profile.ingestion");

const withPatchedMethod = async (target, methodName, replacement, callback) => {
  const original = target[methodName];
  target[methodName] = replacement;

  try {
    await callback();
  } finally {
    target[methodName] = original;
  }
};

test("ingestProfilesCsv processes valid rows and skips invalid ones with reason counts", async () => {
  const csv = [
    "name,gender,age,country_id",
    "Ada Lovelace,female,28,NG",
    "Existing Person,male,40,US",
    "Bad Age,male,-1,NG",
    ",female,22,NG",
    "\"Broken Quote,female,22,NG",
    "Ada Lovelace,female,28,NG",
  ].join("\n");

  await withPatchedMethod(
    repo,
    "findExistingNormalizedNames",
    async () => new Set(["existing person"]),
    async () => withPatchedMethod(
      repo,
      "bulkInsertProfiles",
      async (profiles) => ({
        inserted: profiles.length,
        duplicateConflicts: 0,
      }),
      async () => {
        const result = await ingestProfilesCsv(Readable.from(csv));

        assert.deepEqual(result, {
          status: "success",
          total_rows: 6,
          inserted: 1,
          skipped: 5,
          reasons: {
            duplicate_name: 2,
            invalid_age: 1,
            malformed_row: 1,
            missing_fields: 1,
          },
        });
      },
    ),
  );
});

test("ingestProfilesCsv rejects headers missing required columns", async () => {
  const csv = ["name,gender,age", "Ada Lovelace,female,28"].join("\n");

  await assert.rejects(
    () => ingestProfilesCsv(Readable.from(csv)),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /Missing required CSV header: country_id/);
      return true;
    },
  );
});
