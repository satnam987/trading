export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const owner = process.env.GITHUB_OWNER || 'satnam987';
    const repo = process.env.GITHUB_REPO || 'trading';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN || '';

    const apiBase = 'https://api.github.com';
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const filePath = 'data/opslag.json';
    const resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!resp.ok) {
      res.status(200).json({ ok: true, exists: false, trades: [] });
      return;
    }
    const json = await resp.json();
    const content = json?.content && json?.encoding === 'base64' ? Buffer.from(json.content, 'base64').toString('utf8') : '';
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (_) {}
    const trades = Array.isArray(parsed?.trades) ? parsed.trades : (Array.isArray(parsed) ? parsed : []);
    res.status(200).json({ ok: true, exists: true, trades, raw: content });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Unexpected error' });
  }
}

