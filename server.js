const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signToken(payload) {
  const secret = process.env.DASHBOARD_PASSWORD || 'insecure-default-change-me';
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  return `${payloadStr}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payloadStr, sig] = token.split('.');
  const secret = process.env.DASHBOARD_PASSWORD || 'insecure-default-change-me';
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
  if (sig !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString());
    if (payload.exp && Date.now() > payload.exp) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function requireAuth(req, res, next) {
  const token = req.headers['x-dashboard-auth'];
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, maxRetries = 6) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt), 15000);
      if (attempt < maxRetries) {
        await sleep(waitMs);
        continue;
      }
    }

    return response;
  }
}

// In-memory cache, keyed by subdomain. Lost on server restart/sleep.
const suggestionsCacheBySubdomain = {};
const commentsCacheBySubdomain = {};

async function fetchAllPaginated({ subdomain, apiToken, resource, cacheStore, res }) {
  const cache = cacheStore[subdomain] || { byId: {}, lastSync: null };
  const baseUrl = `https://${subdomain}.uservoice.com/api/v2/admin/${resource}`;
  const syncStartedAt = new Date().toISOString();
  let cursor = null;
  let pageCount = 0;
  const maxPages = 300;

  while (pageCount < maxPages) {
    const params = new URLSearchParams();
    params.append('per_page', '100');
    if (cursor) {
      params.append('cursor', cursor);
    } else if (cache.lastSync) {
      params.append('updated_after', cache.lastSync);
    }
    const url = `${baseUrl}?${params.toString()}`;

    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: true, status: response.status, details: errorText };
    }

    const data = await response.json();
    const records = data[resource] || [];
    records.forEach(record => { cache.byId[record.id] = record; });

    if (data.pagination && data.pagination.cursor) {
      cursor = data.pagination.cursor;
      pageCount++;
      await sleep(120);
    } else {
      break;
    }
  }

  cache.lastSync = syncStartedAt;
  cacheStore[subdomain] = cache;

  return { error: false, records: Object.values(cache.byId) };
}

const dashboardHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UserVoice Ideas Dashboard</title>
<style>
:root {
  --primary: #0066cc;
  --primary-light: #e6f0ff;
  --success: #28a745;
  --success-light: #e6f7ea;
  --warning: #ffc107;
  --danger: #dc3545;
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --border: #ddd;
  --bg-surface: #f5f6f8;
  --bg-card: #fff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --primary: #66b3ff;
    --primary-light: #1a3d66;
    --success-light: #12301c;
    --text-primary: #e6e6e6;
    --text-secondary: #999;
    --border: #444;
    --bg-surface: #1a1a1a;
    --bg-card: #2a2a2a;
  }
}

:root[data-theme="dark"] {
  --primary: #66b3ff;
  --primary-light: #1a3d66;
  --success-light: #12301c;
  --text-primary: #e6e6e6;
  --text-secondary: #999;
  --border: #444;
  --bg-surface: #1a1a1a;
  --bg-card: #2a2a2a;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; background: var(--bg-surface); color: var(--text-primary); line-height: 1.5; }
.container { max-width: 1500px; margin: 0 auto; padding: 24px; }
header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
h1 { font-size: 24px; font-weight: 700; }
.subtitle { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
.header-controls { display: flex; gap: 10px; align-items: center; }
.status { font-size: 12px; color: var(--text-secondary); padding: 6px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; white-space: nowrap; }
.status.loading { color: var(--warning); }
.status.error { color: var(--danger); }
.status.success { color: var(--success); }
button { padding: 8px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 13px; transition: all 0.2s; white-space: nowrap; }
button:hover { background: var(--primary); color: white; border-color: var(--primary); }
button.secondary { background: var(--primary-light); color: var(--primary); }
.config-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 15px; }
input, select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-surface); color: var(--text-primary); font-size: 14px; }
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.dashboard { display: none; }
.dashboard.active { display: block; }

.insight-banner { background: var(--success-light); border-left: 4px solid var(--success); border-radius: 6px; padding: 16px 20px; margin: 16px 0 20px; font-size: 14px; line-height: 1.6; }
.insight-banner b { color: var(--success); }

