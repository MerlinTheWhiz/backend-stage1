import readline from "node:readline";
import { Readable } from "node:stream";
import * as repo from "./profile.repository";
import { getAgeGroup } from "../../utils/ageGroup";
import { getCountryName } from "../../utils/countryNames";
import { generateUUID } from "../../utils/uuid";
import { normalizeProfileName } from "./profile.normalization";
import { invalidateProfileCaches } from "./profile.service";
import { CsvUploadSummary, Profile } from "./profile.types";

const CSV_BATCH_SIZE = 1000;
const REQUIRED_HEADERS = ["name", "gender", "age", "country_id"];
const ALLOWED_GENDERS = new Set(["male", "female"]);

interface ParsedCsvContext {
  headerMap: Map<string, number>;
  headerLength: number;
}

interface BatchCandidate {
  normalizedName: string;
  profile: Profile;
}

const incrementReason = (
  reasons: Record<string, number>,
  reason: string,
  amount = 1,
) => {
  reasons[reason] = (reasons[reason] || 0) + amount;
};

const parseCsvLine = (line: string): string[] | null => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    return null;
  }

  values.push(current.trim());
  return values;
};

const createCsvContext = (headerLine: string): ParsedCsvContext => {
  const headers = parseCsvLine(headerLine);

  if (!headers) {
    const error: any = new Error("Malformed CSV header");
    error.statusCode = 400;
    throw error;
  }

  const normalizedHeaders = headers.map((header) =>
    header.trim().toLowerCase(),
  );
  const headerMap = new Map<string, number>();

  normalizedHeaders.forEach((header, index) => {
    headerMap.set(header, index);
  });

  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!headerMap.has(requiredHeader)) {
      const error: any = new Error(
        `Missing required CSV header: ${requiredHeader}`,
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    headerMap,
    headerLength: normalizedHeaders.length,
  };
};

const getValue = (
  values: string[],
  context: ParsedCsvContext,
  key: string,
): string => {
  const index = context.headerMap.get(key);
  if (index === undefined) {
    return "";
  }

  return values[index]?.trim() || "";
};

const parseNumber = (value: string): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildProfileFromRow = (
  values: string[],
  context: ParsedCsvContext,
  reasons: Record<string, number>,
): BatchCandidate | null => {
  if (values.length !== context.headerLength) {
    incrementReason(reasons, "malformed_row");
    return null;
  }

  const name = getValue(values, context, "name");
  const gender = getValue(values, context, "gender").toLowerCase();
  const ageValue = getValue(values, context, "age");
  const countryId = getValue(values, context, "country_id").toUpperCase();

  if (!name || !gender || !ageValue || !countryId) {
    incrementReason(reasons, "missing_fields");
    return null;
  }

  if (!ALLOWED_GENDERS.has(gender)) {
    incrementReason(reasons, "invalid_gender");
    return null;
  }

  const age = parseNumber(ageValue);
  if (age === null || age < 0) {
    incrementReason(reasons, "invalid_age");
    return null;
  }

  const genderProbability = parseNumber(
    getValue(values, context, "gender_probability"),
  );
  const countryProbability = parseNumber(
    getValue(values, context, "country_probability"),
  );

  const countryName = getValue(values, context, "country_name") || getCountryName(countryId);
  const ageGroup = getValue(values, context, "age_group") || getAgeGroup(age);
  const id = getValue(values, context, "id") || generateUUID();
  const createdAt =
    getValue(values, context, "created_at") || new Date().toISOString();
  const normalizedName = normalizeProfileName(name);

  return {
    normalizedName,
    profile: {
      id,
      name: name.trim().replace(/\s+/g, " "),
      gender,
      gender_probability: genderProbability ?? 0,
      age,
      age_group: ageGroup,
      country_id: countryId,
      country_name: countryName,
      country_probability: countryProbability ?? 0,
      created_at: createdAt,
    },
  };
};

const flushBatch = async (
  candidates: BatchCandidate[],
  summary: CsvUploadSummary,
) => {
  if (!candidates.length) {
    return;
  }

  const uniqueCandidates = new Map<string, Profile>();

  for (const candidate of candidates) {
    if (uniqueCandidates.has(candidate.normalizedName)) {
      summary.skipped += 1;
      incrementReason(summary.reasons, "duplicate_name");
      continue;
    }

    uniqueCandidates.set(candidate.normalizedName, candidate.profile);
  }

  const normalizedNames = [...uniqueCandidates.keys()];
  const existingNames = await repo.findExistingNormalizedNames(normalizedNames);
  const newProfiles: Profile[] = [];

  for (const [normalizedName, profile] of uniqueCandidates.entries()) {
    if (existingNames.has(normalizedName)) {
      summary.skipped += 1;
      incrementReason(summary.reasons, "duplicate_name");
      continue;
    }

    newProfiles.push(profile);
  }

  const result = await repo.bulkInsertProfiles(newProfiles);

  summary.inserted += result.inserted;

  if (result.duplicateConflicts > 0) {
    summary.skipped += result.duplicateConflicts;
    incrementReason(summary.reasons, "duplicate_name", result.duplicateConflicts);
  }

  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
};

export const ingestProfilesCsv = async (
  input: Readable,
): Promise<CsvUploadSummary> => {
  const summary: CsvUploadSummary = {
    status: "success",
    total_rows: 0,
    inserted: 0,
    skipped: 0,
    reasons: {},
  };

  const reader = readline.createInterface({
    input,
    crlfDelay: Infinity,
  });

  let context: ParsedCsvContext | null = null;
  let batch: BatchCandidate[] = [];

  try {
    for await (const line of reader) {
      if (!context) {
        context = createCsvContext(line);
        continue;
      }

      if (line.trim() === "") {
        continue;
      }

      summary.total_rows += 1;

      if (line.includes("\uFFFD")) {
        summary.skipped += 1;
        incrementReason(summary.reasons, "broken_encoding");
        continue;
      }

      const values = parseCsvLine(line);
      if (!values) {
        summary.skipped += 1;
        incrementReason(summary.reasons, "malformed_row");
        continue;
      }

      const candidate = buildProfileFromRow(values, context, summary.reasons);

      if (!candidate) {
        summary.skipped += 1;
        continue;
      }

      batch.push(candidate);

      if (batch.length >= CSV_BATCH_SIZE) {
        await flushBatch(batch, summary);
        batch = [];
      }
    }

    await flushBatch(batch, summary);
  } catch (error: any) {
    if (error?.statusCode === 400) {
      throw error;
    }

    incrementReason(summary.reasons, "processing_error");
    summary.skipped += batch.length;
  } finally {
    reader.close();
  }

  if (summary.inserted > 0) {
    invalidateProfileCaches();
  }

  return summary;
};
