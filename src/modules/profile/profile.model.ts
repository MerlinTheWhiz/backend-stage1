import mongoose, { Schema } from "mongoose";
import { StoredProfile } from "./profile.types";

const ProfileSchema = new Schema<StoredProfile>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    normalized_name: { type: String, required: true, unique: true },

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

ProfileSchema.index({ normalized_name: 1 }, { unique: true });
ProfileSchema.index({ gender: 1, country_id: 1, age: 1, created_at: -1 });
ProfileSchema.index({ gender: 1, age_group: 1, created_at: -1 });
ProfileSchema.index({ country_id: 1, age: 1, created_at: -1 });
ProfileSchema.index({ created_at: -1 });
ProfileSchema.index({ age: 1 });
ProfileSchema.index({ gender_probability: -1 });
ProfileSchema.index({ country_probability: -1 });

export const ProfileModel = mongoose.model<StoredProfile>(
  "Profile",
  ProfileSchema,
);