.tiles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 24px; }
.tile { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 16px 18px; }
.tile-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.tile-value { font-size: 26px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
.tile-sub { font-size: 12px; color: var(--text-secondary); }
.tile-sub.up { color: var(--success); }

.panels-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; margin-bottom: 20px; }
@media (max-width: 900px) { .panels-grid { grid-template-columns: 1fr; } }
.panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
.panel h3 { font-size: 13px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); }
.panel .panel-sub { font-size: 12px; color: var(--text-secondary); margin-bottom: 14px; }
canvas { max-width: 100%; }

.rank-list { list-style: none; }
.rank-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.rank-item:last-child { border-bottom: none; }
.rank-badge { flex-shrink: 0; background: var(--primary-light); color: var(--primary); font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 20px; min-width: 60px; text-align: center; }
.rank-badge.trend { background: var(--success-light); color: var(--success); }
.rank-title { flex: 1; font-size: 13px; cursor: pointer; }
.rank-title:hover { color: var(--primary); }
.rank-trend-icon { font-size: 12px; font-weight: 700; }
.rank-trend-icon.rising { color: var(--success); }
.rank-trend-icon.flat { color: var(--text-secondary); }

.filters { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 15px; margin-bottom: 16px; display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end; }
.filter-group { flex: 1; min-width: 180px; }

