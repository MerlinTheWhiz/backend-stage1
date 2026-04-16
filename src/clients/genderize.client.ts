import axios from "axios";
import { GenderizeResponse } from "../modules/profile/profile.types";

export const getGender = async (name: string): Promise<GenderizeResponse> => {
  try {
    const res = await axios.get<GenderizeResponse>(
      "https://api.genderize.io",
      {
        params: { name },
        timeout: 5000,
      }
    );
    return res.data;
  } catch (error: any) {
    const err: any = new Error("Failed to fetch gender from Genderize");
    err.statusCode = 502;
    throw err;
  }
};