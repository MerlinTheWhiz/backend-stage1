import axios from "axios";
import { NationalizeResponse } from "../modules/profile/profile.types";

export const getNationality = async (name: string): Promise<NationalizeResponse> => {
  try {
    const res = await axios.get<NationalizeResponse>(
      "https://api.nationalize.io",
      {
        params: { name },
        timeout: 5000,
      }
    );
    return res.data;
  } catch (error: any) {
    const err: any = new Error("Failed to fetch nationality from Nationalize");
    err.statusCode = 502;
    throw err;
  }
};