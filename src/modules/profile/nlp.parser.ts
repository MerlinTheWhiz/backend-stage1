import { ProfileFilters } from "./profile.types";

/**
 * Country name → ISO 3166-1 alpha-2 code mapping
 * Covers all countries present in the seed data plus common aliases
 */
const COUNTRY_MAP: Record<string, string> = {
  // Africa
  nigeria: "NG",
  kenya: "KE",
  ghana: "GH",
  "south africa": "ZA",
  angola: "AO",
  tanzania: "TZ",
  uganda: "UG",
  ethiopia: "ET",
  sudan: "SD",
  cameroon: "CM",
  madagascar: "MG",
  mozambique: "MZ",
  zambia: "ZM",
  zimbabwe: "ZW",
  namibia: "NA",
  mali: "ML",
  senegal: "SN",
  "dr congo": "CD",
  "democratic republic of the congo": "CD",
  congo: "CG",
  "republic of the congo": "CG",
  rwanda: "RW",
  somalia: "SO",
  eritrea: "ER",
  gabon: "GA",
  benin: "BJ",
  gambia: "GM",
  "cape verde": "CV",
  malawi: "MW",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  egypt: "EG",
  morocco: "MA",
  tunisia: "TN",
  algeria: "DZ",
  libya: "LY",
  "western sahara": "EH",
  "burkina faso": "BF",
  niger: "NE",
  chad: "TD",
  guinea: "GN",
  "sierra leone": "SL",
  liberia: "LR",
  togo: "TG",
  mauritania: "MR",
  "equatorial guinea": "GQ",
  burundi: "BI",
  djibouti: "DJ",
  "south sudan": "SS",
  lesotho: "LS",
  eswatini: "SZ",
  swaziland: "SZ",
  botswana: "BW",
  mauritius: "MU",
  comoros: "KM",
  "sao tome": "ST",
  seychelles: "SC",

  // Non-Africa (also in seed data)
  "united states": "US",
  usa: "US",
  america: "US",
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  france: "FR",
  india: "IN",
  brazil: "BR",
  australia: "AU",
  canada: "CA",
  germany: "DE",
  china: "CN",
  japan: "JP",
  mexico: "MX",
  spain: "ES",
  italy: "IT",
  russia: "RU",
  colombia: "CO",
  argentina: "AR",
  peru: "PE",
  chile: "CL",
  poland: "PL",
  portugal: "PT",
  netherlands: "NL",
  turkey: "TR",
  "saudi arabia": "SA",
  pakistan: "PK",
  bangladesh: "BD",
  indonesia: "ID",
  philippines: "PH",
  vietnam: "VN",
  thailand: "TH",
  "south korea": "KR",
  korea: "KR",
  malaysia: "MY",
  singapore: "SG",
  "new zealand": "NZ",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  ireland: "IE",
  switzerland: "CH",
  austria: "AT",
  belgium: "BE",
  greece: "GR",
  "czech republic": "CZ",
  romania: "RO",
  hungary: "HU",
  ukraine: "UA",
  israel: "IL",
  "united arab emirates": "AE",
  uae: "AE",
  qatar: "QA",
  kuwait: "KW",
  iraq: "IQ",
  iran: "IR",
  jordan: "JO",
  lebanon: "LB",
  syria: "SY",
  yemen: "YE",
  oman: "OM",
  bahrain: "BH",
};

/**
 * Gender keyword mappings
 */
const MALE_KEYWORDS = ["male", "males", "men", "man", "boys", "boy"];
const FEMALE_KEYWORDS = ["female", "females", "women", "woman", "girls", "girl"];

/**
 * Age group keyword mappings
 */
const AGE_GROUP_MAP: Record<string, string> = {
  child: "child",
  children: "child",
  kids: "child",
  kid: "child",
  teenager: "teenager",
  teenagers: "teenager",
  teen: "teenager",
  teens: "teenager",
  adult: "adult",
  adults: "adult",
  senior: "senior",
  seniors: "senior",
  elderly: "senior",
  old: "senior",
};

/**
 * Parse a natural language query into profile filters.
 * Returns null if the query cannot be interpreted into any meaningful filter.
 */
