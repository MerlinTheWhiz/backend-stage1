import * as repo from "./profile.repository";
import { getGender } from "../../clients/genderize.client";
import { getAge } from "../../clients/agify.client";
import { getNationality } from "../../clients/nationalize.client";
import { getAgeGroup } from "../../utils/ageGroup";
import { generateUUID } from "../../utils/uuid";

import {
  GenderizeResponse,
  AgifyResponse,
  NationalizeResponse,
  Profile,
} from "./profile.types";


export const createProfile = async (name: string): Promise<{
  exists: boolean;
  data: Profile;
}> => {
  const normalized = name.toLowerCase();

  // Check existing
  const existing = await repo.findByName(normalized);
  if (existing) {
    return { exists: true, data: existing };
  }

  // Call APIs
  const [genderData, ageData, nationData]: [
    GenderizeResponse,
    AgifyResponse,
    NationalizeResponse
  ] = await Promise.all([
    getGender(normalized),
    getAge(normalized),
    getNationality(normalized),
  ]);

  // Edge case validation (IMPORTANT: 502 spec)
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

  // Transformations
  const ageGroup = getAgeGroup(ageData.age);

  const topCountry = nationData.country.reduce((prev, curr) =>
    curr.probability > prev.probability ? curr : prev
  );

  // Create object to match type
  const profile: Profile = {
  id: generateUUID(),
  name: normalized,
  gender: genderData.gender,
  gender_probability: genderData.probability,
  sample_size: genderData.count,
  age: ageData.age,
  age_group: ageGroup,
  country_id: topCountry.country_id,
  country_probability: topCountry.probability,
  created_at: new Date().toISOString(),
};

  // Save
  await repo.create(profile);

  return { exists: false, data: profile };
};


export const getProfiles = async (filters: any) => {
  const query: any = {};

  if (filters.gender) {
    query.gender = filters.gender.toLowerCase();
  }

  if (filters.country_id) {
    query.country_id = filters.country_id.toUpperCase();
  }

  if (filters.age_group) {
    query.age_group = filters.age_group.toLowerCase();
  }

  const data = await repo.findAll(query);
  return data;
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