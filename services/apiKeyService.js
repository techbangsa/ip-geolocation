/**
 * API Key Service - Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateApiKey() {
  return 'geo_' + crypto.randomBytes(24).toString('hex');
}

async function createProject(projectName) {
  const project = {
    id: crypto.randomUUID(),
    name: projectName,
    api_key: generateApiKey(),
    created_at: new Date().toISOString(),
    request_count: 0,
    last_used: null,
    active: true,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    name: data.name,
    apiKey: data.api_key,
    createdAt: data.created_at,
    requestCount: data.request_count,
    lastUsed: data.last_used,
    active: data.active,
  };
}

// Validated keys are cached per instance so most requests skip Supabase.
// Unknown keys are cached too (shorter) so bad keys can't hammer the DB.
const KEY_CACHE_TTL_MS = 5 * 60 * 1000;
const INVALID_KEY_CACHE_TTL_MS = 60 * 1000;
const keyCache = new Map();

// Usage counts are accumulated in memory and written at most once per
// interval instead of a read + write on every request.
const USAGE_FLUSH_INTERVAL_MS = 60 * 1000;
const pendingUsage = new Map();
let lastUsageFlush = Date.now();
let usageFlushInFlight = null;

async function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;

  const cached = keyCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) return cached.project;

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, api_key, created_at, request_count, last_used, active')
    .eq('api_key', apiKey)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const project = data
    ? {
        id: data.id,
        name: data.name,
        apiKey: data.api_key,
        createdAt: data.created_at,
        requestCount: data.request_count,
        lastUsed: data.last_used,
        active: data.active,
      }
    : null;

  keyCache.set(apiKey, {
    project,
    expiresAt: Date.now() + (project ? KEY_CACHE_TTL_MS : INVALID_KEY_CACHE_TTL_MS),
  });

  return project;
}

async function flushUsage() {
  const entries = [...pendingUsage.entries()];
  pendingUsage.clear();
  lastUsageFlush = Date.now();

  await Promise.all(
    entries.map(async ([apiKey, { count, lastUsed }]) => {
      const { data } = await supabase
        .from('projects')
        .select('request_count')
        .eq('api_key', apiKey)
        .maybeSingle();

      if (!data) return;

      await supabase
        .from('projects')
        .update({
          request_count: data.request_count + count,
          last_used: lastUsed,
        })
        .eq('api_key', apiKey);
    })
  );
}

async function incrementUsage(apiKey) {
  const entry = pendingUsage.get(apiKey) || { count: 0, lastUsed: null };
  entry.count += 1;
  entry.lastUsed = new Date().toISOString();
  pendingUsage.set(apiKey, entry);

  if (usageFlushInFlight || Date.now() - lastUsageFlush < USAGE_FLUSH_INTERVAL_MS) return;

  usageFlushInFlight = flushUsage().finally(() => {
    usageFlushInFlight = null;
  });
  await usageFlushInFlight;
}

async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    apiKeyPreview: p.api_key.slice(0, 8) + '...' + p.api_key.slice(-4),
    createdAt: p.created_at,
    requestCount: p.request_count,
    lastUsed: p.last_used,
    active: p.active,
  }));
}

async function getProjectStats(apiKey) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    requestCount: data.request_count,
    lastUsed: data.last_used,
    createdAt: data.created_at,
    active: data.active,
  };
}

module.exports = { createProject, validateApiKey, incrementUsage, getAllProjects, getProjectStats };
