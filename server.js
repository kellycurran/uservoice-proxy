const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.type('text/html').send(`
<!DOCTYPE html>
<html>
<head>
<title>Xero UserVoice — Feature Request Dashboard</title>
<style>
:root {
  --primary: #0066cc;
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --border: #ddd;
  --bg-surface: #fafafa;
  --bg-card: #fff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --primary: #66b3ff;
    --text-primary: #e6e6e6;
    --text-secondary: #999;
    --border: #444;
    --bg-surface: #1a1a1a;
    --bg-card: #2a2a2a;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg-surface);
  color: var(--text-primary);
  line-height: 1.5;
  font-size: 14px;
}

.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  font-size: 24px;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
}

button:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 25px;
}

.metric-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 15px;
  text-align: center;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 5px;
}

.metric-label {
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-detail {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 25px;
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px;
}

.chart-card h3 {
  font-size: 13px;
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

.top-items {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px;
}

.top-items h3 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item:last-child {
  border-bottom: none;
}

.item-name {
  color: var(--primary);
  font-weight: 500;
  flex: 1;
}

.item-stat {
  color: var(--text-secondary);
  font-size: 11px;
  margin-left: 10px;
}

.table-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px;
  margin-top: 25px;
}

.table-section h3 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th {
  text-align: left;
  padding: 10px;
  border-bottom: 2px solid var(--border);
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-surface);
}

td {
  padding: 10px;
  border-bottom: 1px solid var(--border);
}

tr:hover {
  background: var(--bg-surface);
}

.badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.badge.completed {
  background: var(--success);
  color: white;
}

.badge.planned {
  background: var(--warning);
  color: white;
}

.badge.review {
  background: var(--primary);
  color: white;
}

.sparkline {
  height: 20px;
  display: inline-block;
  width: 50px;
}

.config-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 12px;
}

label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.status {
  font-size: 11px;
  padding: 4px 8px;
  background: var(--bg-surface);
  border-radius: 3px;
  color: var(--text-secondary);
}

.status.success {
  color: var(--success);
}

.status.error {
  color: var(--danger);
}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Xero UserVoice — Feature Request Dashboard</h1>
    <div class="controls">
      <button onclick="toggleConfig()">⚙️ Config</button>
      <button onclick="refreshData()">🔄 Refresh</button>
      <span class="status" id="status">Ready</span>
    </div>
  </header>

  <div class="config-panel" id="configPanel" style="display: none;">
    <div class="config-grid">
      <div>
        <label>UserVoice Subdomain</label>
        <input type="text" id="uvSubdomain" placeholder="xero" value="xero">
      </div>
      <div>
        <label>UserVoice API Key</label>
        <input type="password" id="uvApiKey">
      </div>
      <div>
        <label>UserVoice API Token</label>
        <input type="password" id="uvApiToken">
      </div>
    </div>
    <button onclick="saveConfig()" style="margin-right: 10px;">Save Config</button>
    <button onclick="toggleConfig()">Close</button>
  </div>

  <div id="dashboard" style="display: none;">
    <!-- Metrics -->
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value" id="totalRequests">0</div>
        <div class="metric-label">Total Requests</div>
        <div class="metric-detail" id="totalDetail"></div>
      </div>
      <div class="metric-card">
        <div class="metric-value" id="newRequests">0</div>
        <div class="metric-label">New (30 Days)</div>
        <div class="metric-detail" id="newDetail"></div>
      </div>
      <div class="metric-card">
        <div class="metric-value" id="totalComments">0</div>
        <div class="metric-label">Total Comments</div>
        <div class="metric-detail" id="commentsDetail"></div>
      </div>
      <div class="metric-card">
        <div class="metric-value" id="newComments">0</div>
        <div class="metric-label">New Comments</div>
        <div class="metric-detail" id="newCommentsDetail"></div>
      </div>
      <div class="metric-card">
        <div class="metric-value" id="totalVotes">0</div>
        <div class="metric-label">Total Votes</div>
        <div class="metric-detail" id="votesDetail"></div>
      </div>
    </div>

    <!-- Charts & Top Items -->
    <div class="charts-section">
      <div class="chart-card">
        <h3>Ideas Submitted - Trend</h3>
        <canvas id="trendChart"></canvas>
      </div>
      <div class="top-items">
        <h3>Most Voted</h3>
        <div id="mostVotedList"></div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <h3>Ideas by Status</h3>
        <canvas id="statusChart"></canvas>
      </div>
      <div class="top-items">
        <h3>Most Discussed</h3>
        <div id="mostDiscussedList"></div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-section">
      <h3>Browse all feature requests</h3>
      <div style="overflow-x: auto;">
        <table id="ideasTable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Votes</th>
              <th>Comments</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody id="tableBody">
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
<script>
let allIdeas = [];
let charts = {};

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

    if (config.uvApiKey && config.uvApiToken) {
      refreshData();
    }
  }
}

function setStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

async function refreshData() {
  const subdomain = document.getElementById('uvSubdomain').value;
  const apiKey = document.getElementById('uvApiKey').value;
  const token = document.getElementById('uvApiToken').value;

  if (!apiKey || !token) {
    setStatus('Missing credentials', 'error');
    return;
  }

  setStatus('Loading...', 'info');

  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain, apiKey, apiToken: token })
    });

    const data = await response.json();
    allIdeas = data.suggestions || [];

    if (allIdeas.length === 0) {
      setStatus('No data loaded', 'error');
      return;
    }

    updateMetrics();
    updateCharts();
    updateTopLists();
    updateTable();

    document.getElementById('dashboard').style.display = 'block';
    setStatus('Updated: ' + new Date().toLocaleTimeString(), 'success');
  } catch (error) {
    console.error(error);
    setStatus('Error: ' + error.message, 'error');
  }
}

function updateMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const total = allIdeas.length;
  const newIn30 = allIdeas.filter(i => new Date(i.created_at) > thirtyDaysAgo).length;
  const totalComments = allIdeas.reduce((sum, i) => sum + (i.comments_count || 0), 0);
  const newCommentsIn30 = allIdeas
    .filter(i => new Date(i.created_at) > thirtyDaysAgo)
    .reduce((sum, i) => sum + (i.comments_count || 0), 0);
  const totalVotes = allIdeas.reduce((sum, i) => sum + (i.response_count || 0), 0);

  document.getElementById('totalRequests').textContent = total;
  document.getElementById('totalDetail').textContent = 'All time';
  document.getElementById('newRequests').textContent = newIn30;
  document.getElementById('newDetail').textContent = 'Last 30 days';
  document.getElementById('totalComments').textContent = totalComments;
  document.getElementById('commentsDetail').textContent = 'All time';
  document.getElementById('newComments').textContent = newCommentsIn30;
  document.getElementById('newCommentsDetail').textContent = 'Last 30 days';
  document.getElementById('totalVotes').textContent = totalVotes;
  document.getElementById('votesDetail').textContent = 'Community votes';
}

function updateCharts() {
  const monthData = {};
  allIdeas.forEach(idea => {
    const date = new Date(idea.created_at);
    const key = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`;
    monthData[key] = (monthData[key] || 0) + 1;
  });

  const labels = Object.keys(monthData).sort();
  const values = labels.map(k => monthData[k]);

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ideas Submitted',
        data: values,
        borderColor: '#0066cc',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const statusCounts = {};
  allIdeas.forEach(idea => {
    const status = idea.status || 'under_review';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const ctx2 = document.getElementById('statusChart').getContext('2d');
  if (charts.status) charts.status.destroy();
  charts.status = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#0066cc', '#28a745', '#ffc107', '#dc3545'],
      }]
    },
    options: { responsive: true }
  });
}

