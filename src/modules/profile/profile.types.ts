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
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at: string;
}

export interface ProfileFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: "age" | "created_at" | "gender_probability";
  order?: "asc" | "desc";
}

export interface PaginatedResponse {
  status: string;
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
  data: Profile[];
}
