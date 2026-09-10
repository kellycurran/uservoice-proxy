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

  if (!apiKey || !apiToken || !subdomain) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  try {
    const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
    const url = `https://${subdomain}.uservoice.com/api/v2/${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `UserVoice API error: ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`UserVoice proxy server running on port ${PORT}`);
});