.table-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
th { cursor: pointer; user-select: none; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
th:hover { color: var(--primary); }
td.title-cell { white-space: normal; max-width: 380px; }
tr:hover td { background: var(--bg-surface); }
.badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--primary); color: white; }
.badge.spam { background: var(--danger); }
.badge.reviewing { background: var(--warning); color: #333; }

.detail-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 25px; margin-top: 20px; display: none; }
.detail-panel.active { display: block; }
.detail-title { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
.detail-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 20px; }
.stat-tile { background: var(--bg-surface); padding: 15px; border-radius: 4px; text-align: center; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
.stat-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.comments-list { max-height: 400px; overflow-y: auto; }
.comment { background: var(--bg-surface); padding: 12px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; }
.comment-author { font-weight: 600; color: var(--primary); font-size: 12px; }
.themes-section { margin: 16px 0; padding: 16px; background: var(--primary-light); border-radius: 6px; }
.themes-section h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary); margin-bottom: 10px; }
.themes-list { display: flex; flex-wrap: wrap; gap: 8px; }
.theme-tag { background: var(--primary); color: white; padding: 5px 12px; border-radius: 14px; font-size: 12px; font-weight: 500; }
.empty-state { text-align: center; padding: 40px 20px; color: var(--text-secondary); }
</style>
</head>
<body>
<div class="container">
  <header>
    <div>
      <h1>Xero UserVoice — Feature Request Dashboard</h1>
      <div class="subtitle" id="subtitle">Load data to see coverage</div>
    </div>
    <div class="header-controls">
      <div class="status" id="status">Ready</div>
      <button onclick="refreshData()">Refresh</button>
      <button class="secondary" onclick="logout()">Log out</button>
    </div>
  </header>

  <div class="config-panel" id="loginPanel">
    <h2 style="margin-bottom: 16px; font-size: 16px;">Enter Password</h2>
    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px;">This dashboard is shared internally — ask the dashboard owner for the password.</p>
    <div class="config-grid">
      <div>
        <label>Password</label>
        <input type="password" id="loginPassword" placeholder="Password" onkeydown="if(event.key==='Enter') doLogin()">
      </div>
    </div>
    <div id="loginError" style="color: var(--danger); font-size: 13px; margin-bottom: 10px; display: none;"></div>
    <button onclick="doLogin()">Unlock Dashboard</button>
  </div>

  <div class="dashboard" id="dashboard">
    <div id="errorDisplay" style="display: none;"></div>

    <div class="insight-banner" id="insightBanner"></div>

    <div class="tiles-grid" id="tilesGrid"></div>

    <div class="panels-grid">
      <div class="panel">
        <h3>Ideas Submitted — Trend</h3>
        <div class="panel-sub">New ideas created per month</div>
        <canvas id="ideasChart" height="90"></canvas>
      </div>
      <div class="panel">
        <h3>🔥 Fast-Moving Ideas</h3>
        <div class="panel-sub">Ranked by recent engagement (UserVoice's own recent-activity signal)</div>
        <ul class="rank-list" id="trendingList"></ul>
      </div>
    </div>

    <div class="panels-grid">
      <div class="panel">
        <h3>Ideas by Status</h3>
        <div class="panel-sub">All-time breakdown</div>
        <canvas id="statusChart" height="200"></canvas>
      </div>
      <div class="panel">
        <h3>Most Voted (All-Time)</h3>
        <div class="panel-sub">Highest supporter counts</div>
        <ul class="rank-list" id="mostVotedList"></ul>
      </div>
    </div>

    <div class="panels-grid">
      <div class="panel" style="grid-column: 1 / -1;">
        <h3>Most Discussed (All-Time)</h3>
        <div class="panel-sub">Highest comment counts</div>
        <ul class="rank-list" id="mostDiscussedList"></ul>
      </div>
    </div>

    <div class="filters">
      <div class="filter-group">
        <label>Search</label>
        <input type="text" id="searchFilter" placeholder="Search title..." oninput="applyFilters()">
      </div>
      <div class="filter-group">
        <label>Category</label>
        <select id="categoryFilter" onchange="applyFilters()">
          <option value="">All Categories</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select id="statusFilter" onchange="applyFilters()">
          <option value="">All Statuses</option>
        </select>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th onclick="sortTable('title')">Title</th>
            <th onclick="sortTable('category')">Category</th>
            <th onclick="sortTable('state')">Status</th>
            <th onclick="sortTable('supporters_count')">Votes</th>
            <th onclick="sortTable('comments_count')">Comments</th>
            <th onclick="sortTable('recent_engagement')">Recent Activity</th>
            <th onclick="sortTable('created_at')">Created</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>

    <div class="detail-panel" id="detailPanel">
      <div class="detail-title" id="detailTitle"></div>
      <div class="detail-stats">
        <div class="stat-tile">
          <div class="stat-value" id="detailVotes">0</div>
          <div class="stat-label">Votes</div>
        </div>
        <div class="stat-tile">
          <div class="stat-value" id="detailComments">0</div>
          <div class="stat-label">Comments</div>
        </div>
      </div>
      <div class="themes-section" id="themesSection" style="display:none;">
        <h4>Key Themes</h4>
        <div class="themes-list" id="themesList"></div>
      </div>
      <div class="comments-list" id="commentsList"></div>
    </div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
<script>
let allIdeas = [];
let categoriesMap = {};
let commentsByIdea = {};
let charts = {};
let sortState = { field: 'supporters_count', dir: 'desc' };

function commentSuggestionId(comment) {
  if (comment.links) {
    if (comment.links.suggestion) return comment.links.suggestion;
    if (comment.links.suggestions) return comment.links.suggestions;
  }
  if (comment.suggestion_id) return comment.suggestion_id;
  if (comment.suggestion && comment.suggestion.id) return comment.suggestion.id;
  return null;
}

const AUTH_TOKEN_KEY = 'uv-dashboard-token';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    document.getElementById('loginPanel').style.display = 'none';
    refreshData();
  } else {
    document.getElementById('loginPanel').style.display = 'block';
  }
});

async function doLogin() {
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.style.display = 'block';
      return;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    document.getElementById('loginPanel').style.display = 'none';
    refreshData();
  } catch (e) {
    errorEl.textContent = 'Could not reach server';
    errorEl.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('loginPanel').style.display = 'block';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Dashboard-Auth': localStorage.getItem(AUTH_TOKEN_KEY) || ''
  };
}

function setStatus(message, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = 'status ' + type;
}

