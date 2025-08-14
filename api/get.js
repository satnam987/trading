export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const owner = process.env.GITHUB_OWNER || 'satnam987';
    const repo = process.env.GITHUB_REPO || 'trading';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN || '';

    const p = typeof req.query?.path === 'string' ? req.query.path : '';
    if (!p || !p.startsWith('data/')) {
      res.status(400).json({ ok: false, error: 'Missing or invalid path' });
      return;
    }

    const apiBase = 'https://api.github.com';
    const headers = {
      Accept: 'application/vnd.github+json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const resp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(p)}?ref=${encodeURIComponent(branch)}`, { headers });
    if (!resp.ok) {
      const err = await resp.text();
      res.status(500).json({ ok: false, error: 'Failed to fetch file', detail: err });
      return;
    }
    const json = await resp.json();
    const content = json?.content && json?.encoding === 'base64'
      ? Buffer.from(json.content, 'base64').toString('utf8')
      : '';

    let parsed = null;
    if (p.endsWith('.json')) {
      try { parsed = JSON.parse(content); } catch (_) { parsed = null; }
    }

    res.status(200).json({ ok: true, path: p, content, json: parsed });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Unexpected error' });
  }
}

