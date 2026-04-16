import axios from "axios";
import { AgifyResponse } from "../modules/profile/profile.types";

export const getAge = async (name: string): Promise<AgifyResponse> => {
  try {
    const res = await axios.get<AgifyResponse>(
      "https://api.agify.io",
      {
        params: { name },
        timeout: 5000,
      }
    );
    return res.data;
  } catch (error: any) {
    const err: any = new Error("Failed to fetch age from Agify");
    err.statusCode = 502;
    throw err;
  }
};