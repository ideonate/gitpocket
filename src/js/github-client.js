// Core GitHub API client functions

export async function githubAPI(endpoint, token = null, options = {}) {
    // Use provided token or fall back to personal token from tokenManager
    let authToken = token;
    if (!authToken) {
        // Lazy load tokenManager to avoid circular dependency
        try {
            const { tokenManager } = await import('./tokenManager.js');
            const personalToken = tokenManager.getPersonalToken();
            authToken = personalToken?.token;
        } catch (e) {
            // If import fails, token remains null
            console.warn('Failed to load tokenManager for fallback token');
        }
    }
    
    if (!authToken) {
        throw new Error('No authentication token available. Please ensure you have a valid GitHub token configured.');
    }
    
    const response = await fetch(`https://api.github.com${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GitHub-Manager-PWA',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    return response;
}

// Enhanced pagination helper with better debugging
export async function githubAPIPaginated(endpoint, token = null) {
    const allItems = [];
    let nextUrl = null;
    let currentEndpoint = endpoint;
    let pageCount = 0;
    
    console.log(`[Pagination] Starting for endpoint: ${endpoint}`);
    
    // IMPORTANT: Do NOT add our own per_page parameter unless it already exists
    // GitHub will use its default, and we'll follow the Link headers
    
    while (true) {
        try {
            pageCount++;
            
            // Use the next URL from Link header if available, otherwise use current endpoint
            const url = nextUrl || currentEndpoint;
            console.log(`[Pagination] Fetching page ${pageCount}: ${url}`);
            
            const response = await githubAPI(url, token);
            
            // Check Link header for next page
            const linkHeader = response.headers.get('Link') || response.headers.get('link');
            console.log(`[Pagination] Page ${pageCount} - Link header:`, linkHeader ? 'Present' : 'Not found');
            if (linkHeader) {
                console.log(`[Pagination] Raw Link header: ${linkHeader}`);
            }
            
            // Parse Link header to find next URL
            nextUrl = null;
            if (linkHeader) {
                const links = linkHeader.split(',').map(link => link.trim());
                for (const link of links) {
                    const match = link.match(/<([^>]+)>;\s*rel="([^"]+)"/);
                    if (match && match[2] === 'next') {
                        // Extract just the path and query from the full URL
                        const nextFullUrl = match[1];
                        const urlObj = new URL(nextFullUrl);
                        nextUrl = `${urlObj.pathname}${urlObj.search}`;
                        console.log(`[Pagination] Found next page URL: ${nextUrl}`);
                        break;
                    }
                }
            }
            
            const items = await response.json();
            
            if (Array.isArray(items) && items.length > 0) {
                allItems.push(...items);
                console.log(`[Pagination] Page ${pageCount}: Retrieved ${items.length} items (Total: ${allItems.length})`);
                
                // Continue if we have a next URL from Link header
                if (!nextUrl) {
                    // If no Link header or no next link, we're done
                    console.log(`[Pagination] No next page found, ending pagination`);
                    break;
                }
            } else {
                console.log(`[Pagination] Page ${pageCount}: No items returned, ending pagination`);
                break;
            }
            
            // Safety limit
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