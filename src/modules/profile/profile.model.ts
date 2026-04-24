import mongoose, { Schema } from "mongoose";
import { Profile } from "./profile.types";

const ProfileSchema = new Schema<Profile>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },

    gender: { type: String, required: true },
    gender_probability: { type: Number, required: true },

    age: { type: Number, required: true },
    age_group: { type: String, required: true },

    country_id: { type: String, required: true },
    country_name: { type: String, required: true },
    country_probability: { type: Number, required: true },

    created_at: { type: String, required: true },
  },
  {
    versionKey: false,
  }
);

// Compound index for common filter combinations
ProfileSchema.index({ gender: 1, country_id: 1, age: 1 });
// Index for age_group filtering
ProfileSchema.index({ age_group: 1 });
// Index for sorting fields
ProfileSchema.index({ created_at: 1 });
ProfileSchema.index({ gender_probability: 1 });

export const ProfileModel = mongoose.model<Profile>(
  "Profile",
  ProfileSchema
);