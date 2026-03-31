/**
 * API Key Service
 * Manages project registration, API key generation, validation, and usage tracking.
 * Stores data in a local JSON file for simplicity.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'projects.json');

/**
 * Read all projects from the JSON data file.
 * @returns {Array} Array of project objects
 */
function readProjects() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Write the projects array to the JSON data file.
 * @param {Array} projects - Array of project objects
 */
function writeProjects(projects) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), 'utf-8');
}

/**
 * Generate a cryptographically secure random API key.
 * Format: "geo_" prefix + 48 random hex characters
 * @returns {string} The generated API key
 */
function generateApiKey() {
  const randomBytes = crypto.randomBytes(24);
  return `geo_${randomBytes.toString('hex')}`;
}

/**
 * Create a new project and generate an API key for it.
 * @param {string} projectName - The name of the project
 * @returns {object} The created project record
 */
function createProject(projectName) {
  const projects = readProjects();

  const project = {
    id: crypto.randomUUID(),
    name: projectName,
    apiKey: generateApiKey(),
    createdAt: new Date().toISOString(),
    requestCount: 0,
    lastUsed: null,
    active: true,
  };

  projects.push(project);
  writeProjects(projects);

  return project;
}

/**
 * Validate an API key and return the associated project.
 * @param {string} apiKey - The API key to validate
 * @returns {object|null} The project object if valid, null otherwise
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;

  const projects = readProjects();
  return projects.find((p) => p.apiKey === apiKey && p.active) || null;
}

/**
 * Increment the request counter for a project.
 * @param {string} apiKey - The API key of the project
 */
function incrementUsage(apiKey) {
  const projects = readProjects();
  const project = projects.find((p) => p.apiKey === apiKey);

  if (project) {
    project.requestCount += 1;
    project.lastUsed = new Date().toISOString();
    writeProjects(projects);
  }
}

/**
 * Get all projects (with API keys partially masked for security).
 * @returns {Array} Array of project summaries
 */
function getAllProjects() {
  const projects = readProjects();

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    apiKeyPreview: p.apiKey.slice(0, 8) + '...' + p.apiKey.slice(-4),
    createdAt: p.createdAt,
    requestCount: p.requestCount,
    lastUsed: p.lastUsed,
    active: p.active,
  }));
}

/**
 * Get usage statistics for a specific project by its API key.
 * @param {string} apiKey - The API key
 * @returns {object|null} Usage stats or null if not found
 */
function getProjectStats(apiKey) {
  const project = validateApiKey(apiKey);
  if (!project) return null;

  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    requestCount: project.requestCount,
    lastUsed: project.lastUsed,
    active: project.active,
  };
}

/**
 * Deactivate a project (soft delete).
 * @param {string} projectId - The project ID
 * @returns {boolean} True if deactivated, false if not found
 */
function deactivateProject(projectId) {
  const projects = readProjects();
  const project = projects.find((p) => p.id === projectId);

  if (!project) return false;

  project.active = false;
  writeProjects(projects);
  return true;
}

module.exports = {
  createProject,
  validateApiKey,
  incrementUsage,
  getAllProjects,
  getProjectStats,
  deactivateProject,
};