async function refreshData() {
  setStatus('Fetching ideas...', 'loading');

  try {
    const [ideasRes, catRes] = await Promise.all([
      fetch('/api/ideas', { method: 'POST', headers: authHeaders() }),
      fetch('/api/categories', { method: 'POST', headers: authHeaders() })
    ]);

    if (ideasRes.status === 401 || catRes.status === 401) {
      logout();
      setStatus('Session expired — please log in again', 'error');
      return;
    }

    const data = await ideasRes.json();
    if (data.error) {
      setStatus(data.error, 'error');
      return;
    }
    allIdeas = (data.suggestions || []).map(idea => ({
      ...idea,
      category: idea.links && idea.links.category
    }));

    try {
      const catData = await catRes.json();
      categoriesMap = {};
      (catData.categories || []).forEach(c => { categoriesMap[c.id] = c.name; });
    } catch (e) {
      categoriesMap = {};
    }

    setStatus('Fetching comments...', 'loading');
    commentsByIdea = {};
    try {
      const commentsRes = await fetch('/api/all-comments', { method: 'POST', headers: authHeaders() });
      const commentsData = await commentsRes.json();
      (commentsData.comments || []).forEach(c => {
        const sid = commentSuggestionId(c);
        if (!sid) return;
        if (!commentsByIdea[sid]) commentsByIdea[sid] = [];
        commentsByIdea[sid].push(c);
      });
    } catch (e) {
      console.error('Failed to load comments:', e);
    }

    populateFilterOptions();
    renderInsightBanner(allIdeas);
    renderTiles(allIdeas);
    renderTrendChart(allIdeas);
    renderStatusChart(allIdeas);
    renderRankLists(allIdeas);
    applyFilters();

    document.getElementById('subtitle').textContent = allIdeas.length.toLocaleString() + ' ideas loaded — updated ' + new Date().toLocaleString();
    setStatus('Last updated: ' + new Date().toLocaleTimeString(), 'success');
    document.getElementById('dashboard').classList.add('active');
  } catch (error) {
    console.error(error);
    setStatus('Error loading data', 'error');
  }
}

function categoryName(idea) {
  if (!idea.category) return '—';
  return categoriesMap[idea.category] || '—';
}

