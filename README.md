# HNG Backend Stage 3 — Insighta Labs+: Secure Access & Multi-Interface Integration

A secure, multi-interface platform for Insighta Labs that provides authenticated access to demographic intelligence data with role-based permissions, GitHub OAuth, and comprehensive API features. Built on top of the Stage 2 query engine.

---

## 🚀 Live API

Base URL: `https://backend-stage1-production-6311.up.railway.app/`

---

## 📦 Tech Stack

- Node.js + Express.js
- TypeScript
- MongoDB + Mongoose
- JWT Authentication
- GitHub OAuth with PKCE
- Express Sessions
- Rate Limiting
- UUID v7
- Zod (validation)
- CORS enabled

---

## 📁 Project Structure

```
src/
├── app.ts                        # Express app setup
├── server.ts                     # Entry point
├── seed.ts                       # Database seeding script
├── config/
│   ├── db.ts                     # MongoDB connection
│   └── env.ts                    # Environment config
├── clients/                      # External API clients
├── middlewares/
│   ├── asyncHandler.ts           # Async error wrapper
│   ├── auth.middleware.ts        # JWT authentication
│   ├── error.middleware.ts       # Global error handler
│   ├── logging.middleware.ts     # Request logging
│   └── validate.middleware.ts    # Request validation
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts    # OAuth endpoints
│   │   ├── auth.routes.ts        # Auth routes
│   │   └── auth.types.ts         # Auth interfaces
│   ├── user/
│   │   ├── user.model.ts         # User schema
│   │   ├── user.service.ts       # User business logic
│   │   └── user.types.ts         # User interfaces
│   └── profile/
│       ├── profile.model.ts      # Mongoose schema + indexes
│       ├── profile.types.ts      # TypeScript interfaces
│       ├── profile.repository.ts # Data access layer
│       ├── profile.service.ts    # Business logic + query validation
│       ├── profile.controller.ts # Request handlers
│       ├── profile.routes.ts     # Route definitions
│       ├── profile.validation.ts # Zod schemas
│       └── nlp.parser.ts          # Natural language query parser
├── routes/
│   └── index.ts                  # Main router
└── utils/
    ├── jwt.ts                    # JWT utilities
    ├── oauth.ts                  # OAuth utilities
    ├── uuid.ts                   # UUID v7 generator
    ├── ageGroup.ts               # Age group classifier
    └── countryNames.ts           # ISO code ↔ country name mapping
```

---

## ⚙️ Setup Instructions

### 1. Clone repository

```bash
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

```
# Database
MONGODB_URI=mongodb://localhost:27017/insighta-labs

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
SESSION_SECRET=your-super-secret-session-key

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback

# Application
NODE_ENV=development
PORT=3000
WEB_URL=http://localhost:3001
WEB_REDIRECT_URL=http://localhost:3001/dashboard
```

### 4. Seed the database

```bash
npm run seed
```

### 5. Run development server

```bash
npm run dev
```

---

## 📡 API Endpoints

### Authentication

#### 1. GitHub OAuth Login

**GET** `/api/auth/github`

Redirects user to GitHub OAuth with PKCE flow.

#### 2. OAuth Callback

**GET** `/api/auth/github/callback`

Handles GitHub OAuth callback, creates/updates user, issues tokens.

#### 3. Refresh Token

**POST** `/api/auth/refresh`

**Request:**

```json
{
  "refresh_token": "string"
}
```

**Response:**

```json
{
  "status": "success",
  "access_token": "string",
  "refresh_token": "string"
}
```

#### 4. Logout

**POST** `/api/auth/logout`

Invalidates refresh token.

### Profiles (Authenticated)

All profile endpoints require:

- `Authorization: Bearer <access_token>` header
- `X-API-Version: 1` header

#### 5. Create Profile (Admin Only)

**POST** `/api/profiles`

**Request:**

```json
{
  "name": "Harriet Tubman"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "harriet tubman",
    "gender": "female",
    "gender_probability": 0.97,
    "age": 28,
    "age_group": "adult",
    "country_id": "US",
    "country_name": "United States",
    "country_probability": 0.89,
    "created_at": "timestamp"
  }
}
```

**GET** `/api/profiles`

Supports filtering, sorting, and pagination in a single request.

**Query Parameters:**

| Parameter                 | Type   | Description                                                 |
| ------------------------- | ------ | ----------------------------------------------------------- |
| `gender`                  | string | Filter by gender: `male` or `female`                        |
| `age_group`               | string | Filter by age group: `child`, `teenager`, `adult`, `senior` |
| `country_id`              | string | Filter by ISO 3166-1 alpha-2 country code                   |
| `min_age`                 | number | Minimum age (inclusive)                                     |
| `max_age`                 | number | Maximum age (inclusive)                                     |
| `min_gender_probability`  | float  | Minimum gender confidence (0–1)                             |
| `min_country_probability` | float  | Minimum country confidence (0–1)                            |
| `sort_by`                 | string | Sort field: `age`, `created_at`, or `gender_probability`    |
| `order`                   | string | Sort order: `asc` or `desc`                                 |
| `page`                    | number | Page number (default: 1)                                    |
| `limit`                   | number | Results per page (default: 10, max: 50)                     |

All filters are combinable. Results must match every condition passed.

**Example:**

```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response (200):**

