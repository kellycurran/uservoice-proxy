const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; background: var(--bg-surface); color: var(--text-primary); line-height: 1.5; }
.container { max-width: 1400px; margin: 0 auto; padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid var(--border); padding-bottom: 20px; }
h1 { font-size: 28px; font-weight: 600; }
.header-controls { display: flex; gap: 10px; align-items: center; }
.status { font-size: 12px; color: var(--text-secondary); padding: 6px 12px; background: var(--bg-surface); border-radius: 4px; }
.status.loading { color: var(--warning); }
.status.error { color: var(--danger); }
.status.success { color: var(--success); }
button { padding: 8px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-card); color: var(--text-primary); cursor: pointer; font-size: 14px; transition: all 0.2s; }
button:hover { background: var(--primary); color: white; border-color: var(--primary); }
button.secondary { background: var(--primary-light); color: var(--primary); }
.config-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 15px; }
input, select { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-surface); color: var(--text-primary); font-size: 14px; }
label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.dashboard { display: none; }
.dashboard.active { display: block; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
.chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
.chart-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 15px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
canvas { max-width: 100%; height: auto; }
.filters { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 15px; margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end; }
.filter-group { flex: 1; min-width: 200px; }
.ideas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-bottom: 30px; }
.idea-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.2s; }
.idea-card:hover { border-color: var(--primary); box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1); }
.idea-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; line-height: 1.4; }
.idea-meta { display: flex; gap: 15px; margin-bottom: 12px; font-size: 13px; color: var(--text-secondary); }
.idea-category { display: inline-block; background: var(--primary); color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-top: 10px; }
.idea-status { display: inline-block; margin-left: 8px; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; background: var(--bg-surface); color: var(--text-primary); }
.idea-status.planned { background: var(--success); color: white; }
.detail-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 25px; margin-bottom: 30px; display: none; }
.detail-panel.active { display: block; }
.detail-title { font-size: 22px; font-weight: 600; margin-bottom: 12px; }
.detail-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 20px; }
.stat-tile { background: var(--bg-surface); padding: 15px; border-radius: 4px; text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
.stat-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.comments-list { max-height: 400px; overflow-y: auto; }
.comment { background: var(--bg-surface); padding: 12px; border-radius: 4px; margin-bottom: 10px; font-size: 13px; line-height: 1.5; }
.comment-author { font-weight: 600; color: var(--primary); font-size: 12px; }
.error-message { background: #fee; border: 1px solid var(--danger); color: var(--danger); padding: 12px; border-radius: 4px; margin-bottom: 15px; font-size: 14px; }
.empty-state { text-align: center; padding: 40px 20px; color: var(--text-secondary); }
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
        <label>UserVoice API Token</label>
        <input type="password" id="uvApiToken" placeholder="Your API Token">
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
        </select>
      </div>
    </div>

    <h2 style="margin: 30px 0 20px; font-size: 18px; font-weight: 600;">Ideas</h2>
    <div class="ideas-grid" id="ideasGrid">
      <div class="empty-state">
        <p>No ideas loaded. Check your API configuration.</p>
      </div>
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
      <div class="comments-list" id="commentsList"></div>
    </div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
<script>
let allIdeas = [];
let charts = {};

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
    uvApiToken: document.getElementById('uvApiToken').value,
  };
  localStorage.setItem('uv-config', JSON.stringify(config));
  alert('Configuration saved!');
  toggleConfig();
  refreshData();
}

function loadConfig() {
  const stored = localStorage.getItem('uv-config');
  if (stored) {
    const config = JSON.parse(stored);
    document.getElementById('uvSubdomain').value = config.uvSubdomain || 'xero';
    document.getElementById('uvApiToken').value = config.uvApiToken || '';

    if (config.uvApiToken) {
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
  const uvApiToken = document.getElementById('uvApiToken').value;

  if (!uvApiToken) {
    setStatus('Missing API token', 'error');
    return;
  }

  setStatus('Fetching data...', 'loading');

  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: uvSubdomain, apiToken: uvApiToken })
    });

    const data = await response.json();
    allIdeas = (data.suggestions || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderCharts(allIdeas);
    renderIdeas(allIdeas);
    setStatus('Last updated: ' + new Date().toLocaleTimeString(), 'success');
    document.getElementById('dashboard').classList.add('active');
  } catch (error) {
    console.error(error);
    setStatus('Error loading data', 'error');
  }
}

function renderCharts(ideas) {
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

  const statusCounts = {};
  ideas.forEach(idea => {
    const status = idea.status || 'published';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const statusCtx = document.getElementById('statusChart').getContext('2d');
  if (charts['status']) charts['status'].destroy();
  charts['status'] = new Chart(statusCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#0066cc', '#28a745', '#ffc107'] }]
    },
    options: { responsive: true }
  });
}

function renderIdeas(ideas) {
  const grid = document.getElementById('ideasGrid');
  grid.innerHTML = '';

  if (ideas.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>No ideas found</p></div>';
    return;
  }

  ideas.slice(0, 50).forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.innerHTML = \`
      <div class="idea-title">\${idea.title}</div>
      <div class="idea-meta">
        <span>👍 \${idea.supporters_count || 0}</span>
        <span>💬 \${idea.comments_count || 0}</span>
      </div>
      <div class="idea-category">\${idea.state || 'published'}</div>
    \`;
    card.onclick = () => showDetail(idea);
    grid.appendChild(card);
  });
}

function applyFilters() {
  renderIdeas(allIdeas);
}

async function showDetail(idea) {
  const panel = document.getElementById('detailPanel');
  panel.classList.add('active');
  document.getElementById('detailTitle').textContent = idea.title;
  document.getElementById('detailVotes').textContent = idea.supporters_count || 0;
  document.getElementById('detailComments').textContent = idea.comments_count || 0;
  window.scrollTo({ top: panel.offsetTop - 100, behavior: 'smooth' });
}

async function testBackend() {
  try {
    const response = await fetch('/test');
    const data = await response.json();
    alert('✅ Backend working!\\n' + JSON.stringify(data));
  } catch (error) {
    alert('❌ Backend error: ' + error.message);
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

app.post('/api/ideas', async (req, res) => {
  const { apiToken, subdomain } = req.body;

  if (!apiToken || !subdomain) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const baseUrl = `https://${subdomain}.uservoice.com/api/v2/admin/suggestions`;
    let allSuggestions = [];
    let cursor = null;
    let pageCount = 0;
    const maxPages = 100;

    while (pageCount < maxPages) {
      const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;

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

      if (data.suggestions && data.suggestions.length > 0) {
        allSuggestions = allSuggestions.concat(data.suggestions);
      }

      if (data.pagination && data.pagination.cursor) {
        cursor = data.pagination.cursor;
        pageCount++;
      } else {
        break;
      }
    }

    res.json({ suggestions: allSuggestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
