import * as repo from "./profile.repository";
import { getGender } from "../../clients/genderize.client";
import { getAge } from "../../clients/agify.client";
import { getNationality } from "../../clients/nationalize.client";
import { getAgeGroup } from "../../utils/ageGroup";
import { generateUUID } from "../../utils/uuid";
import { getCountryName } from "../../utils/countryNames";

import {
  GenderizeResponse,
  AgifyResponse,
  NationalizeResponse,
  Profile,
  ProfileFilters,
  PaginationOptions,
  PaginatedResponse,
} from "./profile.types";

// Valid values for query parameter validation
const VALID_SORT_BY = ["age", "created_at", "gender_probability"];
const VALID_ORDER = ["asc", "desc"];
const VALID_GENDERS = ["male", "female"];
const VALID_AGE_GROUPS = ["child", "teenager", "adult", "senior"];

export const parseQueryParams = (
  query: Record<string, any>,
): { filters: ProfileFilters; pagination: PaginationOptions } => {
  const filters: ProfileFilters = {};
  const pagination: PaginationOptions = {
    page: 1,
    limit: 10,
  };

  if (query.page !== undefined) {
    const page = Number(query.page);
    if (!Number.isInteger(page) || page < 1) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    pagination.page = page;
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    pagination.limit = Math.min(limit, 50);
  }

  if (query.sort_by !== undefined) {
    if (!VALID_SORT_BY.includes(query.sort_by)) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    pagination.sort_by = query.sort_by;
  }

  if (query.order !== undefined) {
    if (!VALID_ORDER.includes(query.order.toLowerCase())) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    pagination.order = query.order.toLowerCase();
  }

  if (query.gender !== undefined) {
    if (!VALID_GENDERS.includes(query.gender.toLowerCase())) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    filters.gender = query.gender.toLowerCase();
  }

  if (query.age_group !== undefined) {
    if (!VALID_AGE_GROUPS.includes(query.age_group.toLowerCase())) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    filters.age_group = query.age_group.toLowerCase();
  }

  if (query.country_id !== undefined) {
    filters.country_id = query.country_id.toUpperCase();
  }

  if (query.min_age !== undefined) {
    const val = Number(query.min_age);
    if (isNaN(val) || val < 0) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    filters.min_age = val;
  }

  if (query.max_age !== undefined) {
    const val = Number(query.max_age);
    if (isNaN(val) || val < 0) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    filters.max_age = val;
  }

  if (query.min_gender_probability !== undefined) {
    const val = Number(query.min_gender_probability);
    if (isNaN(val) || val < 0 || val > 1) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    filters.min_gender_probability = val;
  }

  if (query.min_country_probability !== undefined) {
    const val = Number(query.min_country_probability);
    if (isNaN(val) || val < 0 || val > 1) {
      const err: any = new Error("Invalid query parameters");
      err.statusCode = 422;
      throw err;
    }
    filters.min_country_probability = val;
  }

  return { filters, pagination };
};

export const createProfile = async (
  name: string,
): Promise<{
  exists: boolean;
  data: Profile;
}> => {
  const normalized = name.toLowerCase();

  const existing = await repo.findByName(normalized);
  if (existing) {
    return { exists: true, data: existing };
  }

  const [genderData, ageData, nationData]: [
    GenderizeResponse,
    AgifyResponse,
    NationalizeResponse,
  ] = await Promise.all([
    getGender(normalized),
    getAge(normalized),
    getNationality(normalized),
  ]);

  if (!genderData.gender || genderData.count === 0) {
    const err: any = new Error("Genderize returned an invalid response");
    err.statusCode = 502;
    throw err;
  }

  if (!ageData.age) {
    const err: any = new Error("Agify returned an invalid response");
    err.statusCode = 502;
    throw err;
  }

  if (!nationData.country.length) {
    const err: any = new Error("Nationalize returned an invalid response");
    err.statusCode = 502;
    throw err;
  }

  const ageGroup = getAgeGroup(ageData.age);

  const topCountry = nationData.country.reduce((prev, curr) =>
    curr.probability > prev.probability ? curr : prev,
  );

  const profile: Profile = {
    id: generateUUID(),
    name: normalized,
    gender: genderData.gender,
    gender_probability: genderData.probability,
    age: ageData.age,
    age_group: ageGroup,
    country_id: topCountry.country_id,
    country_name: getCountryName(topCountry.country_id),
    country_probability: topCountry.probability,
    created_at: new Date().toISOString(),
  };

  await repo.create(profile);

  return { exists: false, data: profile };
};

export const getProfiles = async (
  query: Record<string, any>,
): Promise<PaginatedResponse> => {
  const { filters, pagination } = parseQueryParams(query);

  const { data, total } = await repo.findAllPaginated(filters, pagination);

  const totalPages = Math.ceil(total / pagination.limit);
  const baseUrl = "/api/profiles";
  const queryParams = new URLSearchParams();

  Object.entries({ ...filters, ...pagination }).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });

  const buildUrl = (page: number, limit: number) => {
    const params = new URLSearchParams(queryParams);
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  const links = {
    self: buildUrl(pagination.page, pagination.limit),
    next:
      pagination.page < totalPages
        ? buildUrl(pagination.page + 1, pagination.limit)
        : null,
    prev:
      pagination.page > 1
        ? buildUrl(pagination.page - 1, pagination.limit)
        : null,
  };

  return {
    status: "success",
    page: pagination.page,
    limit: pagination.limit,
    total,
    total_pages: totalPages,
    links,
    data,
  };
};

export const getProfileById = async (id: string) => {
  const profile = await repo.findById(id);

  if (!profile) {
    const err: any = new Error("Profile not found");
    err.statusCode = 404;
    throw err;
  }

  return profile;
};

export const deleteProfile = async (id: string) => {
  const existing = await repo.findById(id);

  if (!existing) {
    const err: any = new Error("Profile not found");
    err.statusCode = 404;
    throw err;
  }

  await repo.remove(id);

  return true;
};

export const exportProfiles = async (
  query: Record<string, any>,
): Promise<string> => {
  const { filters, pagination } = parseQueryParams(query);

  const { data } = await repo.findAllPaginated(filters, pagination);

  const csvHeaders = [
    "id",
    "name",
    "gender",
    "gender_probability",
    "age",
    "age_group",
    "country_id",
    "country_name",
    "country_probability",
    "created_at",
  ];

  const csvRows = data.map((profile) => [
    profile.id,
    profile.name,
    profile.gender,
    profile.gender_probability,
    profile.age,
    profile.age_group,
    profile.country_id,
    profile.country_name,
    profile.country_probability,
    profile.created_at,
  ]);

  const csvContent = [
    csvHeaders.join(","),
    ...csvRows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
};
