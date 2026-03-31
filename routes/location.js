/**
 * Location Routes
 * Handles IP geolocation lookup requests.
 */

const express = require('express');
const router = express.Router();

const { lookupIP } = require('../services/geoService');
const { extractClientIP, isPrivateIP, sanitizeIP } = require('../utils/ipUtils');
const { getCachedLocation, setCachedLocation } = require('../utils/cache');

/**
 * GET /api/location
 * Returns detailed geolocation data for the client's IP address.
 * Requires a valid API key via x-api-key header.
 *
 * Optional query parameter:
 *   ?ip=x.x.x.x  - Look up a specific IP (must not be private)
 */
router.get('/', async (req, res, next) => {
  try {
    // Extract or use the provided IP address
    let ip = req.query.ip
      ? sanitizeIP(req.query.ip)
      : extractClientIP(req);

    // Validate that we have an IP
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Could not determine client IP address.',
        requestId: req.requestId,
      });
    }

    // Block private/reserved IP ranges
    if (isPrivateIP(ip)) {
      return res.status(422).json({
        success: false,
        error: 'Unprocessable Entity',
        message: 'Cannot geolocate private or reserved IP addresses. '
          + 'If running locally, provide a public IP via ?ip=x.x.x.x query parameter.',
        requestId: req.requestId,
      });
    }

    // Check the cache first
    const cached = getCachedLocation(ip);
    if (cached) {
      return res.status(200).json({
        success: true,
        cached: true,
        requestId: req.requestId,
        project: req.project?.name || null,
        data: cached,
      });
    }

    // Fetch from external geolocation providers
    const locationData = await lookupIP(ip);

    // Store the result in cache
    setCachedLocation(ip, locationData);

    return res.status(200).json({
      success: true,
      cached: false,
      requestId: req.requestId,
      project: req.project?.name || null,
      data: locationData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
