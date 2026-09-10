const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Proxy endpoint for UserVoice API
app.post('/api/uservoice/:endpoint(*)', async (req, res) => {
  const { apiKey, apiToken, subdomain } = req.body;
  const endpoint = req.params.endpoint;

  console.log(`[PROXY] POST /api/uservoice/${endpoint}`);
  console.log(`[PROXY] Credentials received: key=${!!apiKey}, token=${!!apiToken}, subdomain=${subdomain}`);

  if (!apiKey || !apiToken || !subdomain) {
    console.error('[PROXY] Missing credentials');
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
    const url = `https://${subdomain}.uservoice.com/api/v2/${endpoint}`;

    console.log(`[PROXY] Calling: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    console.log(`[PROXY] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PROXY] UserVoice error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ error: `UserVoice API error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    console.log(`[PROXY] Success: got ${data.data?.length || 0} items`);
    res.json(data);
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint to verify backend works
app.get('/test', (req, res) => {
  console.log('[TEST] GET /test called');
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

// Test POST endpoint
app.post('/test', (req, res) => {
  console.log('[TEST] POST /test called with body:', req.body);
  res.json({ message: 'Backend POST is working!', received: req.body, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`UserVoice proxy server running on port ${PORT}`);
});
