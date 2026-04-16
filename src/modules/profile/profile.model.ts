import mongoose, { Schema } from "mongoose";
import { Profile } from "./profile.types";

const ProfileSchema = new Schema<Profile>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },

  gender: { type: String, required: true },
  gender_probability: { type: Number, required: true },
  sample_size: { type: Number, required: true },

  age: { type: Number, required: true },
  age_group: { type: String, required: true },

  country_id: { type: String, required: true },
  country_probability: { type: Number, required: true },

  created_at: { type: String, required: true },
});

export const ProfileModel = mongoose.model<Profile>(
  "Profile",
  ProfileSchema
);