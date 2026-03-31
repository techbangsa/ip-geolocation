/**
 * Project Routes
 * Handles project registration, API key generation, and usage stats.
 */

const express = require('express');
const router = express.Router();

const apiKeyService = require('../services/apiKeyService');

/**
 * POST /api/projects
 * Create a new project and generate an API key.
 *
 * Request body:
 *   { "name": "My Project" }
 *
 * Response:
 *   { success: true, data: { id, name, apiKey, createdAt, ... } }
 */
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;

    // Validate project name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Project name is required. Provide a "name" field in the request body.',
        requestId: req.requestId,
      });
    }

    // Sanitize and limit name length
    const sanitizedName = name.trim().slice(0, 100);

    // Create the project
    const project = await apiKeyService.createProject(sanitizedName);

    return res.status(201).json({
      success: true,
      message: 'Project created successfully. Store your API key securely — it cannot be retrieved later.',
      requestId: req.requestId,
      data: {
        id: project.id,
        name: project.name,
        apiKey: project.apiKey,
        createdAt: project.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects
 * List all projects with masked API keys and usage stats.
 * Protected by admin key (optional - controlled via ADMIN_API_KEY env var).
 */
router.get('/', async (req, res, next) => {
  try {
    const adminKey = process.env.ADMIN_API_KEY;

    // If an admin key is configured, require it
    if (adminKey) {
      const providedKey = req.headers['x-api-key'] || req.headers['x-admin-key'];
      if (providedKey !== adminKey) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Admin API key required to list projects.',
          requestId: req.requestId,
        });
      }
    }

    const projects = await apiKeyService.getAllProjects();

    return res.status(200).json({
      success: true,
      requestId: req.requestId,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/stats
 * Get usage statistics for the current project (identified by API key).
 * Requires x-api-key header.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Include x-api-key header to view your project stats.',
        requestId: req.requestId,
      });
    }

    const stats = await apiKeyService.getProjectStats(apiKey);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'No project found for the provided API key.',
        requestId: req.requestId,
      });
    }

    return res.status(200).json({
      success: true,
      requestId: req.requestId,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
