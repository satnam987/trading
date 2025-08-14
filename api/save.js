export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }

    const owner = process.env.GITHUB_OWNER || 'satnam987';
    const repo = process.env.GITHUB_REPO || 'trading';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      res.status(500).json({ ok: false, error: 'Missing GITHUB_TOKEN env var' });
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const trade = body?.payload?.trade || null;
    if (!trade || typeof trade !== 'object') {
      res.status(400).json({ ok: false, error: 'Missing trade payload' });
      return;
    }
    const filePath = `data/opslag.json`;

    const apiBase = 'https://api.github.com';
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    };

    // Read current opslag.json (if exists)
    let existingSha = null;
    let existingTrades = [];
    const getResp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`, { headers });
    if (getResp.ok) {
      const json = await getResp.json();
      existingSha = json.sha || null;
      if (json.content && json.encoding === 'base64') {
        try {
          const curr = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
          if (Array.isArray(curr?.trades)) existingTrades = curr.trades;
          else if (Array.isArray(curr)) existingTrades = curr; // legacy: plain array
        } catch (_) {}
      }
    }

    // Append new trade record
    existingTrades.push({ ts: now.toISOString(), ...trade });

    const contentStr = JSON.stringify({ version: 1, updatedAt: now.toISOString(), trades: existingTrades }, null, 2);
    const b64 = Buffer.from(contentStr, 'utf8').toString('base64');

    const putResp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: existingSha ? `chore(journal): update ${filePath}` : `chore(journal): create ${filePath}`,
        content: b64,
        branch,
        sha: existingSha || undefined,
      }),
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      res.status(500).json({ ok: false, error: 'Failed to write file', detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Unexpected error', detail: String(err && err.message || err) });
  }
}

