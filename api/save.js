export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};

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
    const idPart = trade?.id || Math.random().toString(36).slice(2);
    const day = String(now.getDate()).padStart(2, '0');
    const time = now.toISOString().replace(/[:.]/g, '-');
    const dirPath = `data/trades/${y}/${m}`;
    const filePath = `${dirPath}/${time}-${idPart}.json`;

    const contentObject = {
      ts: now.toISOString(),
      event: body?.event || 'trade:add',
      trade,
    };

    const apiBase = 'https://api.github.com';
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    };

    const b64 = Buffer.from(JSON.stringify(contentObject, null, 2), 'utf8').toString('base64');

    const putResp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `chore(journal): create ${filePath}`,
        content: b64,
        branch,
      }),
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      res.status(500).json({ ok: false, error: 'Failed to write file', detail: errText });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Unexpected error' });
  }
}

