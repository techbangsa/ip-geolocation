# IP Geolocation REST API

A secure, production-ready IP Geolocation REST API built with Node.js and Express. Returns highly detailed geographic information for any public IP address. Each project/application authenticates with its own API key.

---

## Features

- **Detailed Geolocation Data** — Country, region, city, district, postal code, coordinates, timezone, continent, ISP, ASN, connection type, currency, languages, reverse DNS
- **API Key Authentication** — Each project gets a unique, cryptographically secure API key
- **Dual Provider Failover** — Primary: ip-api.com, Fallback: ipapi.co
- **In-Memory Caching** — NodeCache with 10-minute TTL to minimize external API calls
- **Rate Limiting** — 100 requests per 15 minutes per IP
- **Security Hardened** — Helmet, CORS restrictions, anti-spoofing, private IP blocking, input sanitization, centralized error handling
- **Request Logging** — Morgan with request ID tracing
- **Graceful Shutdown** — Handles SIGTERM/SIGINT cleanly
- **Health Check Endpoint** — Monitor server status and uptime
- **Usage Statistics** — Track request counts per project

---

## Project Structure

```
ip-geolocation-api/
├── server.js                  # Express app entry point
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variable template
├── .gitignore
│
├── routes/
│   ├── location.js            # GET /api/location
│   └── project.js             # POST /api/projects, GET /api/projects, GET /api/projects/stats
│
├── services/
│   ├── geoService.js          # External geolocation provider integration
│   └── apiKeyService.js       # API key generation, validation, storage
│
├── middleware/
│   ├── apiKeyAuth.js          # API key authentication middleware
│   ├── security.js            # Helmet, CORS, rate limiting, anti-spoofing
│   └── errorHandler.js        # 404 and global error handlers
│
├── utils/
│   ├── ipUtils.js             # IP extraction, validation, private range checking
│   └── cache.js               # NodeCache wrapper
│
└── data/
    └── projects.json          # Persistent API key storage
```

---

## Installation

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd ip-geolocation-api

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env as needed (defaults work for local development)

# 4. Start the server
npm start

# For development with auto-reload:
npm run dev
```

---

## Environment Setup

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment (`production` hides error details) |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | Comma-separated CORS allowed origins |
| `TRUST_PROXY` | `false` | Set to `true` if behind a reverse proxy |
| `RATE_LIMIT_MAX` | `100` | Max requests per 15-minute window per IP |
| `ADMIN_API_KEY` | _(empty)_ | Admin key for listing all projects |
| `GEO_API_TIMEOUT` | `5000` | External API timeout (ms) |
| `SERVER_TIMEOUT` | `30000` | Server connection timeout (ms) |

---

## How to Generate API Keys

Every application that uses this API must first create a project to receive an API key.

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Web App"}'
```

**Response:**

```json
{
  "success": true,
  "message": "Project created successfully. Store your API key securely — it cannot be retrieved later.",
  "requestId": "a1b2c3d4-...",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "My Web App",
    "apiKey": "geo_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
    "createdAt": "2026-03-30T12:00:00.000Z"
  }
}
```

> **Important:** Save the API key immediately. It is only shown once and cannot be retrieved later.

---

## How to Use the API

### Geolocation Lookup

Include your API key in the `x-api-key` header:

```bash
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/api/location
```

To look up a specific IP instead of your own:

```bash
curl -H "x-api-key: YOUR_API_KEY" "http://localhost:3000/api/location?ip=8.8.8.8"
```

---

## Example Requests

### curl

```bash
# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project"}'

# Look up your IP's geolocation
curl -H "x-api-key: geo_YOUR_KEY_HERE" http://localhost:3000/api/location

# Look up a specific IP
curl -H "x-api-key: geo_YOUR_KEY_HERE" "http://localhost:3000/api/location?ip=1.1.1.1"

# Check your project usage stats
curl -H "x-api-key: geo_YOUR_KEY_HERE" http://localhost:3000/api/projects/stats

# Health check
curl http://localhost:3000/health
```

### Postman

1. **Create a project:** `POST http://localhost:3000/api/projects` with JSON body `{"name": "Postman Test"}`
2. **Geolocation lookup:** `GET http://localhost:3000/api/location`
   - Add header: `x-api-key: <your-key>`
3. **View stats:** `GET http://localhost:3000/api/projects/stats`
   - Add header: `x-api-key: <your-key>`

### JavaScript fetch

