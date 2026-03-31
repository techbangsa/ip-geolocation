# Step-by-Step Tutorial: IP Geolocation API

This tutorial walks you through setting up, configuring, and using the IP Geolocation API from scratch.

---

## Step 1: Install Dependencies

Make sure you have **Node.js v18+** installed. Then install the project dependencies:

```bash
cd ip-geolocation-api
npm install
```

This installs:
- **express** — Web framework
- **axios** — HTTP client for external geolocation APIs
- **helmet** — Secure HTTP headers
- **cors** — Cross-Origin Resource Sharing
- **express-rate-limit** — Rate limiting middleware
- **morgan** — Request logging
- **node-cache** — In-memory caching with TTL
- **dotenv** — Environment variable loading
- **uuid** — UUID generation

---

## Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and review the settings. The defaults work for local development:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
TRUST_PROXY=false
RATE_LIMIT_MAX=100
GEO_API_TIMEOUT=5000
```

For production, change `NODE_ENV=production` and set `ALLOWED_ORIGINS` to your actual domains.

---

## Step 3: Start the Server

**Production mode:**

```bash
npm start
```

**Development mode (auto-reload on file changes):**

```bash
npm run dev
```

You should see:

```
═══════════════════════════════════════════════════════
  IP Geolocation API Server
  Running on http://0.0.0.0:3000
  Environment: development
  Endpoints:
    Health:    GET  http://localhost:3000/health
    Location:  GET  http://localhost:3000/api/location
    Projects:  POST http://localhost:3000/api/projects
    Stats:     GET  http://localhost:3000/api/projects/stats
═══════════════════════════════════════════════════════
```

Verify the server is running:

```bash
curl http://localhost:3000/health
```

---

## Step 4: Create a Project API Key

Every application that uses the geolocation API must first register as a project. This creates a unique API key.

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Project"}'
```

You'll get a response like:

```json
{
  "success": true,
  "message": "Project created successfully. Store your API key securely — it cannot be retrieved later.",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "My First Project",
    "apiKey": "geo_a1b2c3d4e5f6789012345678901234567890abcdef012345",
    "createdAt": "2026-03-30T12:00:00.000Z"
  }
}
```

**Copy the `apiKey` value** — you'll need it for all subsequent API calls.

---

## Step 5: Call the Geolocation API

Now use your API key to look up geolocation data.

### Look up your own IP:

```bash
curl -H "x-api-key: geo_YOUR_API_KEY_HERE" http://localhost:3000/api/location
```

> **Note:** If running locally, your IP will be `127.0.0.1` (private), which is blocked. Use the `?ip=` query parameter to look up a public IP instead.

### Look up a specific IP:

```bash
curl -H "x-api-key: geo_YOUR_API_KEY_HERE" "http://localhost:3000/api/location?ip=8.8.8.8"
```

### Example response:

```json
{
  "success": true,
  "cached": false,
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project": "My First Project",
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

### Check your usage stats:

```bash
curl -H "x-api-key: geo_YOUR_API_KEY_HERE" http://localhost:3000/api/projects/stats
```

---

## Step 6: Monitor Rate Limits

Every response from `/api/location` includes rate-limit headers you can inspect to track quota consumption before hitting the limit.

### Reading the headers

```bash
curl -I -H "x-api-key: geo_YOUR_API_KEY_HERE" "http://localhost:3000/api/location?ip=8.8.8.8"
```

You'll see headers similar to:

```
HTTP/1.1 200 OK
RateLimit-Limit: 100
RateLimit-Remaining: 97
RateLimit-Reset: 1743421800
X-Request-Id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

| Header | Meaning |
|---|---|
| `RateLimit-Limit` | Total requests allowed per 15-minute window (per IP) |
| `RateLimit-Remaining` | Requests you still have left in the current window |
| `RateLimit-Reset` | Unix timestamp (seconds) when the window resets |
| `X-Request-Id` | Unique request ID — useful for debugging and support |

