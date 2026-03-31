/**
 * Security Middleware
 * Configures Helmet, CORS, rate limiting, and other security measures.
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

/**
 * Configure Helmet for secure HTTP headers.
 * @returns {Function} Helmet middleware
 */
function configureHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });
}

/**
 * Configure CORS with allowed origins from environment variables.
 * @returns {Function} CORS middleware
 */
function configureCors() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: false,
    maxAge: 86400, // 24 hours
  });
}

/**
 * Configure rate limiting: 100 requests per 15 minutes per IP.
 * @returns {Function} Rate limiter middleware
 */
function configureRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false,   // Disable X-RateLimit-* headers
    message: {
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again in 15 minutes.',
    },
    keyGenerator: (req) => {
      // Use the real client IP for rate limiting
      return req.ip || req.socket?.remoteAddress || 'unknown';
    },
  });
}

/**
 * Add a unique request ID to each request for logging and debugging.
 * @returns {Function} Express middleware
 */
function requestIdMiddleware() {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  };
}

/**
 * Prevent IP spoofing by removing untrusted forwarding headers
 * when not behind a known proxy.
 * @returns {Function} Express middleware
 */
function antiSpoofingMiddleware() {
  return (req, res, next) => {
    // If TRUST_PROXY is not set, strip x-forwarded-for to prevent spoofing
    if (!process.env.TRUST_PROXY || process.env.TRUST_PROXY === 'false') {
      delete req.headers['x-forwarded-for'];
      delete req.headers['x-real-ip'];
    }
    next();
  };
}

module.exports = {
  configureHelmet,
  configureCors,
  configureRateLimit,
  requestIdMiddleware,
  antiSpoofingMiddleware,
};
