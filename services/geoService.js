/**
 * Geolocation Service
 * Fetches detailed geolocation data from external providers.
 * Supports ip-api.com as primary and ipapi.co as fallback.
 */

const axios = require('axios');

// Request timeout for external API calls (in milliseconds)
const REQUEST_TIMEOUT = parseInt(process.env.GEO_API_TIMEOUT, 10) || 5000;

/**
 * Fetch geolocation data from ip-api.com (primary provider).
 * Free tier: 45 requests/minute, no API key required.
 * @param {string} ip - The IP address to look up
 * @returns {object} Normalized geolocation data
 */
async function fetchFromIpApi(ip) {
  const fields = [
    'status', 'message', 'continent', 'country', 'countryCode',
    'region', 'regionName', 'city', 'district', 'zip', 'lat', 'lon',
    'timezone', 'offset', 'currency', 'isp', 'org', 'as', 'asname',
    'reverse', 'mobile', 'proxy', 'hosting', 'query',
  ].join(',');

  const response = await axios.get(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
    { timeout: REQUEST_TIMEOUT }
  );

  if (response.data.status === 'fail') {
    throw new Error(response.data.message || 'ip-api.com lookup failed');
  }

  const d = response.data;

  return {
    ip: d.query,
    country: d.country,
    countryCode: d.countryCode,
    region: d.region,
    regionName: d.regionName,
    city: d.city,
    district: d.district || null,
    zip: d.zip,
    postalCode: d.zip,
    latitude: d.lat,
    longitude: d.lon,
    timezone: d.timezone,
    utcOffset: d.offset,
    continent: d.continent,
    isp: d.isp,
    organization: d.org,
    asn: d.as,
    asnName: d.asname,
    reverseDns: d.reverse || null,
    connectionType: {
      isProxy: d.proxy || false,
      isHosting: d.hosting || false,
      isMobile: d.mobile || false,
    },
    currency: d.currency,
    languages: null, // Not available from ip-api.com free tier
    provider: 'ip-api.com',
  };
}

/**
 * Fetch geolocation data from ipapi.co (fallback provider).
 * Free tier: 1000 requests/day, no API key required.
 * @param {string} ip - The IP address to look up
 * @returns {object} Normalized geolocation data
 */
async function fetchFromIpapiCo(ip) {
  const response = await axios.get(
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
    {
      timeout: REQUEST_TIMEOUT,
      headers: { 'User-Agent': 'ip-geolocation-api/1.0' },
    }
  );

  if (response.data.error) {
    throw new Error(response.data.reason || 'ipapi.co lookup failed');
  }

  const d = response.data;

  return {
    ip: d.ip,
    country: d.country_name,
    countryCode: d.country_code,
    region: d.region_code,
    regionName: d.region,
    city: d.city,
    district: null,
    zip: d.postal,
    postalCode: d.postal,
    latitude: d.latitude,
    longitude: d.longitude,
    timezone: d.timezone,
    utcOffset: d.utc_offset,
    continent: d.continent_code,
    isp: d.org,
    organization: d.org,
    asn: d.asn,
    asnName: null,
    reverseDns: null,
    connectionType: {
      isProxy: false,
      isHosting: false,
      isMobile: false,
    },
    currency: d.currency,
    languages: d.languages || null,
    provider: 'ipapi.co',
  };
}

/**
 * Look up geolocation for an IP address.
 * Tries the primary provider first, falls back to the secondary.
 * @param {string} ip - The IP address to look up
 * @returns {object} Geolocation data
 * @throws {Error} If all providers fail
 */
async function lookupIP(ip) {
  // Try primary provider
  try {
    return await fetchFromIpApi(ip);
  } catch (primaryError) {
    console.warn(
      `[GeoService] Primary provider (ip-api.com) failed for ${ip}: ${primaryError.message}`
    );
  }

  // Try fallback provider
  try {
    return await fetchFromIpapiCo(ip);
  } catch (fallbackError) {
    console.error(
      `[GeoService] Fallback provider (ipapi.co) also failed for ${ip}: ${fallbackError.message}`
    );
    throw new Error('All geolocation providers failed. Please try again later.');
  }
}

module.exports = {
  lookupIP,
};
