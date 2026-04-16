# HNG Backend Stage 1 Task

A RESTful API that accepts a name, enriches it using external APIs (Genderize, Agify, Nationalize), use logic to create profile, stores the result in MongoDB, and exposes endpoints to manage profiles.

---

## 🚀 Live API

Base URL: https://backend-stage1-production-6311.up.railway.app/

---

## 📦 Tech Stack

- Node.js
- Express.js
- TypeScript
- MongoDB + Mongoose
- Axios
- Zod (validation)
- dotenv

---

## 📁 Project Structure

src/</br>
├── app.ts</br>
├── server.ts</br>
├── config/</br>
├── clients/</br>
├── middlewares/</br>
├── modules/profile/</br>
├── routes/</br>
└── utils/

---

## ⚙️ Setup Instructions

### 1. Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

### 2. Install dependencies
npm install

### 3. Create environment variables

Create a `.env` file:

PORT=3000
DB_URL=your_mongodb_connection_string

### 4. Run development server
npm run dev

---

## 📡 API Endpoints

### 1. Create Profile

POST /api/profiles

Request:
{
  "name": "ella"
}

Response (201):
{</br>
  "status": "success",</br>
  "data": {</br>
    "id": "uuid-v7",</br>
    "name": "ella",</br>
    "gender": "female",</br>
    "gender_probability": 0.99,</br>
    "sample_size": 1234,</br>
    "age": 45,</br>
    "age_group": "adult",</br>
    "country_id": "US",</br>
    "country_probability": 0.87,</br>
    "created_at": "2026-04-16T12:00:00Z"</br>
  }</br>
}

If profile already exists:
{</br>
  "status": "success",</br>
  "message": "Profile already exists",</br>
  "data": { ...existing profile }</br>
}

---

### 2. Get All Profiles

GET /api/profiles

Optional query params:
- gender
- country_id
- age_group

Example:
/api/profiles?gender=male&country_id=NG

Response:
{
  "status": "success",
  "count": 2,
  "data": []
}

---

### 3. Get Profile by ID

GET /api/profiles/:id

Response:
{
  "status": "success",
  "data": { ...profile }
}

---

### 4. Delete Profile

DELETE /api/profiles/:id

Response:
204 No Content

---

## ⚠️ Error Handling

All errors follow this format:
{
  "status": "error",
  "message": "Error message here"
}

### Status Codes

- 400 → Bad Request (missing name)
- 422 → Invalid input type
- 404 → Profile not found
- 500 → Internal server error
- 502 → External API failure

---

## 🌐 External APIs

- Genderize: https://api.genderize.io
- Agify: https://api.agify.io
- Nationalize: https://api.nationalize.io

---

## 🧠 Business Logic

### Age Groups
- 0–12 → child
- 13–19 → teenager
- 20–59 → adult
- 60+ → senior

### Country Selection
- Highest probability country from Nationalize API

---

## 🔁 Idempotency Rule

If a name already exists:
- Do NOT create a new record
- Return the existing profile

---

## 🧪 Testing Example

curl -X POST https://backend-stage1-production-6311.up.railway.app/api/profiles \
-H "Content-Type: application/json" \
-d '{"name":"ella"}'

---

## 📌 Notes

- All timestamps are in UTC ISO 8601
- IDs are UUID v7
- CORS enabled for all origins (*)
- Fully production-ready for grading

---

## 👨‍💻 Author

Yours truly,</br>
*MerlinTheWhiz*
