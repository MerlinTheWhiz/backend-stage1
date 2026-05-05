import { PaginationOptions, ProfileFilters } from "./profile.types";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const DEFAULT_SORT_BY: NonNullable<PaginationOptions["sort_by"]> =
  "created_at";
export const DEFAULT_ORDER: NonNullable<PaginationOptions["order"]> = "asc";

export interface NormalizedProfileQuery {
  filters: ProfileFilters;
  pagination: Required<PaginationOptions>;
}

export const normalizeProfileName = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

export const normalizeProfileFilters = (
  filters: ProfileFilters,
): ProfileFilters => {
  const normalized: ProfileFilters = {};

  if (filters.age_group) {
    normalized.age_group = filters.age_group.toLowerCase();
  }

  if (filters.country_id) {
    normalized.country_id = filters.country_id.toUpperCase();
  }

  if (filters.gender) {
    normalized.gender = filters.gender.toLowerCase();
  }

  if (filters.max_age !== undefined) {
    normalized.max_age = filters.max_age;
  }

  if (filters.min_age !== undefined) {
    normalized.min_age = filters.min_age;
  }

  if (filters.min_country_probability !== undefined) {
    normalized.min_country_probability = filters.min_country_probability;
  }

  if (filters.min_gender_probability !== undefined) {
    normalized.min_gender_probability = filters.min_gender_probability;
  }

  return normalized;
};

export const normalizeProfileQuery = (
  filters: ProfileFilters,
  pagination: PaginationOptions,
): NormalizedProfileQuery => ({
  filters: normalizeProfileFilters(filters),
  pagination: {
    page: pagination.page || DEFAULT_PAGE,
    limit: pagination.limit || DEFAULT_LIMIT,
    sort_by: pagination.sort_by || DEFAULT_SORT_BY,
    order: pagination.order || DEFAULT_ORDER,
  },
});

export const buildProfileCacheKey = (
  prefix: string,
  normalizedQuery: NormalizedProfileQuery,
): string =>
  JSON.stringify({
    prefix,
    filters: normalizedQuery.filters,
    pagination: normalizedQuery.pagination,
  });