function populateFilterOptions() {
  const catSelect = document.getElementById('categoryFilter');
  const statusSelect = document.getElementById('statusFilter');
  const cats = new Set();
  const statuses = new Set();
  allIdeas.forEach(i => {
    const cn = categoryName(i);
    if (cn !== '—') cats.add(cn);
    if (i.state) statuses.add(i.state);
  });
  catSelect.innerHTML = '<option value="">All Categories</option>' + [...cats].sort().map(c => \`<option value="\${c}">\${c}</option>\`).join('');
  statusSelect.innerHTML = '<option value="">All Statuses</option>' + [...statuses].sort().map(s => \`<option value="\${s}">\${s}</option>\`).join('');
}

function renderInsightBanner(ideas) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const recentIdeas = ideas.filter(i => new Date(i.created_at) >= thirtyDaysAgo);
  const totalVotes = ideas.reduce((s, i) => s + (i.supporters_count || 0), 0);
  const totalComments = ideas.reduce((s, i) => s + (i.comments_count || 0), 0);
  const trending = ideas.filter(i => (i.recent_engagement || 0) > 0).length;

  document.getElementById('insightBanner').innerHTML = \`
    Across <b>\${ideas.length.toLocaleString()}</b> tracked ideas, the community has cast <b>\${totalVotes.toLocaleString()}</b> votes
    and left <b>\${totalComments.toLocaleString()}</b> comments all-time. <b>\${recentIdeas.length}</b> new ideas were submitted
    in the last 30 days, and <b>\${trending}</b> ideas currently show recent engagement activity.
  \`;
}

function renderTiles(ideas) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const recentIdeas = ideas.filter(i => new Date(i.created_at) >= thirtyDaysAgo);
  const totalVotes = ideas.reduce((s, i) => s + (i.supporters_count || 0), 0);
  const totalComments = ideas.reduce((s, i) => s + (i.comments_count || 0), 0);
  const topFeature = ideas.reduce((max, i) => (i.supporters_count || 0) > (max.supporters_count || 0) ? i : max, ideas[0] || {});

  const allComments = Object.values(commentsByIdea).flat();
  const hasCommentDates = allComments.length > 0 && allComments.some(c => c.created_at);
  let newCommentsLabel = 'New Comments (30 Days)';
  let newCommentsValue;
  if (hasCommentDates) {
    newCommentsValue = allComments.filter(c => c.created_at && new Date(c.created_at) >= thirtyDaysAgo).length.toLocaleString();
  } else {
    newCommentsLabel = 'New Comments (approx.)';
    const recentUpdated = ideas.filter(i => new Date(i.updated_at) >= thirtyDaysAgo);
    newCommentsValue = recentUpdated.reduce((s, i) => s + (i.comments_count || 0), 0).toLocaleString();
  }

  const tiles = [
    { label: 'Total Requests', value: ideas.length.toLocaleString(), sub: 'All time' },
    { label: 'New (30 Days)', value: recentIdeas.length.toLocaleString(), sub: 'Ideas submitted', up: true },
    { label: 'Total Votes', value: totalVotes.toLocaleString(), sub: 'Community votes, all time' },
    { label: 'Total Comments', value: totalComments.toLocaleString(), sub: 'All time' },
    { label: newCommentsLabel, value: newCommentsValue, sub: hasCommentDates ? 'Last 30 days' : 'On ideas active in last 30d*' },
    { label: 'Top Feature All-Time', value: (topFeature.supporters_count || 0).toLocaleString() + ' votes', sub: (topFeature.title || '—').slice(0, 40) }
  ];

  document.getElementById('tilesGrid').innerHTML = tiles.map(t => \`
    <div class="tile">
      <div class="tile-label">\${t.label}</div>
      <div class="tile-value">\${t.value}</div>
      <div class="tile-sub \${t.up ? 'up' : ''}">\${t.sub}</div>
    </div>
  \`).join('');
}

function renderTrendChart(ideas) {
  const monthIdeas = {};
  ideas.forEach(idea => {
    const date = new Date(idea.created_at);
    const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
    monthIdeas[key] = (monthIdeas[key] || 0) + 1;
  });
  const sorted = Object.entries(monthIdeas).sort();

  const ctx = document.getElementById('ideasChart').getContext('2d');
  if (charts['ideas']) charts['ideas'].destroy();
  charts['ideas'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(([m]) => m),
      datasets: [{
        label: 'Ideas',
        data: sorted.map(([, c]) => c),
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        tension: 0.3,
        fill: true,
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function renderStatusChart(ideas) {
  const statusCounts = {};
  ideas.forEach(idea => {
    const status = idea.state || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusCtx = document.getElementById('statusChart').getContext('2d');
  if (charts['status']) charts['status'].destroy();
  charts['status'] = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#0066cc', '#28a745', '#ffc107', '#dc3545', '#8a63d2'] }]
    },
    options: { responsive: true }
  });
}

function renderRankLists(ideas) {
  const trending = [...ideas].sort((a, b) => (b.recent_engagement || 0) - (a.recent_engagement || 0)).slice(0, 10);
  document.getElementById('trendingList').innerHTML = trending.map(i => \`
    <li class="rank-item">
      <span class="rank-badge trend">\${(i.recent_engagement || 0)} pts</span>
      <span class="rank-title" onclick='showDetailById(\${i.id})'>\${escapeHtml(i.title)}</span>
      <span class="rank-trend-icon \${(i.engagement_trend || 0) > 0 ? 'rising' : 'flat'}">\${(i.engagement_trend || 0) > 0 ? '▲' : '–'}</span>
    </li>
  \`).join('') || '<li class="rank-item">No engagement data available</li>';

  const mostVoted = [...ideas].sort((a, b) => (b.supporters_count || 0) - (a.supporters_count || 0)).slice(0, 5);
  document.getElementById('mostVotedList').innerHTML = mostVoted.map(i => \`
    <li class="rank-item">
      <span class="rank-badge">\${(i.supporters_count || 0)} votes</span>
      <span class="rank-title" onclick='showDetailById(\${i.id})'>\${escapeHtml(i.title)}</span>
    </li>
  \`).join('');

  const mostDiscussed = [...ideas].sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0)).slice(0, 5);
  document.getElementById('mostDiscussedList').innerHTML = mostDiscussed.map(i => \`
    <li class="rank-item">
      <span class="rank-badge">\${(i.comments_count || 0)} comments</span>
      <span class="rank-title" onclick='showDetailById(\${i.id})'>\${escapeHtml(i.title)}</span>
    </li>
  \`).join('');
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function applyFilters() {
  const search = document.getElementById('searchFilter').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  const status = document.getElementById('statusFilter').value;

  let filtered = allIdeas.filter(i => {
    if (search && !i.title.toLowerCase().includes(search)) return false;
    if (category && categoryName(i) !== category) return false;
    if (status && i.state !== status) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let av = a[sortState.field], bv = b[sortState.field];
    if (sortState.field === 'category') { av = categoryName(a); bv = categoryName(b); }
    if (sortState.field === 'created_at') { av = new Date(av); bv = new Date(bv); }
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortState.dir === 'asc' ? -1 : 1;
    if (av > bv) return sortState.dir === 'asc' ? 1 : -1;
    return 0;
  });

  renderTable(filtered);
}

function sortTable(field) {
  if (sortState.field === field) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.field = field;
    sortState.dir = 'desc';
  }
  applyFilters();
}

function renderTable(ideas) {
  const tbody = document.getElementById('tableBody');
  if (ideas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ideas match your filters</td></tr>';
    return;
  }

  tbody.innerHTML = ideas.slice(0, 200).map(i => \`
    <tr>
      <td class="title-cell" onclick='showDetailById(\${i.id})' style="cursor:pointer; color: var(--primary);">\${escapeHtml(i.title)}</td>
      <td>\${categoryName(i)}</td>
      <td><span class="badge \${i.state === 'spam' ? 'spam' : i.state === 'under_review' ? 'reviewing' : ''}">\${i.state || 'unknown'}</span></td>
      <td>\${i.supporters_count || 0}</td>
      <td>\${i.comments_count || 0}</td>
      <td>\${i.recent_engagement || 0}</td>
      <td>\${new Date(i.created_at).toLocaleDateString()}</td>
    </tr>
  \`).join('');
}

function showDetailById(id) {
  const idea = allIdeas.find(i => i.id === id);
  if (idea) showDetail(idea);
}

function showDetail(idea) {
  const panel = document.getElementById('detailPanel');
  panel.classList.add('active');
  document.getElementById('detailTitle').textContent = idea.title;
  document.getElementById('detailVotes').textContent = idea.supporters_count || 0;
  document.getElementById('detailComments').textContent = idea.comments_count || 0;
  window.scrollTo({ top: panel.offsetTop - 20, behavior: 'smooth' });

  const themesSection = document.getElementById('themesSection');
  const themesList = document.getElementById('themesList');
  themesSection.style.display = 'none';
  themesList.innerHTML = '';

  const comments = (commentsByIdea[idea.id] || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (comments.length === 0) {
    const note = (idea.comments_count || 0) > 0
      ? \`This idea has \${idea.comments_count} comment(s) per UserVoice, but none matched in the bulk comments fetch — the linking field may need adjusting.\`
      : 'No comments';
    document.getElementById('commentsList').innerHTML = \`<div style="text-align:center; padding:20px; color:var(--text-secondary);">\${note}</div>\`;
  } else {
    document.getElementById('commentsList').innerHTML = comments.map(c => \`
      <div class="comment">
        <div class="comment-author">\${escapeHtml((c.creator && c.creator.name) || 'Anonymous')}</div>
        <div>\${escapeHtml(c.body || c.text || '')}</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">\${c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</div>
      </div>
    \`).join('');

    analyzeThemes(idea, comments);
  }
}

async function analyzeThemes(idea, comments) {
  const themesSection = document.getElementById('themesSection');
  const themesList = document.getElementById('themesList');
  const bodies = comments.map(c => c.body || c.text || '').filter(Boolean);

  if (bodies.length === 0) return;

  themesSection.style.display = 'block';
  themesList.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">Analyzing themes...</span>';

  try {
    const response = await fetch('/api/analyze-themes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: idea.title, comments: bodies })
    });
    const data = await response.json();

    if (data.error) {
      themesList.innerHTML = \`<span style="font-size:12px; color:var(--text-secondary);">\${escapeHtml(data.error)}</span>\`;
      return;
    }

    const themes = data.themes || [];
    if (themes.length === 0) {
      themesSection.style.display = 'none';
      return;
    }

    themesList.innerHTML = themes.map(t => \`<div class="theme-tag">\${escapeHtml(t)}</div>\`).join('');
  } catch (e) {
    themesList.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">Could not analyze themes</span>';
  }
}
</script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(dashboardHTML);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.DASHBOARD_PASSWORD;

  if (!expectedPassword) {
    return res.status(500).json({ error: 'DASHBOARD_PASSWORD not configured on the server' });
  }

  if (password !== expectedPassword) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = signToken({ exp: Date.now() + SESSION_TTL_MS });
  res.json({ token });
});

app.post('/api/ideas', requireAuth, async (req, res) => {
  const subdomain = process.env.UV_SUBDOMAIN;
  const apiToken = process.env.UV_API_TOKEN;

  if (!apiToken || !subdomain) {
    return res.status(500).json({ error: 'UV_SUBDOMAIN / UV_API_TOKEN not configured on the server' });
  }

  try {
    const result = await fetchAllPaginated({
      subdomain, apiToken, resource: 'suggestions', cacheStore: suggestionsCacheBySubdomain
    });

    if (result.error) {
      return res.status(result.status).json({ error: `UserVoice error: ${result.status}`, details: result.details });
    }

    res.json({ suggestions: result.records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/all-comments', requireAuth, async (req, res) => {
  const subdomain = process.env.UV_SUBDOMAIN;
  const apiToken = process.env.UV_API_TOKEN;

  if (!apiToken || !subdomain) {
    return res.status(500).json({ error: 'UV_SUBDOMAIN / UV_API_TOKEN not configured on the server' });
  }

  try {
    const result = await fetchAllPaginated({
      subdomain, apiToken, resource: 'comments', cacheStore: commentsCacheBySubdomain
    });

    if (result.error) {
      return res.status(result.status).json({ error: `UserVoice error: ${result.status}`, details: result.details });
    }

    res.json({ comments: result.records });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', requireAuth, async (req, res) => {
  const subdomain = process.env.UV_SUBDOMAIN;
  const apiToken = process.env.UV_API_TOKEN;

  if (!apiToken || !subdomain) {
    return res.status(500).json({ error: 'UV_SUBDOMAIN / UV_API_TOKEN not configured on the server' });
  }

  try {
    const baseUrl = `https://${subdomain}.uservoice.com/api/v2/admin/categories`;
    let allCategories = [];
    let cursor = null;
    let pageCount = 0;
    const maxPages = 20;

    while (pageCount < maxPages) {
      const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;

      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        return res.json({ categories: [] });
      }

      const data = await response.json();

      if (data.categories && data.categories.length > 0) {
        allCategories = allCategories.concat(data.categories);
      }

      if (data.pagination && data.pagination.cursor) {
        cursor = data.pagination.cursor;
        pageCount++;
        await sleep(120);
      } else {
        break;
      }
    }

    res.json({ categories: allCategories });
  } catch (error) {
    res.json({ categories: [] });
  }
});

