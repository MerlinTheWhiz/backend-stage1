export interface CreateProfileInput {
  name: string;
}

export interface GenderizeResponse {
  gender: string | null;
  probability: number;
  count: number;
}

export interface AgifyResponse {
  age: number | null;
  count: number;
}

export interface NationalizeResponse {
  country: {
    country_id: string;
    probability: number;
  }[];
}

export interface Profile {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  sample_size: number;
  age: number;
  age_group: string;
  country_id: string;
  country_probability: number;
  created_at: string;
}