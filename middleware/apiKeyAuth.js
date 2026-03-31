/**
 * API Key Authentication Middleware
 * Validates x-api-key header on every protected request.
 */

const apiKeyService = require('../services/apiKeyService');

/**
 * Middleware that checks for a valid API key in the x-api-key header.
 * Rejects unauthorized requests with a 401 response.
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing API key. Include x-api-key header in your request.',
    });
  }

  // Basic format validation (prevent injection)
  if (typeof apiKey !== 'string' || apiKey.length > 100) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key format.',
    });
  }

  // Validate the API key against stored projects
  const project = apiKeyService.validateApiKey(apiKey);

  if (!project) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid or inactive API key.',
    });
  }

  // Attach project info to the request for downstream use
  req.project = project;

  // Increment the usage counter
  apiKeyService.incrementUsage(apiKey);

  next();
}

module.exports = apiKeyAuth;
