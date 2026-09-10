const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Serve static HTML dashboard at root
app.get('/', (req, res) => {
  res.type('text/html').send(`
<!DOCTYPE html>
<html>
<head>
<title>UserVoice Ideas Dashboard</title>
<style>
:root {
  --primary: #0066cc;
  --primary-light: #e6f0ff;
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --border: #ddd;
  --bg-surface: #fafafa;
  --bg-card: #fff;
  --accent: #0066cc;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --primary: #66b3ff;
    --primary-light: #1a3d66;
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
  --text-primary: #e6e6e6;
  --text-secondary: #999;
  --border: #444;
  --bg-surface: #1a1a1a;
  --bg-card: #2a2a2a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  background: var(--bg-surface);
  color: var(--text-primary);
  line-height: 1.5;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 2px solid var(--border);
  padding-bottom: 20px;
}

h1 {
  font-size: 28px;
  font-weight: 600;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 6px 12px;
  background: var(--bg-surface);
  border-radius: 4px;
}

.status.loading { color: var(--warning); }
.status.error { color: var(--danger); }
.status.success { color: var(--success); }

button {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

button:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

button.secondary {
  background: var(--primary-light);
  color: var(--primary);
}

.config-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

input, select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dashboard {
  display: none;
}

.dashboard.active {
  display: block;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.chart-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

canvas {
  max-width: 100%;
  height: auto;
}

.filters {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-group label {
  display: block;
  margin-bottom: 6px;
}

.filter-group select {
  width: 100%;
}

.ideas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.idea-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.idea-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1);
}

.idea-card.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.idea-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
  line-height: 1.4;
}

.idea-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.idea-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.idea-category {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-top: 10px;
}

.idea-status {
  display: inline-block;
  margin-left: 8px;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-surface);
  color: var(--text-primary);
}

.idea-status.planned { background: var(--success); color: white; }
.idea-status.in-progress { background: var(--warning); color: white; }
.idea-status.completed { background: var(--success); color: white; }

.detail-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 30px;
  display: none;
}

.detail-panel.active {
  display: block;
}

.detail-header {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--border);
}

.detail-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 12px;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-tile {
  background: var(--bg-surface);
  padding: 15px;
  border-radius: 4px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.comments-section {
  margin-top: 25px;
}

.comments-section h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.comments-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment {
  background: var(--bg-surface);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.comment-author {
  font-weight: 600;
  color: var(--primary);
  font-size: 12px;
}

.comment-date {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.themes-section {
  margin-top: 20px;
  padding: 15px;
  background: var(--primary-light);
  border-radius: 4px;
}

.themes-section h4 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.themes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.theme-tag {
  background: var(--primary);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: #fee;
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-state-icon {
  font-size: 48px;
  margin-bottom: 15px;
  opacity: 0.5;
}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>📊 UserVoice Ideas Dashboard</h1>
    <div class="header-controls">
      <div class="status" id="status">Ready</div>
      <button class="secondary" onclick="toggleConfig()">⚙️ Config</button>
      <button onclick="testBackend()" style="background: #ffc107;">🧪 Test Backend</button>
      <button onclick="refreshData()">🔄 Refresh</button>
    </div>
  </header>

  <div class="config-panel" id="configPanel">
    <h2 style="margin-bottom: 20px; font-size: 16px;">API Configuration</h2>
    <div class="config-grid">
      <div>
        <label>UserVoice Subdomain</label>
        <input type="text" id="uvSubdomain" placeholder="xero" value="xero">
      </div>
      <div>
        <label>UserVoice API Key</label>
        <input type="password" id="uvApiKey" placeholder="Your API Key">
      </div>
      <div>
        <label>UserVoice API Token</label>
        <input type="password" id="uvApiToken" placeholder="Your API Token">
      </div>
      <div>
        <label>Portkey API Key (Optional - for theme extraction)</label>
        <input type="password" id="portKeyApiKey" placeholder="Your Portkey API Key">
      </div>
    </div>
    <button onclick="saveConfig()" style="margin-right: 10px;">💾 Save Config</button>
    <button onclick="toggleConfig()" class="secondary">Close</button>
  </div>

  <div class="dashboard" id="dashboard">
    <div id="errorDisplay" style="display: none;"></div>

    <div class="charts-grid">
      <div class="chart-card">
        <h3>New Ideas - Month over Month</h3>
        <canvas id="ideasChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Total Votes - Month over Month</h3>
        <canvas id="votesChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Ideas by Status</h3>
        <canvas id="statusChart"></canvas>
      </div>
    </div>

    <div class="filters">
      <div class="filter-group">
        <label>Filter by Category</label>
        <select id="categoryFilter" onchange="applyFilters()">
          <option value="">All Categories</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Filter by Status</label>
        <select id="statusFilter" onchange="applyFilters()">
          <option value="">All Statuses</option>
          <option value="under_review">Under Review</option>
          <option value="planned">Planned</option>
          <option value="started">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Filter by Type</label>
        <select id="typeFilter" onchange="applyFilters()">
          <option value="">All Types</option>
          <option value="recent">Recent</option>
          <option value="trending">Trending</option>
          <option value="planned">Planned</option>
        </select>
      </div>
    </div>

    <h2 style="margin: 30px 0 20px; font-size: 18px; font-weight: 600;">Ideas</h2>
    <div class="ideas-grid" id="ideasGrid">
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p>No ideas loaded. Check your API configuration.</p>
      </div>
    </div>

    <div class="detail-panel" id="detailPanel">
      <div class="detail-header">
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
          <div class="stat-tile">
            <div class="stat-value" id="detailStatus">-</div>
            <div class="stat-label">Status</div>
          </div>
        </div>
      </div>

      <div class="comments-section">
        <h4>Comments & Themes</h4>
        <div class="comments-list" id="commentsList">
          <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
            Loading comments...
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
<script>
let allIdeas = [];
let charts = {};
let currentFilters = { category: '', status: '', type: '' };

const CONFIG_KEY = 'uv-dashboard-config';

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  document.getElementById('configPanel').style.display = 'none';
});

function toggleConfig() {
  const panel = document.getElementById('configPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function saveConfig() {
  const config = {
    uvSubdomain: document.getElementById('uvSubdomain').value,
    uvApiKey: document.getElementById('uvApiKey').value,
    uvApiToken: document.getElementById('uvApiToken').value,
    portKeyApiKey: document.getElementById('portKeyApiKey').value,
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  alert('Configuration saved!');
  toggleConfig();
  refreshData();
}

function loadConfig() {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    const config = JSON.parse(stored);
    document.getElementById('uvSubdomain').value = config.uvSubdomain || 'xero';
    document.getElementById('uvApiKey').value = config.uvApiKey || '';
    document.getElementById('uvApiToken').value = config.uvApiToken || '';
    document.getElementById('portKeyApiKey').value = config.portKeyApiKey || '';

    if (config.uvApiKey && config.uvApiToken) {
      refreshData();
    }
  }
}

function setStatus(message, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = 'status ' + type;
}

async function refreshData() {
  const uvSubdomain = document.getElementById('uvSubdomain').value;
  const uvApiKey = document.getElementById('uvApiKey').value;
  const uvApiToken = document.getElementById('uvApiToken').value;

  if (!uvApiKey || !uvApiToken) {
    showError('Missing credentials');
    setStatus('Missing credentials', 'error');
    return;
  }

  setStatus('Fetching data...', 'loading');
  clearError();

  try {
    const ideas = await fetchIdeas(uvSubdomain, uvApiKey, uvApiToken);
    allIdeas = ideas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    populateCategoryFilter();
    renderCharts(ideas);
    renderIdeas(ideas);

    setStatus('Last updated: ' + new Date().toLocaleTimeString(), 'success');
    document.getElementById('dashboard').classList.add('active');
  } catch (error) {
    console.error(error);
    showError(error.message);
    setStatus('Error loading data', 'error');
  }
}

async function fetchIdeas(subdomain, apiKey, token) {
  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subdomain,
        apiKey,
        apiToken: token
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(\`Backend error: \${response.status} - \${data.error || data.details || 'Unknown error'}\`);
    }

    return data.suggestions || [];
  } catch (error) {
    console.error('fetchIdeas error:', error);
    throw error;
  }
}

function populateCategoryFilter() {
  const categories = [...new Set(allIdeas.map(i => i.category?.name).filter(Boolean))];
  const select = document.getElementById('categoryFilter');
  categories.forEach(cat => {
    if (![...select.options].find(o => o.value === cat)) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    }
  });
}

function renderCharts(ideas) {
  const monthIdeas = groupByMonth(ideas);
  renderLineChart('ideasChart', monthIdeas, 'Number of Ideas');

  const monthVotes = groupVotesByMonth(ideas);
  renderLineChart('votesChart', monthVotes, 'Total Votes');

  const statusCounts = {};
  ideas.forEach(idea => {
    const status = idea.status || 'under_review';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  renderPieChart('statusChart', statusCounts);
}

function groupByMonth(ideas) {
  const months = {};
  ideas.forEach(idea => {
    const date = new Date(idea.created_at);
    const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
    months[key] = (months[key] || 0) + 1;
  });
  return Object.entries(months).sort();
}

function groupVotesByMonth(ideas) {
  const months = {};
  ideas.forEach(idea => {
    const date = new Date(idea.created_at);
    const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
    months[key] = (months[key] || 0) + (idea.response_count || 0);
  });
  return Object.entries(months).sort();
}

function renderLineChart(id, data, label) {
  const ctx = document.getElementById(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(([month]) => month),
      datasets: [{
        label: label,
        data: data.map(([, count]) => count),
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        tension: 0.3,
        fill: true,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

function renderPieChart(id, data) {
  const ctx = document.getElementById(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#0066cc', '#28a745', '#ffc107', '#dc3545'],
      }]
    },
    options: { responsive: true }
  });
}

function renderIdeas(ideas) {
  const grid = document.getElementById('ideasGrid');
  grid.innerHTML = '';

  if (ideas.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No ideas match your filters.</p></div>';
    return;
  }

  ideas.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.onclick = () => showDetail(idea);

    const trend = calculateTrend(idea);
    card.innerHTML = \`
      <div class="idea-title">\${idea.title}</div>
      <div class="idea-meta">
        <div class="idea-stat">👍 \${idea.response_count || 0}</div>
        <div class="idea-stat">💬 \${idea.comments_count || 0}</div>
        \${trend > 0 ? \`<div class="idea-stat">📈 \${trend}%/mo</div>\` : ''}
      </div>
      <div class="idea-category">\${idea.category?.name || 'General'}</div>
      <div class="idea-status \${idea.status}">\${statusLabel(idea.status)}</div>
    \`;
    grid.appendChild(card);
  });
}

function applyFilters() {
  currentFilters.category = document.getElementById('categoryFilter').value;
  currentFilters.status = document.getElementById('statusFilter').value;
  currentFilters.type = document.getElementById('typeFilter').value;

  let filtered = allIdeas;

  if (currentFilters.category) {
    filtered = filtered.filter(i => i.category?.name === currentFilters.category);
  }

  if (currentFilters.status) {
    filtered = filtered.filter(i => (i.status || 'under_review') === currentFilters.status);
  }

  if (currentFilters.type === 'recent') {
    filtered = filtered.slice(0, 10);
  } else if (currentFilters.type === 'trending') {
    filtered = filtered.filter(i => calculateTrend(i) > 50).sort((a, b) => calculateTrend(b) - calculateTrend(a));
  } else if (currentFilters.type === 'planned') {
    filtered = filtered.filter(i => ['planned', 'started', 'completed'].includes(i.status));
  }

  renderIdeas(filtered);
  return filtered;
}

function calculateTrend(idea) {
  const daysSinceCreated = (Date.now() - new Date(idea.created_at)) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated < 1) return 0;
  const monthsSince = daysSinceCreated / 30;
  return Math.round((idea.response_count || 0) / monthsSince);
}

function statusLabel(status) {
  const labels = {
    'under_review': 'Under Review',
    'planned': 'Planned',
    'started': 'In Progress',
    'completed': 'Completed'
  };
  return labels[status] || status;
}

async function showDetail(idea) {
  const panel = document.getElementById('detailPanel');
  panel.classList.add('active');

  document.getElementById('detailTitle').textContent = idea.title;
  document.getElementById('detailVotes').textContent = idea.response_count || 0;
  document.getElementById('detailComments').textContent = idea.comments_count || 0;
  document.getElementById('detailStatus').textContent = statusLabel(idea.status);

  const comments = await fetchComments(idea.id);
  displayComments(comments);

  const portKeyApiKey = document.getElementById('portKeyApiKey').value;
  if (portKeyApiKey && comments.length > 0) {
    extractThemes(idea, comments, portKeyApiKey);
  }

  window.scrollTo({ top: document.getElementById('detailPanel').offsetTop - 100, behavior: 'smooth' });
}

async function fetchComments(ideaId) {
  const uvSubdomain = document.getElementById('uvSubdomain').value;
  const uvApiKey = document.getElementById('uvApiKey').value;
  const uvApiToken = document.getElementById('uvApiToken').value;

  try {
    const response = await fetch(\`/api/comments/\${ideaId}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subdomain: uvSubdomain,
        apiKey: uvApiKey,
        apiToken: uvApiToken
      })
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.comments || [];
  } catch {
    return [];
  }
}

function displayComments(comments) {
  const list = document.getElementById('commentsList');
  if (comments.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No comments yet</div>';
    return;
  }

  list.innerHTML = comments.slice(0, 10).map(comment => \`
    <div class="comment">
      <div class="comment-author">\${comment.creator?.name || 'Anonymous'}</div>
      <div>\${comment.text || ''}</div>
      <div class="comment-date">\${new Date(comment.created_at).toLocaleDateString()}</div>
    </div>
  \`).join('');
}

async function extractThemes(idea, comments, portKeyApiKey) {
  const commentText = comments.map(c => c.text).filter(Boolean).join('\\n\\n');
  if (!commentText) return;

  const themesDiv = document.querySelector('.themes-section') || createThemesSection();
  themesDiv.innerHTML = \`<h4>Extracting themes... <span class="loading-spinner"></span></h4>\`;

  try {
    const response = await fetch('https://api.portkey.ai/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${portKeyApiKey}\`,
        'x-portkey-api-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: \`Extract 3-5 key themes or patterns from these UserVoice comments about "\${idea.title}". Return only the themes as a simple comma-separated list, no numbering or additional text:\\n\\n\${commentText}\`
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const themes = data.content[0].text.split(',').map(t => t.trim()).filter(Boolean);

      themesDiv.innerHTML = \`
        <h4>Key Themes</h4>
        <div class="themes-list">
          \${themes.map(theme => \`<div class="theme-tag">\${theme}</div>\`).join('')}
        </div>
      \`;
    }
  } catch (error) {
    console.error('Theme extraction error:', error);
  }
}

function createThemesSection() {
  const panel = document.getElementById('detailPanel');
  const div = document.createElement('div');
  div.className = 'themes-section';
  panel.appendChild(div);
  return div;
}

function showError(message) {
  const errorDiv = document.getElementById('errorDisplay');
  errorDiv.innerHTML = \`<div class="error-message"><strong>Error:</strong> \${message}</div>\`;
  errorDiv.style.display = 'block';
}

function clearError() {
  const errorDiv = document.getElementById('errorDisplay');
  errorDiv.style.display = 'none';
  errorDiv.innerHTML = '';
}

async function testBackend() {
  try {
    const response = await fetch('/health', { method: 'GET' });
    const data = await response.json();
    alert('✅ Backend test successful!\\n\\n' + JSON.stringify(data));
  } catch (error) {
    alert('❌ Backend test failed:\\n\\n' + error.message);
  }
}
</script>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Fetch suggestions
app.post('/api/ideas', async (req, res) => {
  const { apiToken, subdomain } = req.body;

  if (!apiToken || !subdomain) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const url = `https://${subdomain}.uservoice.com/api/v2/admin/suggestions`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `UserVoice error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch comments for a suggestion
app.post('/api/comments/:ideaId', async (req, res) => {
  const { apiToken, subdomain } = req.body;
  const { ideaId } = req.params;

  if (!apiToken || !subdomain) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const url = `https://${subdomain}.uservoice.com/api/v2/admin/suggestions/${ideaId}/comments`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `UserVoice error: ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`UserVoice proxy server running on port ${PORT}`);
});


