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

    const apiBase = 'https://api.github.com';
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // Get branch details to find tree sha
    const branchResp = await fetch(`${apiBase}/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`, { headers });
    if (!branchResp.ok) {
      const err = await branchResp.text();
      res.status(500).json({ ok: false, error: 'Failed to get branch info', detail: err });
      return;
    }
    const branchJson = await branchResp.json();
    const treeSha = branchJson?.commit?.commit?.tree?.sha;
    if (!treeSha) {
      res.status(500).json({ ok: false, error: 'Missing tree sha' });
      return;
    }

    // List the entire tree recursively
    const treeResp = await fetch(`${apiBase}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, { headers });
    if (!treeResp.ok) {
      const err = await treeResp.text();
      res.status(500).json({ ok: false, error: 'Failed to get tree', detail: err });
      return;
    }
    const treeJson = await treeResp.json();
    const files = (treeJson?.tree || [])
      .filter(n => n.type === 'blob' && typeof n.path === 'string' && n.path.startsWith('data/trades/') && n.path.endsWith('.json'))
      .map(n => n.path)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // newest first assuming timestamped filenames

    const items = files.map(path => ({
      path,
      url: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
    }));

    res.status(200).json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Unexpected error' });
  }
}

