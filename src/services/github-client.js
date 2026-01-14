// Core GitHub API client functions

export async function githubAPI(endpoint, token = null, options = {}) {
  if (!token) {
    throw new Error('No authentication token available. Please ensure you have a valid GitHub token configured.');
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitPocket-PWA',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response;
}

// Enhanced pagination helper
export async function githubAPIPaginated(endpoint, token = null) {
  const allItems = [];
  let nextUrl = null;
  let currentEndpoint = endpoint;
  let pageCount = 0;

  console.log(`[Pagination] Starting for endpoint: ${endpoint}`);

  while (true) {
    try {
      pageCount++;
      const url = nextUrl || currentEndpoint;
      console.log(`[Pagination] Fetching page ${pageCount}: ${url}`);

      const response = await githubAPI(url, token);

      const linkHeader = response.headers.get('Link') || response.headers.get('link');

      nextUrl = null;
      if (linkHeader) {
        const links = linkHeader.split(',').map(link => link.trim());
        for (const link of links) {
          const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
          if (match && match[2] === 'next') {
            const nextFullUrl = match[1];
            const urlObj = new URL(nextFullUrl);
            nextUrl = `${urlObj.pathname}${urlObj.search}`;
            break;
          }
        }
      }

      const items = await response.json();

      if (Array.isArray(items) && items.length > 0) {
        allItems.push(...items);
        console.log(`[Pagination] Page ${pageCount}: Retrieved ${items.length} items (Total: ${allItems.length})`);

        if (!nextUrl) {
          break;
        }
      } else {
        break;
      }

      if (pageCount > 50) {
        console.warn('[Pagination] Reached safety limit of 50 pages');
        break;
      }
    } catch (error) {
      console.error(`[Pagination] Error on page ${pageCount}:`, error);
      break;
    }
  }

  console.log(`[Pagination] Complete: ${allItems.length} total items from ${pageCount} pages`);
  return allItems;
}
