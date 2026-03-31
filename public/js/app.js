(function () {
  'use strict';

  const API_BASE = window.location.origin;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  // ─── Nav ──────────────────────────────────────────────────────────────────
  function initNav() {
    const hamburger = $('.nav-hamburger');
    const links = $('.nav-links');
    if (hamburger) {
      hamburger.addEventListener('click', () => links.classList.toggle('open'));
      $$('.nav-links a').forEach((a) =>
        a.addEventListener('click', () => links.classList.remove('open'))
      );
    }
  }

  // ─── Health Check ─────────────────────────────────────────────────────────
  async function checkHealth() {
    const dot = $('.status-dot');
    const text = $('.status-text');
    try {
      const res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.success) {
        dot.className = 'status-dot online';
        const s = data.uptime;
        const t = s >= 3600 ? Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm'
          : s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's'
          : s + 's';
        text.textContent = 'API Online — Uptime: ' + t;
      } else { throw 0; }
    } catch {
      dot.className = 'status-dot offline';
      text.textContent = 'API Offline';
    }
  }

  // ─── Generate API Key ─────────────────────────────────────────────────────
  function initForm() {
    const form = $('#apikey-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#project-name').value.trim();
      if (!name) return showError('Enter a project name.');

      hideEl('.error-message');
      hideEl('#key-result');
      setLoading($('#apikey-submit'), true);

      try {
        const res = await fetch(API_BASE + '/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed');

        const key = data.data.apiKey;
        showResult(key);
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading($('#apikey-submit'), false);
      }
    });
  }

  function showResult(apiKey) {
    const base = API_BASE;

    // Show key
    $('#key-value').textContent = apiKey;

    // Build links
    $('#link-auto-url').textContent = base + '/api/location';
    $('#link-ip-url').textContent = base + '/api/location?ip=8.8.8.8';

    // Build code snippets
    $('#snippet-auto').textContent =
      `fetch("${base}/api/location", {\n` +
      `  headers: { "x-api-key": "${apiKey}" }\n` +
      `})\n` +
      `  .then(res => res.json())\n` +
      `  .then(data => console.log(data));`;

    $('#snippet-ip').textContent =
      `fetch("${base}/api/location?ip=8.8.8.8", {\n` +
      `  headers: { "x-api-key": "${apiKey}" }\n` +
      `})\n` +
      `  .then(res => res.json())\n` +
      `  .then(data => console.log(data));`;

    // Auto-fill playground
    const pg = $('#playground-key');
    if (pg && !pg.value) pg.value = apiKey;

    // Show panel
    showEl('#key-result');
  }

  // ─── Playground ───────────────────────────────────────────────────────────
  function initPlayground() {
    const btn = $('#playground-run');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const key = ($('#playground-key').value || '').trim();
      const ip = ($('#playground-ip').value || '').trim();
      const output = $('#playground-output');

      setLoading(btn, true);
      output.innerHTML = '<span class="json-null">Loading...</span>';

      try {
        const url = API_BASE + '/api/location' + (ip ? '?ip=' + encodeURIComponent(ip) : '');
        const res = await fetch(url, { headers: { 'x-api-key': key } });
        const data = await res.json();
        output.innerHTML = highlight(JSON.stringify(data, null, 2));
      } catch (err) {
        output.innerHTML = '<span class="json-string">"Error: ' + esc(err.message) + '"</span>';
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ─── Copy Buttons ─────────────────────────────────────────────────────────
  function initCopy() {
    // Copy code blocks
    $$('.copy-code').forEach((btn) => {
      btn.addEventListener('click', () => {
        const block = btn.closest('.code-block');
        const code = block.querySelector('pre code') || block.querySelector('pre');
        if (code) copy(code.textContent, btn);
      });
    });

    // Copy key
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;

      // data-copy attribute points to an element id
      const targetId = btn.dataset.copy;
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) copy(el.textContent, btn);
      } else if (btn.id === 'copy-key') {
        const key = $('#key-value');
        if (key) copy(key.textContent, btn);
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function showEl(sel) { const el = $(sel); if (el) el.classList.add('visible'); }
  function hideEl(sel) { const el = $(sel); if (el) el.classList.remove('visible'); }

  function showError(msg) {
    const el = $('.error-message');
    if (el) { el.textContent = msg; el.classList.add('visible'); }
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn.disabled = true;
      btn._txt = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
      btn.disabled = false;
      btn.innerHTML = btn._txt || btn.innerHTML;
    }
  }

  function copy(text, trigger) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = trigger.textContent;
      trigger.textContent = '✓';
      setTimeout(() => (trigger.textContent = orig), 1200);
    });
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function highlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|\bnull\b)/g,
      (m) => {
        let c = 'json-number';
        if (/^"/.test(m)) c = /:$/.test(m) ? 'json-key' : 'json-string';
        else if (/true|false/.test(m)) c = 'json-boolean';
        else if (/null/.test(m)) c = 'json-null';
        return '<span class="' + c + '">' + m + '</span>';
      }
    );
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initForm();
    initPlayground();
    initCopy();
    checkHealth();
    setInterval(checkHealth, 30000);
  });
})();
