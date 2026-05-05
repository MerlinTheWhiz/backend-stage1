# Stage 4B Solution

## Overview

This document captures the implementation approach for Stage 4B:

- Query performance and database efficiency
- Query normalization and cache efficiency
- Large-scale CSV data ingestion

Stage 3 behavior is preserved while these changes are introduced.

## 1. Query Performance

### Current bottlenecks

- Duplicate checks were using case-insensitive regex scans on `name`, which do not scale well as the dataset grows.
- Paginated reads were doing repeated query shaping work and depended on multiple DB operations for the same request path.
- Equivalent read queries could miss cache reuse because defaults and field ordering were not canonicalized.
- The database is remote, so every extra round-trip is amplified by network latency.

### Optimizations applied

- Added a normalized profile name field (`normalized_name`) and indexed it for fast idempotency checks and bulk-ingestion duplicate detection.
- Tightened profile indexes around common read patterns:
  - `id`
  - `normalized_name`
  - filter/sort combinations involving `gender`, `country_id`, `age`, `age_group`, and `created_at`
- Refactored query building into reusable normalization-aware helpers.
- Changed paginated list reads to use a single aggregation pipeline with `$facet` so data and total count come back in one DB round-trip.
- Added a bounded in-memory LRU cache for:
  - `GET /api/profiles`
  - `GET /api/profiles/search`
  - `GET /api/profiles/:id`
- Added explicit cache invalidation on create, delete, and CSV ingestion writes.
- Tuned Mongo connection settings for a remote database:
  - `maxPoolSize`
  - `minPoolSize`
  - `maxIdleTimeMS`
  - `waitQueueTimeoutMS`

### Trade-offs

- The cache is process-local, which keeps the solution simple and fast under the “no extra infrastructure” constraint, but it is not shared across instances.
- `normalized_name` introduces one extra stored field, but it replaces expensive regex duplicate checks with indexed equality lookups.
- The aggregation-based pagination path is a little more complex than separate `find + count`, but it reduces network overhead for a remote DB.

### Before/After Measurements

| Scenario | Before | After | Notes |
| --- | --- | --- | --- |
| Equivalent list query, first request | ~84.08 ms | n/a | Uncached local benchmark harness with simulated repository latency |
| Equivalent list query, cached normalized repeat | n/a | ~0.19 ms | Same query intent, different input shape, same cache key |
| `GET /api/profiles/:id`, first request | ~63.24 ms | n/a | Uncached local benchmark harness with simulated repository latency |
| `GET /api/profiles/:id`, cached repeat | n/a | ~0.08 ms | Cached ID lookup |

Benchmark command:

```bash
npm run benchmark:profiles
```

Note: these numbers come from the repository benchmark harness, which simulates remote-read cost deterministically to compare uncached versus cached/normalized behavior. Real deployed numbers will vary with dataset size and network conditions.

## 2. Query Normalization

### Canonicalization strategy

- Normalize the parsed filter object after validation and before cache lookup/query execution.
- Canonicalize:
  - gender to lowercase
  - country code to uppercase
  - age-group to lowercase
  - explicit default pagination/sort values
  - object field ordering through a stable serializer
- Build cache keys from the canonicalized filter + pagination structure, not from raw user input.

### Why this is deterministic

- Only already-parsed structured filters are normalized.
- No AI or probabilistic inference is used.
- Two requests only share a cache key when their normalized filter objects are exactly the same.

### Trade-offs

- The normalizer is intentionally conservative. It does not try to “improve” NLP interpretation, only to canonicalize equivalent parsed intent.
- This keeps cache safety high, even if it means some linguistically similar but differently parsed inputs will not collapse together.

## 3. CSV Data Ingestion

### Upload flow

- Added an admin-only upload endpoint in the profile module:
  - `POST /api/profiles/upload`
- The endpoint expects `Content-Type: text/csv`.
- CSV input is processed as a stream using `readline`, so the entire file is never loaded into memory.
- Rows are accumulated into bounded batches (`1000` rows), validated, checked for duplicates using normalized names, and inserted in bulk.
- Bulk inserts use unordered behavior so one bad row does not poison the whole batch.
- Existing reads are not blocked; uploads yield back to the event loop between batch flushes.

### Failure handling

- Row-level failures are skipped and counted.
- Already-inserted rows remain committed even if later rows fail.
- Duplicate handling covers:
  - duplicates already in the database
  - duplicates repeated inside the same upload
  - duplicate-key conflicts caused during insert
- Bad CSV headers fail fast with `400` because the file cannot be interpreted safely.
- Mid-stream processing errors do not roll back already inserted batches.

### Edge cases

- Missing required fields
- Invalid gender
- Negative or invalid age
- Malformed CSV rows
- Broken encoding marker detection (`U+FFFD`)
- Duplicate names under the same idempotency rule as `POST /api/profiles`
- Derived defaults when optional CSV fields are omitted:
  - `id`
  - `created_at`
  - `age_group`
  - `country_name`
  - probability fields default to `0`

## 4. Validation and Testing

### Automated tests

- Stage 3 auth/CSRF route tests remain in place.
- Added optimization tests for:
  - normalized name canonicalization
  - canonical cache key equivalence
  - cache hits for equivalent list queries
  - cache invalidation after writes
- Added CSV ingestion tests for:
  - mixed valid/invalid row processing
  - duplicate counting
  - malformed-row handling
  - missing-header rejection

### Performance verification

- Full test suite:

```bash
npm test
```

- Benchmark harness:

```bash
npm run benchmark:profiles
```
