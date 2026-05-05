import { performance } from "node:perf_hooks";
import * as repo from "../modules/profile/profile.repository";
import {
  getProfileById,
  getProfiles,
  invalidateProfileCaches,
} from "../modules/profile/profile.service";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const measure = async (
  label: string,
  action: () => Promise<unknown>,
): Promise<{ label: string; durationMs: number }> => {
  const startedAt = performance.now();
  await action();
  return {
    label,
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
  };
};

const main = async () => {
  const mutableRepo = repo as {
    findAllPaginated: typeof repo.findAllPaginated;
    findById: typeof repo.findById;
  };
  const originalFindAllPaginated = mutableRepo.findAllPaginated;
  const originalFindById = mutableRepo.findById;

  try {
    mutableRepo.findAllPaginated = async () => {
      await delay(75);
      return {
        data: [],
        total: 0,
      };
    };

    mutableRepo.findById = async (id: string) => {
      await delay(40);
      return {
        id,
        name: "Ada Lovelace",
        gender: "female",
        gender_probability: 0.97,
        age: 28,
        age_group: "adult",
        country_id: "NG",
        country_name: "Nigeria",
        country_probability: 0.9,
        created_at: new Date().toISOString(),
      };
    };

    invalidateProfileCaches();

    const uncachedList = await measure("uncached_list", () =>
      getProfiles(
        { gender: "female", country_id: "NG", page: "1", limit: "10" },
        "/benchmarks/list-a",
      ),
    );

    const cachedEquivalentList = await measure("cached_equivalent_list", () =>
      getProfiles(
        {
          country_id: "ng",
          limit: "10",
          page: "1",
          sort_by: "created_at",
          order: "asc",
          gender: "Female",
        },
        "/benchmarks/list-a",
      ),
    );

    const uncachedId = await measure("uncached_profile_by_id", () =>
      getProfileById("profile-1"),
    );

    const cachedId = await measure("cached_profile_by_id", () =>
      getProfileById("profile-1"),
    );

    console.table([
      uncachedList,
      cachedEquivalentList,
      uncachedId,
      cachedId,
    ]);
  } finally {
    mutableRepo.findAllPaginated = originalFindAllPaginated;
    mutableRepo.findById = originalFindById;
  }
};

main().catch((error) => {
  console.error("Benchmark failed", error);
  process.exit(1);
});