```javascript
// Create a project
const project = await fetch('http://localhost:3000/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My Frontend App' }),
}).then(res => res.json());

console.log('API Key:', project.data.apiKey);

// Look up geolocation
const location = await fetch('http://localhost:3000/api/location', {
  headers: { 'x-api-key': project.data.apiKey },
}).then(res => res.json());

console.log('Location:', location.data);
```

---

## Example Response

```json
{
  "success": true,
  "cached": false,
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project": "My Web App",
  "data": {
    "ip": "8.8.8.8",
    "country": "United States",
    "countryCode": "US",
    "region": "VA",
    "regionName": "Virginia",
    "city": "Ashburn",
    "district": null,
    "zip": "20149",
    "postalCode": "20149",
    "latitude": 39.03,
    "longitude": -77.5,
    "timezone": "America/New_York",
    "utcOffset": -14400,
    "continent": "North America",
    "isp": "Google LLC",
    "organization": "Google Public DNS",
    "asn": "AS15169 Google LLC",
    "asnName": "GOOGLE",
    "reverseDns": "dns.google",
    "connectionType": {
      "isProxy": false,
      "isHosting": true,
      "isMobile": false
    },
    "currency": "USD",
    "languages": null,
    "provider": "ip-api.com"
  }
}
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check, uptime, cache stats |
| `POST` | `/api/projects` | None | Create a project & generate API key |
| `GET` | `/api/projects` | Admin | List all projects (masked keys) |
| `GET` | `/api/projects/stats` | API Key | Get usage stats for your project |
| `GET` | `/api/location` | API Key | Get geolocation for your IP |
| `GET` | `/api/location?ip=x.x.x.x` | API Key | Get geolocation for a specific IP |

---

## Usage Limits

| Limit | Value | Configurable |
|---|---|---|
| **Rate limit** | 100 requests per 15-minute window, per IP | `RATE_LIMIT_MAX` in `.env` |
| **Rate limit window** | 15 minutes (fixed) | hardcoded in `middleware/security.js` |
| **Body size** | 10 KB max per request | hardcoded in `server.js` |
| **External API timeout** | 5,000 ms (default) | `GEO_API_TIMEOUT` in `.env` |
| **Cache TTL** | 10 minutes per IP lookup result | hardcoded in `utils/cache.js` |

### Rate Limit Response Headers

Every API response includes standard rate-limit headers so clients can track their quota:

| Header | Description |
|---|---|
| `RateLimit-Limit` | Maximum requests allowed in the window |
| `RateLimit-Remaining` | Requests remaining in the current window |
| `RateLimit-Reset` | Timestamp (seconds) when the window resets |
| `X-Request-Id` | Unique ID for the request (useful for debugging) |

### When the Rate Limit Is Exceeded

HTTP **429 Too Many Requests** is returned:

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 15 minutes."
}
```

To raise the limit for your environment, set `RATE_LIMIT_MAX` in `.env`:

```env
RATE_LIMIT_MAX=500
```

> **Note:** The rate limit is enforced per client IP address. Clients behind the same NAT share the same quota unless `TRUST_PROXY=true` is set and a reverse proxy forwards a unique `x-forwarded-for` per client.

---

## Security Notes

- **Helmet** sets secure HTTP headers including HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
- **Rate Limiting** prevents abuse: 100 requests per 15-minute window per IP (configurable via `RATE_LIMIT_MAX`).
- **CORS** restricts which origins can call the API. Configure `ALLOWED_ORIGINS` in `.env`.
- **Anti-Spoofing** strips `x-forwarded-for` headers unless `TRUST_PROXY` is enabled. This prevents clients from faking their IP.
- **Private IP Blocking** rejects lookups for RFC 1918 / reserved addresses.
- **Input Sanitization** strips invalid characters from IP addresses.
- **Error Hiding** — In production mode (`NODE_ENV=production`), internal error details are never exposed to clients.
- **API Keys** are generated using `crypto.randomBytes(24)` — 192 bits of cryptographic randomness.
- **Request IDs** are attached to every response for debugging and audit logging.
- **Body Size Limit** — JSON body parsing is limited to 10KB.

---

## Frontend Integration Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Geolocation Demo</title>
</head>
<body>
  <h1>My Location</h1>
  <pre id="result">Loading...</pre>

  <script>
    const API_KEY = 'geo_YOUR_KEY_HERE';
    const API_URL = 'http://localhost:3000/api/location';

    fetch(API_URL, {
      headers: { 'x-api-key': API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
      })
      .catch(err => {
        document.getElementById('result').textContent = 'Error: ' + err.message;
      });
  </script>
</body>
</html>
```

> **Note:** When integrating into a frontend, make sure to add your frontend's origin to `ALLOWED_ORIGINS` in `.env`.

---

## License

MIT
