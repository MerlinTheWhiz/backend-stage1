import { ProfileModel } from "./profile.model";
import { Profile } from "./profile.types";

// CREATE
export const create = async (data: Profile): Promise<Profile> => {
  return ProfileModel.create(data);
};

// FIND BY NAME
export const findByName = async (
  name: string
): Promise<Profile | null> => {
  return ProfileModel.findOne({ name }).select("-_id -__v").lean();
};

// FIND BY ID
export const findById = async (
  id: string
): Promise<Profile | null> => {
  return ProfileModel.findOne({ id }).select("-_id -__v").lean();
};

// GET ALL
export const findAll = async (
  filters: Record<string, string>
): Promise<Profile[]> => {
  return ProfileModel.find(filters).select("-_id -__v -gender_probability -sample_size -country_probability -created_at").lean();
};

// DELETE
export const remove = async (
  id: string
): Promise<{ deletedCount?: number }> => {
  return ProfileModel.deleteOne({ id });
};