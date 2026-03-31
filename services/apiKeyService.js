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

async function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return null;

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('api_key', apiKey)
    .eq('active', true)
    .single();

  if (error || !data) return null;

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

async function incrementUsage(apiKey) {
  const { data } = await supabase
    .from('projects')
    .select('request_count')
    .eq('api_key', apiKey)
    .single();

  if (!data) return;

  await supabase
    .from('projects')
    .update({
      request_count: data.request_count + 1,
      last_used: new Date().toISOString(),
    })
    .eq('api_key', apiKey);
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