function updateTopLists() {
  const topVoted = allIdeas.sort((a, b) => (b.response_count || 0) - (a.response_count || 0)).slice(0, 5);
  const topDiscussed = allIdeas.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0)).slice(0, 5);

  document.getElementById('mostVotedList').innerHTML = topVoted.map((idea, i) => \`
    <div class="item">
      <div class="item-name">\${i + 1}. \${idea.title}</div>
      <div class="item-stat">\${idea.response_count || 0} votes</div>
    </div>
  \`).join('');

  document.getElementById('mostDiscussedList').innerHTML = topDiscussed.map((idea, i) => \`
    <div class="item">
      <div class="item-name">\${i + 1}. \${idea.title}</div>
      <div class="item-stat">\${idea.comments_count || 0} comments</div>
    </div>
  \`).join('');
}

function updateTable() {
  const sorted = allIdeas.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const rows = sorted.slice(0, 50).map(idea => \`
    <tr>
      <td>\${idea.title}</td>
      <td>\${idea.category?.name || '—'}</td>
      <td><span class="badge review">Published</span></td>
      <td>\${idea.response_count || 0}</td>
      <td>\${idea.comments_count || 0}</td>
      <td>\${new Date(idea.created_at).toLocaleDateString()}</td>
    </tr>
  \`).join('');

  document.getElementById('tableBody').innerHTML = rows;
}
</script>
</body>
</html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/ideas', async (req, res) => {
  const { apiToken, subdomain } = req.body;

  if (!apiToken || !subdomain) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const url = \`https://\${subdomain}.uservoice.com/api/v2/admin/suggestions\`;
    const response = await fetch(url, {
      headers: {
        'Authorization': \`Bearer \${apiToken}\`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: \`UserVoice error: \${response.status}\`, details: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});



