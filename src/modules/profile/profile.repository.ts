import { ProfileModel } from "./profile.model";
import { Profile, ProfileFilters, PaginationOptions } from "./profile.types";
import {
  NormalizedProfileQuery,
  normalizeProfileFilters,
  normalizeProfileName,
} from "./profile.normalization";

const PROJECTION = { _id: 0, __v: 0, normalized_name: 0 };

export const create = async (data: Profile): Promise<Profile> => {
  const created = await ProfileModel.create({
    ...data,
    normalized_name: normalizeProfileName(data.name),
  });

  return created.toObject({
    versionKey: false,
    transform: (_, ret: any) => {
      delete ret._id;
      delete ret.normalized_name;
      return ret as Profile;
    },
  }) as Profile;
};

export const findByNormalizedName = async (
  name: string,
): Promise<Profile | null> => {
  return ProfileModel.findOne({ normalized_name: normalizeProfileName(name) })
    .select("-_id -__v")
    .lean();
};

export const findById = async (
  id: string,
): Promise<Profile | null> => {
  return ProfileModel.findOne({ id }).select("-_id -__v").lean();
};

export const findExistingNormalizedNames = async (
  normalizedNames: string[],
): Promise<Set<string>> => {
  if (!normalizedNames.length) {
    return new Set();
  }

  const rows = await ProfileModel.find(
    {
      normalized_name: { $in: normalizedNames },
    },
    {
      _id: 0,
      normalized_name: 1,
    },
  ).lean();

  return new Set(rows.map((row: any) => row.normalized_name));
};

export const buildQuery = (filters: ProfileFilters): Record<string, any> => {
  const normalizedFilters = normalizeProfileFilters(filters);
  const query: Record<string, any> = {};

  if (normalizedFilters.gender) {
    query.gender = normalizedFilters.gender;
  }

  if (normalizedFilters.age_group) {
    query.age_group = normalizedFilters.age_group;
  }

  if (normalizedFilters.country_id) {
    query.country_id = normalizedFilters.country_id;
  }

  if (
    normalizedFilters.min_age !== undefined ||
    normalizedFilters.max_age !== undefined
  ) {
    query.age = {};
    if (normalizedFilters.min_age !== undefined) {
      query.age.$gte = normalizedFilters.min_age;
    }
    if (normalizedFilters.max_age !== undefined) {
      query.age.$lte = normalizedFilters.max_age;
    }
  }

  if (normalizedFilters.min_gender_probability !== undefined) {
    query.gender_probability = {
      $gte: normalizedFilters.min_gender_probability,
    };
  }

  if (normalizedFilters.min_country_probability !== undefined) {
    query.country_probability = {
      $gte: normalizedFilters.min_country_probability,
    };
  }

  return query;
};

export const buildSort = (
  pagination: Pick<NormalizedProfileQuery["pagination"], "order" | "sort_by">,
): Record<string, 1 | -1> => {
  const sortField = pagination.sort_by;
  const sortOrder = pagination.order === "desc" ? -1 : 1;
  return { [sortField]: sortOrder };
};

export const findAllPaginated = async (
  filters: ProfileFilters,
  pagination: PaginationOptions,
): Promise<{ data: Profile[]; total: number }> => {
  const query = buildQuery(filters);
  const sort = buildSort({
    sort_by: pagination.sort_by || "created_at",
    order: pagination.order || "asc",
  });
  const skip = (pagination.page - 1) * pagination.limit;

  const [result] = await ProfileModel.aggregate([
    { $match: query },
    { $sort: sort },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: pagination.limit },
          {
            $project: {
              _id: 0,
              normalized_name: 0,
            },
          },
        ],
        metadata: [{ $count: "total" }],
      },
    },
  ]);

  const data = (result?.data || []) as Profile[];
  const total = result?.metadata?.[0]?.total || 0;

  return { data, total };
};

export const findAll = async (
  filters: ProfileFilters,
  sortBy: PaginationOptions["sort_by"] = "created_at",
  order: PaginationOptions["order"] = "asc",
): Promise<Profile[]> => {
  const query = buildQuery(filters);
  const sort = buildSort({
    sort_by: sortBy || "created_at",
    order: order || "asc",
  });

  return (await ProfileModel.find(query, PROJECTION).sort(sort).lean()) as Profile[];
};

export const bulkUpsert = async (profiles: Profile[]): Promise<number> => {
  const operations = profiles.map((profile) => ({
    updateOne: {
      filter: { normalized_name: normalizeProfileName(profile.name) },
      update: {
        $setOnInsert: {
          ...profile,
          normalized_name: normalizeProfileName(profile.name),
        },
      },
      upsert: true,
    },
  }));

  const result = await ProfileModel.bulkWrite(operations, { ordered: false });
  return result.upsertedCount;
};

export const bulkInsertProfiles = async (
  profiles: Profile[],
): Promise<{
  inserted: number;
  duplicateConflicts: number;
}> => {
  if (!profiles.length) {
    return {
      inserted: 0,
      duplicateConflicts: 0,
    };
  }

  try {
    const result = await ProfileModel.insertMany(
      profiles.map((profile) => ({
        ...profile,
        normalized_name: normalizeProfileName(profile.name),
      })),
      {
        ordered: false,
        lean: true,
      },
    );

    return {
      inserted: result.length,
      duplicateConflicts: 0,
    };
  } catch (error: any) {
    const inserted = Array.isArray(error?.insertedDocs)
      ? error.insertedDocs.length
      : 0;
    const duplicateConflicts = Array.isArray(error?.writeErrors)
      ? error.writeErrors.filter((writeError: any) => writeError.code === 11000)
          .length
      : 0;

    return {
      inserted,
      duplicateConflicts,
    };
  }
};

export const remove = async (
  id: string,
): Promise<{ deletedCount?: number }> => {
  return ProfileModel.deleteOne({ id });
};

export const removeAll = async (): Promise<void> => {
  await ProfileModel.deleteMany({});
};