````json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [
    {
      "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00Z"
    }
  ]
}

#### 6. Get All Profiles (Analyst+)
**GET** `/api/profiles`

Supports filtering, sorting, and pagination with enhanced response format.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `gender` | string | Filter by gender: `male` or `female` |
| `age_group` | string | Filter by age group: `child`, `teenager`, `adult`, `senior` |
| `country_id` | string | Filter by ISO 3166-1 alpha-2 country code |
| `min_age` | number | Minimum age (inclusive) |
| `max_age` | number | Maximum age (inclusive) |
| `min_gender_probability` | float | Minimum gender confidence (0–1) |
| `min_country_probability` | float | Minimum country confidence (0–1) |
| `sort_by` | string | Sort field: `age`, `created_at`, or `gender_probability` |
| `order` | string | Sort order: `asc` or `desc` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10, max: 50) |

**Response (200):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "total_pages": 203,
  "links": {
    "self": "/api/profiles?page=1&limit=10",
    "next": "/api/profiles?page=2&limit=10",
    "prev": null
  },
  "data": [
    {
      "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00Z"
    }
  ]
}

#### 7. Natural Language Search (Analyst+)
**GET** `/api/profiles/search`

Parse plain English queries and convert them into filters.

**Example:**
````

GET /api/profiles/search?q=young males from nigeria

```

#### 8. Get Profile by ID (Analyst+)
**GET** `/api/profiles/:id`

#### 9. Delete Profile (Admin Only)
**DELETE** `/api/profiles/:id`

#### 10. Export Profiles (CSV) (Analyst+)
**GET** `/api/profiles/export?format=csv`

Applies same filters as `/api/profiles` and returns CSV file.

**Response:**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="profiles_<timestamp>.csv"`

