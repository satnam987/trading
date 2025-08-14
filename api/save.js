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
    const filePath = `data/log-${y}-${m}.txt`;

    const line = JSON.stringify({
      ts: now.toISOString(),
      event: body?.event || 'unknown',
      payload: body?.payload ?? null,
    });

    const apiBase = 'https://api.github.com';
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    };

    // Fetch current file (if any) to obtain sha and existing content
    let existingSha = null;
    let existingContent = '';
    const getResp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`, {
      method: 'GET',
      headers,
    });
    if (getResp.ok) {
      const json = await getResp.json();
      existingSha = json.sha || null;
      if (json.content && json.encoding === 'base64') {
        existingContent = Buffer.from(json.content, 'base64').toString('utf8');
      }
    }

    const newContent = existingContent ? `${existingContent}\n${line}` : line;
    const b64 = Buffer.from(newContent, 'utf8').toString('base64');

    const putResp = await fetch(`${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `chore(data): append event to ${filePath}`,
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
    res.status(500).json({ ok: false, error: 'Unexpected error' });
  }
}

