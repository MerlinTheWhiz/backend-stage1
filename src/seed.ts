import { connectDB } from "./config/db";
import { generateUUID } from "./utils/uuid";
import { ProfileModel } from "./modules/profile/profile.model";
import * as fs from "fs";
import * as path from "path";

interface SeedProfile {
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
}

const seed = async () => {
  try {
    await connectDB();
    console.log("Connected to database for seeding...");

    const filePath = path.join(__dirname, "..", "seed_profiles.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const { profiles } = JSON.parse(rawData) as { profiles: SeedProfile[] };

    console.log(`Found ${profiles.length} profiles to seed.`);

    console.log("Clearing existing profiles...");
    await ProfileModel.deleteMany({});
    console.log("Cleared.");

    const now = new Date();
    const preparedProfiles = profiles.map((p, index) => ({
      id: generateUUID(),
      name: p.name,
      gender: p.gender,
      gender_probability: p.gender_probability,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
      country_name: p.country_name,
      country_probability: p.country_probability,
      // Stagger timestamps slightly so sorting by created_at is meaningful
      created_at: new Date(now.getTime() + index).toISOString(),
    }));

    const BATCH_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < preparedProfiles.length; i += BATCH_SIZE) {
      const batch = preparedProfiles.slice(i, i + BATCH_SIZE);
      await ProfileModel.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${preparedProfiles.length} profiles`);
    }

    console.log(`\n✅ Seeding complete! ${inserted} profiles inserted.`);

    const count = await ProfileModel.countDocuments();
    console.log(`Total profiles in database: ${count}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seed();