**CSV columns:**
```

id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at

````

---

## 🔐 Authentication Flow

### GitHub OAuth with PKCE

The system implements a secure OAuth flow using PKCE (Proof Key for Code Exchange):

1. **Initiate Auth**: `GET /api/auth/github`
   - Generates `state` (request validation)
   - Generates `code_verifier` (PKCE secret)
   - Generates `code_challenge` (derived value)
   - Stores in session
   - Redirects to GitHub OAuth

2. **User Authentication**: User authenticates via GitHub

3. **Callback Handling**: `GET /api/auth/github/callback`
   - Validates `state` parameter
   - Exchanges `code + code_verifier` with GitHub
   - Retrieves user information from GitHub API
   - Creates or updates user in database
   - Issues JWT tokens (access: 3min, refresh: 5min)
   - Returns tokens (JSON for CLI, cookies for web)

4. **Token Refresh**: `POST /api/auth/refresh`
   - Validates refresh token
   - Issues new token pair
   - Invalidates old refresh token

5. **Logout**: `POST /api/auth/logout`
   - Invalidates refresh token
   - Clears cookies

### Role-Based Access Control

- **admin**: Full access (create, delete, read, search)
- **analyst**: Read-only access (read, search, export)

Default role: `analyst`

### Token Management

- **Access Token**: 3 minutes expiry, sent with each API request
- **Refresh Token**: 5 minutes expiry, used to obtain new access tokens
- **Storage**: CLI stores in `~/.insighta/credentials.json`, Web uses HTTP-only cookies

---

## 📊 Rate Limiting

| Scope | Limit |
| ----- | ----- |
| Auth endpoints (`/auth/*`) | 10 requests / minute |
| All other endpoints | 60 requests / minute per user |

Returns `429 Too Many Requests` when exceeded.

---

## 📝 Request Logging

All requests are logged with:
- Method
- Endpoint
- Status code
- Response time
- User agent
- IP address
- Timestamp

---

## 🧠 Natural Language Parsing Approach

### How It Works

1. **Tokenization:** The query string is lowercased and split into individual words
2. **Keyword Extraction:** The parser scans tokens for known keywords in this priority order:
   - Gender keywords
   - Special "young" keyword
   - Age group keywords
   - Age constraint patterns (regex)
   - Country names/codes
3. **Filter Construction:** Each matched keyword maps to one or more filter values
4. **Combined Execution:** The extracted filters are passed through the same query engine as the `/api/profiles` endpoint, ensuring consistent behavior

### Supported Keywords & Mappings

| Query Keyword(s)                                       | Filter Applied                                          |
| ------------------------------------------------------ | ------------------------------------------------------- |
| `male`, `males`, `men`, `man`, `boy`, `boys`           | `gender = male`                                         |
| `female`, `females`, `women`, `woman`, `girl`, `girls` | `gender = female`                                       |
| `young`                                                | `min_age = 16`, `max_age = 24` (NOT a stored age group) |
| `child`, `children`, `kids`, `kid`                     | `age_group = child`                                     |
| `teenager`, `teenagers`, `teen`, `teens`               | `age_group = teenager`                                  |
| `adult`, `adults`                                      | `age_group = adult`                                     |
| `senior`, `seniors`, `elderly`, `old`                  | `age_group = senior`                                    |
| `above/over/older than N`                              | `min_age = N`                                           |
| `below/under/younger than N`                           | `max_age = N`                                           |
| `between N and M`                                      | `min_age = N`, `max_age = M`                            |
| `aged N`                                               | `min_age = N`, `max_age = N`                            |
| `from <country>` / `in <country>`                      | `country_id = <ISO code>`                               |
| `people`, `persons`, `profiles`                        | No filter (returns all)                                 |

### Country Resolution

Country names are resolved to ISO 3166-1 alpha-2 codes using a built-in lookup table. The parser supports:

- Full country names: "nigeria" → NG, "kenya" → KE
- Common aliases: "ivory coast" → CI, "dr congo" → CD, "usa" → US, "uk" → GB
- Direct ISO codes in text

### Example Query Interpretations

| Query                                  | Extracted Filters                                   |
| -------------------------------------- | --------------------------------------------------- |
| `"young males"`                        | `gender=male` + `min_age=16` + `max_age=24`         |
| `"females above 30"`                   | `gender=female` + `min_age=30`                      |
| `"people from angola"`                 | `country_id=AO`                                     |
| `"adult males from kenya"`             | `gender=male` + `age_group=adult` + `country_id=KE` |
| `"male and female teenagers above 17"` | `age_group=teenager` + `min_age=17`                 |
| `"seniors from nigeria"`               | `age_group=senior` + `country_id=NG`                |

### Multi-Gender Handling

When both gender keywords are present (e.g., "male and female teenagers"), the parser detects both and omits the gender filter entirely, returning results for all genders that match the other criteria.

---

## ⚠️ Limitations

The natural language parser is **rule-based** and has the following known limitations:

1. **No fuzzy matching or spell correction:** "Nigria" will not match "Nigeria". All keywords must be spelled correctly.

2. **No number words:** The parser only understands digits. "twenty" will not be interpreted as 20. Only "20" works.

3. **No negation:** "not from Nigeria" or "excluding seniors" are not supported. Negation words are ignored.

4. **No complex boolean logic:** "males or females from Kenya" works (both genders detected = no gender filter), but "males from Nigeria or females from Kenya" (different filters per gender) is not supported.

5. **Limited country name coverage:** While the parser covers 100+ countries including all in the seed data, very obscure country names or newly named countries may not be recognized.

6. **No relative date filtering:** "recently added" or "profiles from last week" are not supported.

7. **English only:** The parser only understands English keywords.

8. **Ambiguous queries:** Short or vague queries like "stuff" or "data" will return an error since no meaningful filter can be extracted.

9. **Country name conflicts:** If a country name is a substring of another word, false matches could occur, though this is mitigated by checking longer country names first.

10. **'young' is not a stored age group:** "young" maps to ages 16–24 for NLP queries but is not a value in the `age_group` database field (which uses: child, teenager, adult, senior).

---

## ⚠️ Error Handling

All errors follow this format:
```json
{
  "status": "error",
  "message": "Error message here"
}
```

### Status Codes

| Code | Meaning |
|---|---|
| 400 | Bad Request — Missing headers, parameters, or API version |
| 401 | Unauthorized — Missing or invalid token |
| 403 | Forbidden — Insufficient permissions or inactive user |
| 404 | Profile not found |
| 422 | Unprocessable Entity — Invalid parameter type |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal server error |
| 502 | External API failure |

### Common Errors

**Missing API Version:**
```json
{
  "status": "error",
  "message": "API version header required"
}
```

**Invalid Token:**
```json
{
  "status": "error",
  "message": "Invalid or expired token"
}
```

**Insufficient Permissions:**
```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

---

## 🔁 Data Seeding

The database is seeded with 2026 profiles from `seed_profiles.json`:

```bash
npm run seed
```

- Re-running the seed **clears existing data** and re-inserts all 2026 profiles
- Each profile gets a unique UUID v7 and a UTC timestamp
- No duplicate records are created

---

## 📌 Technical Notes

- All timestamps are in **UTC ISO 8601** format
- All IDs are **UUID v7** (time-ordered)
- CORS enabled for all origins (`Access-Control-Allow-Origin: *`)
- MongoDB compound indexes on `{gender, country_id, age}` and `{age_group}` prevent full-table scans
- Pagination is cursor-based with skip/limit, max 50 per page

---

## 🧪 Testing Examples

```bash
# 1. Initiate OAuth flow
curl -i "https://backend-stage1-production-6311.up.railway.app/api/auth/github"

# 2. Get profiles with authentication (after getting token)
curl -H "Authorization: Bearer <access_token>" \
     -H "X-API-Version: 1" \
     "https://backend-stage1-production-6311.up.railway.app/api/profiles?page=1&limit=10"

# 3. Filter by gender and country
curl -H "Authorization: Bearer <access_token>" \
     -H "X-API-Version: 1" \
     "https://backend-stage1-production-6311.up.railway.app/api/profiles?gender=male&country_id=NG"

# 4. Natural language search
curl -H "Authorization: Bearer <access_token>" \
     -H "X-API-Version: 1" \
     "https://backend-stage1-production-6311.up.railway.app/api/profiles/search?q=young%20males%20from%20nigeria"

# 5. Create profile (admin only)
curl -X POST \
     -H "Authorization: Bearer <admin_access_token>" \
     -H "X-API-Version: 1" \
     -H "Content-Type: application/json" \
     -d '{"name":"Harriet Tubman"}' \
     "https://backend-stage1-production-6311.up.railway.app/api/profiles"

# 6. Export to CSV
curl -H "Authorization: Bearer <access_token>" \
     -H "X-API-Version: 1" \
     "https://backend-stage1-production-6311.up.railway.app/api/profiles/export?format=csv" \
     -o profiles.csv

# 7. Refresh token
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"refresh_token":"<refresh_token>"}' \
     "https://backend-stage1-production-6311.up.railway.app/api/auth/refresh"

# 8. Logout
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"refresh_token":"<refresh_token>"}' \
     "https://backend-stage1-production-6311.up.railway.app/api/auth/logout"
```

---

## 👨‍💻 Author

Yours truly,
_MerlinTheWhiz_
````
