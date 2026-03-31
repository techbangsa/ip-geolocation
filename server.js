/**
 * IP Geolocation API Server
 *
 * A secure, production-ready REST API that provides detailed
 * geolocation data based on client IP addresses.
 * Each project must register and use its own API key.
 */

require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');

// Middleware
const {
  configureHelmet,
  configureCors,
  configureRateLimit,
  requestIdMiddleware,
  antiSpoofingMiddleware,
} = require('./middleware/security');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// Routes
const locationRoutes = require('./routes/location');
const projectRoutes = require('./routes/project');

// Cache stats
const { getCacheStats } = require('./utils/cache');

// ─── App Initialization ──────────────────────────────────────────────────────

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ─── Trust Proxy Configuration ───────────────────────────────────────────────
// Set this if behind a reverse proxy (nginx, cloudflare, etc.)
if (process.env.TRUST_PROXY && process.env.TRUST_PROXY !== 'false') {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
}

// ─── Global Middleware (order matters) ───────────────────────────────────────

// 1. Request ID for tracing
app.use(requestIdMiddleware());

// 2. Anti-spoofing — strip forwarding headers if not behind a trusted proxy
app.use(antiSpoofingMiddleware());

// 3. Security headers
app.use(configureHelmet());

// 4. CORS
app.use(configureCors());

// 5. Rate limiting
app.use(configureRateLimit());

// 6. Request logging
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms [:req[x-request-id]]', {
    stream: {
      write: (message) => console.log(`[HTTP] ${message.trim()}`),
    },
  })
);

// 7. JSON body parsing (limited to 10kb to prevent abuse)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── Static Frontend ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Public Routes (no API key required) ─────────────────────────────────────

/**
 * GET /health
 * Health check endpoint — returns server status and uptime.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    cache: getCacheStats(),
  });
});

// Project registration (creating API keys is public)
app.use('/api/projects', projectRoutes);

// ─── Protected Routes (API key required) ─────────────────────────────────────

app.use('/api/location', apiKeyAuth, locationRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Server Start ────────────────────────────────────────────────────────────

const server = app.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  IP Geolocation API Server');
  console.log(`  Running on http://${HOST}:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('  Endpoints:');
  console.log(`    Health:    GET  http://localhost:${PORT}/health`);
  console.log(`    Location:  GET  http://localhost:${PORT}/api/location`);
  console.log(`    Projects:  POST http://localhost:${PORT}/api/projects`);
  console.log(`    Stats:     GET  http://localhost:${PORT}/api/projects/stats`);
  console.log('═══════════════════════════════════════════════════════');
});

// Set server-level timeout for all connections (30 seconds)
server.timeout = parseInt(process.env.SERVER_TIMEOUT, 10) || 30000;

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function gracefulShutdown(signal) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

  server.close((err) => {
    if (err) {
      console.error('[Server] Error during shutdown:', err);
      process.exit(1);
    }
    console.log('[Server] Closed all connections. Goodbye!');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if connections are hanging
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
