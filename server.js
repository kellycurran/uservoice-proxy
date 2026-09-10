const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