export const parseNaturalLanguageQuery = (
  query: string
): ProfileFilters | null => {
  const text = query.toLowerCase().trim();
  const filters: ProfileFilters = {};
  let matched = false;

  const words = text.split(/\s+/);
  for (const word of words) {
    if (MALE_KEYWORDS.includes(word)) {
      filters.gender = "male";
      matched = true;
      break;
    }
    if (FEMALE_KEYWORDS.includes(word)) {
      filters.gender = "female";
      matched = true;
      break;
    }
  }

  // Also check "male and female" pattern — if both genders mentioned, don't filter by gender
  const hasMale = words.some((w) => MALE_KEYWORDS.includes(w));
  const hasFemale = words.some((w) => FEMALE_KEYWORDS.includes(w));
  if (hasMale && hasFemale) {
    delete filters.gender;
    matched = true; // still a valid query
  }

  if (words.includes("young")) {
    filters.min_age = 16;
    filters.max_age = 24;
    matched = true;
  }

  for (const word of words) {
    if (AGE_GROUP_MAP[word]) {
      filters.age_group = AGE_GROUP_MAP[word];
      matched = true;
      break;
    }
  }

  // "above/over/older than N", "more than N"
  const aboveMatch = text.match(
    /(?:above|over|older\s+than|more\s+than|at\s+least)\s+(\d+)/
  );
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1], 10);
    matched = true;
  }

  // "below/under/younger than N", "less than N"
  const belowMatch = text.match(
    /(?:below|under|younger\s+than|less\s+than)\s+(\d+)/
  );
  if (belowMatch) {
    filters.max_age = parseInt(belowMatch[1], 10);
    matched = true;
  }

  // "between N and M"
  const betweenMatch = text.match(/between\s+(\d+)\s+and\s+(\d+)/);
  if (betweenMatch) {
    filters.min_age = parseInt(betweenMatch[1], 10);
    filters.max_age = parseInt(betweenMatch[2], 10);
    matched = true;
  }

  // "aged N"
  const agedMatch = text.match(/aged?\s+(\d+)/);
  if (agedMatch && !aboveMatch && !belowMatch && !betweenMatch) {
    const age = parseInt(agedMatch[1], 10);
    filters.min_age = age;
    filters.max_age = age;
    matched = true;
  }

  // Try "from <country>" or "in <country>"
  const countryMatch = text.match(/(?:from|in)\s+(.+?)(?:\s+(?:above|below|over|under|older|younger|between|aged|who|that|with)|$)/);
  if (countryMatch) {
    const countryText = countryMatch[1].trim();
    // Try the full text first, then progressively shorter matches
    const countryCode = resolveCountry(countryText);
    if (countryCode) {
      filters.country_id = countryCode;
      matched = true;
    }
  }

  // Also try matching country names directly in the query (without "from"/"in")
  if (!filters.country_id) {
    const countryCode = findCountryInText(text);
    if (countryCode) {
      filters.country_id = countryCode;
      matched = true;
    }
  }

  const genericWords = ["people", "persons", "profiles", "everyone", "all", "everybody"];
  if (!matched) {
    for (const word of words) {
      if (genericWords.includes(word)) {
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    return null;
  }

  return filters;
};

/**
 * Resolve a country name string to its ISO code
 */
const resolveCountry = (text: string): string | null => {
  const cleaned = text.toLowerCase().trim();

  // Direct lookup
  if (COUNTRY_MAP[cleaned]) {
    return COUNTRY_MAP[cleaned];
  }

  // Check if it's already a 2-letter ISO code
  if (/^[a-z]{2}$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  return null;
};

/**
 * Scan the entire text for country names (for queries without "from"/"in")
 */
const findCountryInText = (text: string): string | null => {
  // Sort by length descending to match longer names first (e.g., "south africa" before "africa")
  const sortedCountries = Object.keys(COUNTRY_MAP).sort(
    (a, b) => b.length - a.length
  );

  for (const country of sortedCountries) {
    if (text.includes(country)) {
      return COUNTRY_MAP[country];
    }
  }

  return null;
};