const PORTKEY_MODEL = process.env.PORTKEY_MODEL || '@bedrock/global.anthropic.claude-sonnet-4-6';
const PORTKEY_GATEWAY_URL = process.env.PORTKEY_GATEWAY_URL || 'https://llm-gateway.xgw.xero-test.com/v1/chat/completions';

app.post('/api/analyze-themes', requireAuth, async (req, res) => {
  const { title, comments } = req.body;

  if (!process.env.PORTKEY_API_KEY) {
    return res.status(500).json({ error: 'PORTKEY_API_KEY not configured on the server' });
  }

  if (!comments || comments.length === 0) {
    return res.json({ themes: [] });
  }

  const commentText = comments
    .map((c, i) => `${i + 1}. ${c}`)
    .join('\n')
    .slice(0, 12000);

  try {
    const response = await fetch(PORTKEY_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-portkey-api-key': process.env.PORTKEY_API_KEY
      },
      body: JSON.stringify({
        model: PORTKEY_MODEL,
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Here are user comments on a feature request titled "${title}":\n\n${commentText}\n\nExtract 3-5 short key themes from these comments (each theme should be 2-5 words). Respond with ONLY a comma-separated list of themes, nothing else.`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Portkey error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content
      : '';
    const themes = text.split(',').map(t => t.trim()).filter(Boolean);

    res.json({ themes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`UserVoice proxy server running on port ${PORT}`);
});
