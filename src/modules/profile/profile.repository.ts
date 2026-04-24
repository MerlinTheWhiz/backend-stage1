import { ProfileModel } from "./profile.model";
import { Profile, ProfileFilters, PaginationOptions } from "./profile.types";


const PROJECTION = { _id: 0, __v: 0 };

export const create = async (data: Profile): Promise<Profile> => {
  return ProfileModel.create(data);
};

export const findByName = async (
  name: string
): Promise<Profile | null> => {
  return ProfileModel.findOne({ name }).select("-_id -__v").lean();
};

export const findById = async (
  id: string
): Promise<Profile | null> => {
  return ProfileModel.findOne({ id }).select("-_id -__v").lean();
};

const buildQuery = (filters: ProfileFilters): Record<string, any> => {
  const query: Record<string, any> = {};

  if (filters.gender) {
    query.gender = filters.gender.toLowerCase();
  }

  if (filters.age_group) {
    query.age_group = filters.age_group.toLowerCase();
  }

  if (filters.country_id) {
    query.country_id = filters.country_id.toUpperCase();
  }

  // Age range filters
  if (filters.min_age !== undefined || filters.max_age !== undefined) {
    query.age = {};
    if (filters.min_age !== undefined) {
      query.age.$gte = filters.min_age;
    }
    if (filters.max_age !== undefined) {
      query.age.$lte = filters.max_age;
    }
  }

  // Probability filters
  if (filters.min_gender_probability !== undefined) {
    query.gender_probability = { $gte: filters.min_gender_probability };
  }

  if (filters.min_country_probability !== undefined) {
    query.country_probability = { $gte: filters.min_country_probability };
  }

  return query;
};

export const findAllPaginated = async (
  filters: ProfileFilters,
  pagination: PaginationOptions
): Promise<{ data: Profile[]; total: number }> => {
  const query = buildQuery(filters);

  // Build sort object
  const sortField = pagination.sort_by || "created_at";
  const sortOrder = pagination.order === "desc" ? -1 : 1;
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

  // Calculate skip
  const skip = (pagination.page - 1) * pagination.limit;

  // Execute query and count in parallel
  const [data, total] = await Promise.all([
    ProfileModel.find(query, PROJECTION)
      .sort(sort)
      .skip(skip)
      .limit(pagination.limit)
      .lean(),
    ProfileModel.countDocuments(query),
  ]);

  return { data: data as Profile[], total };
};

export const bulkUpsert = async (profiles: Profile[]): Promise<number> => {
  const operations = profiles.map((profile) => ({
    updateOne: {
      filter: { name: profile.name },
      update: { $setOnInsert: profile },
      upsert: true,
    },
  }));

  const result = await ProfileModel.bulkWrite(operations, { ordered: false });
  return result.upsertedCount;
};

export const remove = async (
  id: string
): Promise<{ deletedCount?: number }> => {
  return ProfileModel.deleteOne({ id });
};

export const removeAll = async (): Promise<void> => {
  await ProfileModel.deleteMany({});
};