### What happens when you hit the limit

HTTP **429 Too Many Requests** is returned:

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 15 minutes."
}
```

### Raising the limit

Set `RATE_LIMIT_MAX` in `.env` before starting the server:

```env
RATE_LIMIT_MAX=500
```

> **Note:** The rate limit is enforced per **client IP address**. All clients behind the same NAT share the same quota. If you're deploying behind a reverse proxy (nginx, Cloudflare, etc.), set `TRUST_PROXY=true` so the real client IP is used, not the proxy IP.

---

## Step 7: Integrate into a Frontend Application

### Option A: Vanilla JavaScript

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Geolocation Demo</title>
</head>
<body>
  <h1>IP Geolocation</h1>
  <button id="lookup">Look Up My Location</button>
  <pre id="result"></pre>

  <script>
    const API_KEY = 'geo_YOUR_API_KEY_HERE';
    const API_BASE = 'http://localhost:3000';

    document.getElementById('lookup').addEventListener('click', async () => {
      const resultEl = document.getElementById('result');
      resultEl.textContent = 'Loading...';

      try {
        const response = await fetch(`${API_BASE}/api/location`, {
          headers: { 'x-api-key': API_KEY }
        });
        const data = await response.json();
        resultEl.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        resultEl.textContent = 'Error: ' + error.message;
      }
    });
  </script>
</body>
</html>
```

### Option B: React / Next.js

```javascript
import { useEffect, useState } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_GEO_API_KEY;

export default function LocationWidget() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/location', {
      headers: { 'x-api-key': API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setLocation(data.data);
        else setError(data.message);
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) return <p>Error: {error}</p>;
  if (!location) return <p>Loading location...</p>;

  return (
    <div>
      <h2>{location.city}, {location.regionName}</h2>
      <p>{location.country} ({location.countryCode})</p>
      <p>ISP: {location.isp}</p>
      <p>Coordinates: {location.latitude}, {location.longitude}</p>
      <p>Timezone: {location.timezone}</p>
    </div>
  );
}
```

### Option C: Node.js Backend-to-Backend

```javascript
const axios = require('axios');

async function getLocation(ip) {
  const response = await axios.get('http://localhost:3000/api/location', {
    headers: { 'x-api-key': 'geo_YOUR_API_KEY_HERE' },
    params: { ip },
  });
  return response.data;
}

// Usage
getLocation('8.8.8.8').then(console.log).catch(console.error);
```

---

## Common Issues

### "Cannot geolocate private or reserved IP addresses"

This happens when running locally because your IP is `127.0.0.1`. Use the `?ip=` parameter:

```bash
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/location?ip=8.8.8.8"
```

### "Missing API key"

Include the `x-api-key` header in every request to `/api/location`:

```bash
curl -H "x-api-key: geo_abc123..." http://localhost:3000/api/location
```

### "Rate limit exceeded"

HTTP 429 is returned when you've sent more than `RATE_LIMIT_MAX` requests (default: **100**) within a 15-minute window from the same IP.

**Options:**
- Wait until the window resets (check the `RateLimit-Reset` header for the exact timestamp).
- Increase the limit: set `RATE_LIMIT_MAX=500` in `.env` and restart the server.
- Cache results in your own app to reduce the number of calls you make.

### CORS errors in browser

Add your frontend's origin to `ALLOWED_ORIGINS` in `.env`:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://myapp.com
```

---

## Summary

| Step | Action |
|---|---|
| 1 | `npm install` — Install dependencies |
| 2 | `cp .env.example .env` — Configure environment |
| 3 | `npm start` — Start the server |
| 4 | `POST /api/projects` — Create a project and get an API key |
| 5 | `GET /api/location` with `x-api-key` header — Get geolocation data |
| 6 | Monitor rate-limit headers (`RateLimit-Remaining`, `RateLimit-Reset`) |
| 7 | Integrate into your app using fetch, axios, or any HTTP client |
