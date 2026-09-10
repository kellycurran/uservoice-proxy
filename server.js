const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Fetch ideas (suggestions in UserVoice API)
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
});
