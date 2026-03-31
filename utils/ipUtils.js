/**
 * IP Address Utility Functions
 * Handles IP extraction, validation, and security checks.
 */

const net = require('net');

// Private and reserved IP ranges (CIDR notation)
const PRIVATE_RANGES = [
  // IPv4 private ranges
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // APIPA / Carrier-grade NAT
  { start: '100.64.0.0', end: '100.127.255.255' },
  // Documentation ranges
  { start: '192.0.2.0', end: '192.0.2.255' },
  { start: '198.51.100.0', end: '198.51.100.255' },
  { start: '203.0.113.0', end: '203.0.113.255' },
  // Broadcast
  { start: '255.255.255.255', end: '255.255.255.255' },
  // 0.0.0.0/8
  { start: '0.0.0.0', end: '0.255.255.255' },
];

/**
 * Convert an IPv4 address string to a numeric value for range comparison.
 * @param {string} ip - IPv4 address
 * @returns {number} Numeric representation
 */
function ipToLong(ip) {
  const parts = ip.split('.');
  return (
    ((parseInt(parts[0], 10) << 24) |
      (parseInt(parts[1], 10) << 16) |
      (parseInt(parts[2], 10) << 8) |
      parseInt(parts[3], 10)) >>>
    0
  );
}

/**
 * Check if an IP address falls within private or reserved ranges.
 * @param {string} ip - IP address to check
 * @returns {boolean} True if the IP is private or reserved
 */
function isPrivateIP(ip) {
  // IPv6 loopback
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;

  // Strip IPv6 prefix if present (e.g., ::ffff:192.168.1.1)
  const cleanIP = ip.replace(/^::ffff:/, '');

  // Only check IPv4 addresses against private ranges
  if (!net.isIPv4(cleanIP)) return false;

  const ipLong = ipToLong(cleanIP);

  return PRIVATE_RANGES.some((range) => {
    const startLong = ipToLong(range.start);
    const endLong = ipToLong(range.end);
    return ipLong >= startLong && ipLong <= endLong;
  });
}

/**
 * Extract the real client IP address from the request.
 * Validates the IP and prevents spoofing by only trusting
 * x-forwarded-for when behind a trusted proxy.
 *
 * @param {import('express').Request} req - Express request object
 * @returns {string|null} The client IP address or null if invalid
 */
function extractClientIP(req) {
  let ip = null;

  // 1. Check x-forwarded-for header (set by trusted reverse proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP in the chain (original client IP)
    const firstIP = forwarded.split(',')[0].trim();
    if (isValidIP(firstIP)) {
      ip = firstIP;
    }
  }

  // 2. Fall back to socket remote address
  if (!ip && req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }

  // 3. Final fallback to req.ip (Express built-in)
  if (!ip) {
    ip = req.ip;
  }

  if (!ip) return null;

  // Normalize IPv6-mapped IPv4 addresses (::ffff:x.x.x.x -> x.x.x.x)
  ip = ip.replace(/^::ffff:/, '');

  return isValidIP(ip) ? ip : null;
}

/**
 * Validate an IP address (both IPv4 and IPv6).
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const cleanIP = ip.replace(/^::ffff:/, '');
  return net.isIPv4(cleanIP) || net.isIPv6(ip);
}

/**
 * Sanitize an IP string to prevent injection attacks.
 * Only allows characters valid in IP addresses.
 * @param {string} ip - Raw IP string
 * @returns {string} Sanitized IP string
 */
function sanitizeIP(ip) {
  if (!ip || typeof ip !== 'string') return '';
  // Allow only digits, dots, colons, and hex chars (for IPv6)
  return ip.replace(/[^0-9a-fA-F.:]/g, '').slice(0, 45);
}

module.exports = {
  extractClientIP,
  isPrivateIP,
  isValidIP,
  sanitizeIP,
};
