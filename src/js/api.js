// GitHub API Helper Functions
import { appState } from './state.js';
import { tokenManager } from './tokenManager.js';

// Cache management functions
export function clearRepoCache() {
    try {
        localStorage.removeItem('gitpocket_repos_cache');
        console.log('[Cache] Repository cache cleared');
    } catch (e) {
        console.warn('[Cache] Failed to clear repository cache:', e);
    }
}

export async function githubAPI(endpoint, token = null, options = {}) {
    // Use provided token or fall back to appState.token
    const authToken = token || appState.token;
    
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

export async function fetchUserOrganizations() {
    try {
        const orgsResponse = await githubAPI('/user/orgs');
        const orgs = await orgsResponse.json();
        return orgs;
    } catch (error) {
        console.warn('Failed to fetch organizations:', error);
        return [];
    }
}

export async function fetchAllRepositories(forceRefresh = false) {
    try {
        // Check cache first
        if (!forceRefresh) {
            const cachedData = localStorage.getItem('gitpocket_repos_cache');
            if (cachedData) {
                try {
                    const cache = JSON.parse(cachedData);
                    // Check if cache is still valid (24 hours)
                    const cacheAge = Date.now() - cache.timestamp;
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                    
                    if (cacheAge < maxAge) {
                        console.log('[fetchAllRepositories] Using cached repositories:', cache.repos.length);
                        return cache.repos;
                    } else {
                        console.log('[fetchAllRepositories] Cache expired, fetching fresh data');
                    }
                } catch (e) {
                    console.warn('[fetchAllRepositories] Invalid cache data, fetching fresh');
                }
            }
        }
        
        console.log('[fetchAllRepositories] Starting repository fetch');
        
        // First, let's check what our token can actually access
        console.log('[DEBUG] Checking token permissions...');
        try {
            const userResponse = await githubAPI('/user');
            const user = await userResponse.json();
            console.log(`[DEBUG] Authenticated as: ${user.login}`);
            console.log(`[DEBUG] Account type: ${user.type}`);
            console.log(`[DEBUG] Public repos: ${user.public_repos}`);
            console.log(`[DEBUG] Private repos: ${user.total_private_repos || 'N/A'}`);
            console.log(`[DEBUG] Plan: ${user.plan?.name || 'Unknown'}`);
        } catch (error) {
            console.warn('[DEBUG] Could not fetch user info:', error);
        }
        
        // Strategy: Spider through different affiliation types and organizations to find more repos
        console.log('[DEBUG] Spidering strategy: separate calls for each affiliation type');
        
        const allDiscoveredRepos = [];
        const discoveredOrgs = new Set();
        
        // 1. Get all available tokens to use for comprehensive spidering
        const allTokens = tokenManager.getAllTokens();
        console.log(`[DEBUG] Available tokens: personal + ${allTokens.filter(t => t.orgName).length} org-specific`);
        
        // 2. Use each token to get repos (personal token gets general repos, org tokens get org-specific repos)
        for (const tokenInfo of allTokens) {
            const tokenLabel = tokenInfo.orgName || 'personal';
            const token = tokenInfo.token;
            
            try {
                console.log(`[DEBUG] Fetching repos with ${tokenLabel} token`);
                const repos = await githubAPIPaginated('/user/repos?type=all&sort=updated', token);
                
                // Analyze repo visibility
                const publicCount = repos.filter(repo => !repo.private).length;
                const privateCount = repos.filter(repo => repo.private).length;
                console.log(`[DEBUG] ${tokenLabel} token: ${repos.length} total (${publicCount} public, ${privateCount} private)`);
                
                allDiscoveredRepos.push(...repos);
                
                // Collect organization names for later spidering
                repos.forEach(repo => {
                    if (repo.owner && repo.owner.type === 'Organization') {
                        discoveredOrgs.add(repo.owner.login);
                    }
                });
            } catch (error) {
                console.warn(`Failed to fetch repos with ${tokenLabel} token:`, error);
            }
        }
        
        // 3. Also try the traditional affiliation approach with personal token for comparison
        const personalToken = tokenManager.getPersonalToken();
        if (personalToken) {
            try {
                console.log(`[DEBUG] Fetching repos with affiliation approach (personal token)`);
                const repos = await githubAPIPaginated('/user/repos?sort=updated&affiliation=owner,collaborator,organization_member', personalToken.token);
                const publicCount = repos.filter(repo => !repo.private).length;
                const privateCount = repos.filter(repo => repo.private).length;
                console.log(`[DEBUG] affiliation approach: ${repos.length} total (${publicCount} public, ${privateCount} private)`);
                allDiscoveredRepos.push(...repos);
            } catch (error) {
                console.warn('Failed to fetch repos with affiliation approach:', error);
            }
        }
        
        console.log(`[DEBUG] Total repos from affiliation spidering: ${allDiscoveredRepos.length}`);
        console.log(`[DEBUG] Discovered organizations: ${Array.from(discoveredOrgs).join(', ')}`);
        
        // 2. Spider through discovered organizations to find more repos (ONLY if we have org-specific PATs)
        const existingRepoIds = new Set(allDiscoveredRepos.map(repo => repo.id));
        const orgsWithTokens = Array.from(discoveredOrgs).filter(orgName => tokenManager.getOrgToken(orgName));
        const orgsWithoutTokens = Array.from(discoveredOrgs).filter(orgName => !tokenManager.getOrgToken(orgName));
        
        if (orgsWithoutTokens.length > 0) {
            console.log(`[DEBUG] Skipping org spidering for ${orgsWithoutTokens.length} orgs without specific PATs: ${orgsWithoutTokens.join(', ')} (personal PAT already found all accessible repos)`);
        }
        
        if (orgsWithTokens.length === 0) {
            console.log(`[DEBUG] No org-specific PATs available - skipping all organization spidering`);
        }
        
        for (const orgName of orgsWithTokens) {
            try {
                const orgToken = tokenManager.getOrgToken(orgName);
                const token = orgToken.token;
                
                console.log(`[DEBUG] Spidering organization: ${orgName} (with org-specific PAT)`);
                
                const orgRepos = await githubAPIPaginated(`/orgs/${orgName}/repos?sort=updated`, token);
                
                // Check how many are actually new
                const newRepos = orgRepos.filter(repo => !existingRepoIds.has(repo.id));
                const duplicateCount = orgRepos.length - newRepos.length;
                
                console.log(`[DEBUG] Organization ${orgName}: ${orgRepos.length} total repos (${newRepos.length} new, ${duplicateCount} already found)`);
                
                if (newRepos.length > 0) {
                    console.log(`[DEBUG] New repos found in ${orgName}:`, newRepos.map(r => r.name).slice(0, 5).join(', ') + (newRepos.length > 5 ? '...' : ''));
                }
                
                // Add org marker to repos and update our tracking
                const markedRepos = orgRepos.map(repo => ({...repo, org: orgName}));
                allDiscoveredRepos.push(...markedRepos);
                
                // Update existing repo IDs for next iteration
                newRepos.forEach(repo => existingRepoIds.add(repo.id));
                
            } catch (error) {
                console.warn(`Failed to spider organization ${orgName}:`, error);
            }
        }
        
        console.log(`[DEBUG] Total repos after organization spidering: ${allDiscoveredRepos.length}`);
        
        // 3. Deduplicate repositories by ID
        const deduplicatedRepos = Array.from(new Map(allDiscoveredRepos.map(repo => [repo.id, repo])).values());
        console.log(`[DEBUG] Unique repositories after deduplication: ${deduplicatedRepos.length}`);
        
        // 4. Also check user's organizations in case we missed any
        const orgs = await fetchUserOrganizations();
        console.log(`[DEBUG] Additional organizations from /user/orgs: ${orgs.length}`);
        
        for (const org of orgs) {
            if (!discoveredOrgs.has(org.login)) {
                try {
                    console.log(`[DEBUG] Additional org spidering: ${org.login}`);
                    const orgToken = tokenManager.getOrgToken(org.login);
                    const token = orgToken ? orgToken.token : null;
                    const orgRepos = await githubAPIPaginated(`/orgs/${org.login}/repos?sort=updated`, token);
                    console.log(`[DEBUG] Additional org ${org.login}: ${orgRepos.length} repos`);
                    
                    const markedRepos = orgRepos.map(repo => ({...repo, org: org.login}));
                    allDiscoveredRepos.push(...markedRepos);
                    discoveredOrgs.add(org.login);
                } catch (error) {
                    console.warn(`Failed to spider additional org ${org.login}:`, error);
                }
            }
        }
        
        // 5. Final deduplication
        const uniqueRepos = Array.from(new Map(allDiscoveredRepos.map(repo => [repo.id, repo])).values());
        console.log(`[fetchAllRepositories] FINAL RESULT: ${uniqueRepos.length} unique repositories`);
        console.log(`[fetchAllRepositories] Organizations spidered: ${discoveredOrgs.size}`);
        
        // Sort by updated date
        const sortedRepos = uniqueRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        // Save to cache
        try {
            const cacheData = {
                repos: sortedRepos,
                timestamp: Date.now()
            };
            localStorage.setItem('gitpocket_repos_cache', JSON.stringify(cacheData));
            console.log('[fetchAllRepositories] Saved repositories to cache');
        } catch (e) {
            console.warn('[fetchAllRepositories] Failed to save cache:', e);
        }
        
        return sortedRepos;
    } catch (error) {
        console.error('Failed to fetch repositories:', error);
        return [];
    }
}

export async function refreshSingleRepository(repoFullName) {
    try {
        console.log(`[Selective Refresh] Refreshing data for repository: ${repoFullName}`);
        
        // Get the repository object
        const repo = appState.allRepositories?.find(r => r.full_name === repoFullName);
        if (!repo) {
            console.warn(`[Selective Refresh] Repository ${repoFullName} not found in cache`);
            return false;
        }
        
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(repo.full_name);
        
        // Fetch fresh issues and PRs for this repository
        const [issuesRes, prsRes] = await Promise.all([
            githubAPI(`/repos/${repo.full_name}/issues?state=all&per_page=30`, token),
            githubAPI(`/repos/${repo.full_name}/pulls?state=all&per_page=30`, token)
        ]);
        
        const freshIssues = await issuesRes.json();
        const freshPRs = await prsRes.json();
        
        // Filter out pull requests from issues (GitHub API includes PRs in issues)
        const realFreshIssues = freshIssues.filter(issue => !issue.pull_request);
        
        // Add repository info to each item
        realFreshIssues.forEach(issue => {
            issue.repository_name = repo.full_name;
            issue.repository_url = repo.url;
        });
        
        freshPRs.forEach(pr => {
            pr.repository_name = repo.full_name;
            pr.repository_url = repo.url;
        });
        
        // Remove old issues/PRs from this repository and add fresh ones
        const otherIssues = appState.unfilteredIssues.filter(i => i.repository_name !== repoFullName);
        const otherPRs = appState.unfilteredPullRequests.filter(pr => pr.repository_name !== repoFullName);
        
        // Combine and sort
        const updatedIssues = [...otherIssues, ...realFreshIssues].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        const updatedPRs = [...otherPRs, ...freshPRs].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        // Update app state with unfiltered data
        appState.unfilteredIssues = updatedIssues;
        appState.unfilteredPullRequests = updatedPRs;
        
        // Apply current state filter
        if (appState.stateFilter === 'open') {
            appState.issues = updatedIssues.filter(issue => issue.state === 'open');
            appState.pullRequests = updatedPRs.filter(pr => pr.state === 'open');
        } else if (appState.stateFilter === 'closed') {
            appState.issues = updatedIssues.filter(issue => issue.state === 'closed');
            appState.pullRequests = updatedPRs.filter(pr => pr.state === 'closed');
        } else {
            appState.issues = updatedIssues;
            appState.pullRequests = updatedPRs;
        }
        
        // Apply repository filter if active
        if (appState.filterRepo) {
            if (appState.filterRepo.includes('/')) {
                // Specific repo filter
                appState.issues = appState.issues.filter(i => i.repository_name === appState.filterRepo);
                appState.pullRequests = appState.pullRequests.filter(pr => pr.repository_name === appState.filterRepo);
            } else {
                // Organization filter
                appState.issues = appState.issues.filter(i => {
                    const owner = i.repository_name?.split('/')[0];
                    return owner === appState.filterRepo;
                });
                appState.pullRequests = appState.pullRequests.filter(pr => {
                    const owner = pr.repository_name?.split('/')[0];
                    return owner === appState.filterRepo;
                });
            }
        }
        
        // Update counts
        document.getElementById('issuesCount').textContent = appState.issues.length;
        document.getElementById('prsCount').textContent = appState.pullRequests.length;
        
        // Re-render the lists
        const { renderIssues, renderPullRequests } = await import('./ui.js');
        renderIssues();
        renderPullRequests();
        
        console.log(`[Selective Refresh] Successfully refreshed ${repoFullName}`);
        return true;
        
    } catch (error) {
        console.error(`[Selective Refresh] Failed to refresh ${repoFullName}:`, error);
        return false;
    }
}

export async function loadData(filterRepo = null, forceRefresh = false) {
    document.getElementById('loadingState').style.display = 'block';
    
    try {
        // Get all repositories
        const repos = await fetchAllRepositories(forceRefresh);
        
        // Store all repos in app state for filtering
        appState.allRepositories = repos;
        
        if (repos.length === 0) {
            appState.issues = [];
            appState.pullRequests = [];
            document.getElementById('issuesCount').textContent = '0';
            document.getElementById('prsCount').textContent = '0';
            
            // Import rendering functions dynamically to avoid circular dependencies
            const { renderIssues, renderPullRequests, populateFilterDropdown } = await import('./ui.js');
            renderIssues();
            renderPullRequests();
            document.getElementById('loadingState').style.display = 'none';
            return;
        }
        
        // Populate filter dropdown
        const { populateFilterDropdown } = await import('./ui.js');
        populateFilterDropdown(repos);
        
        // Store the current filter in app state
        appState.filterRepo = filterRepo;
        
        // Filter repositories if filterRepo is specified
        let reposToLoad = repos;
        if (filterRepo) {
            if (filterRepo.includes('/')) {
                // Filter by specific repo (org/repo format)
                reposToLoad = repos.filter(repo => repo.full_name === filterRepo);
            } else {
                // Filter by organization
                reposToLoad = repos.filter(repo => {
                    const owner = repo.owner.login;
                    return owner === filterRepo || repo.org === filterRepo;
                });
            }
        }
        
        // Load issues and PRs from filtered repositories
        const allIssues = [];
        const allPRs = [];
        
        // Batch load issues and PRs from repositories
        // Load from all repositories but still limit issues/PRs per repo for performance
        const repoPromises = reposToLoad.map(async (repo) => {
            try {
                // Get the appropriate token for this repository
                const token = tokenManager.getTokenForRepo(repo.full_name);
                const [issuesRes, prsRes] = await Promise.all([
                    githubAPI(`/repos/${repo.full_name}/issues?state=all&per_page=30`, token),
                    githubAPI(`/repos/${repo.full_name}/pulls?state=all&per_page=30`, token)
                ]);
                
                const issues = await issuesRes.json();
                const prs = await prsRes.json();
                
                // Filter out pull requests from issues (GitHub API includes PRs in issues)
                const realIssues = issues.filter(issue => !issue.pull_request);
                
                // Add repository info to each item
                realIssues.forEach(issue => {
                    issue.repository_name = repo.full_name;
                    issue.repository_url = repo.url;
                });
                
                prs.forEach(pr => {
                    pr.repository_name = repo.full_name;
                    pr.repository_url = repo.url;
                });
                
                allIssues.push(...realIssues);
                allPRs.push(...prs);
            } catch (error) {
                console.warn(`Failed to load data from ${repo.full_name}:`, error);
            }
        });
        
        await Promise.all(repoPromises);
        
        // Sort by updated date
        const sortedIssues = allIssues.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        const sortedPRs = allPRs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        // Collect unique usernames from issues and PRs for assignee suggestions
        appState.suggestedAssignees.clear();
        [...sortedIssues, ...sortedPRs].forEach(item => {
            // Add the creator username
            if (item.user && item.user.login) {
                appState.suggestedAssignees.add(item.user.login);
            }
            // Add assignee usernames
            if (item.assignees && Array.isArray(item.assignees)) {
                item.assignees.forEach(assignee => {
                    if (assignee.login) {
                        appState.suggestedAssignees.add(assignee.login);
                    }
                });
            }
            // Add single assignee if present
            if (item.assignee && item.assignee.login) {
                appState.suggestedAssignees.add(item.assignee.login);
            }
        });
        
        // Store unfiltered data
        appState.unfilteredIssues = sortedIssues;
        appState.unfilteredPullRequests = sortedPRs;
        
        // Apply state filter
        if (appState.stateFilter === 'open') {
            appState.issues = sortedIssues.filter(issue => issue.state === 'open');
            appState.pullRequests = sortedPRs.filter(pr => pr.state === 'open');
        } else if (appState.stateFilter === 'closed') {
            appState.issues = sortedIssues.filter(issue => issue.state === 'closed');
            appState.pullRequests = sortedPRs.filter(pr => pr.state === 'closed');
        } else {
            // 'all' or undefined
            appState.issues = sortedIssues;
            appState.pullRequests = sortedPRs;
        }
        
        document.getElementById('issuesCount').textContent = appState.issues.length;
        document.getElementById('prsCount').textContent = appState.pullRequests.length;
        
        // Import rendering functions dynamically to avoid circular dependencies
        const { renderIssues, renderPullRequests } = await import('./ui.js');
        renderIssues();
        renderPullRequests();
        
        document.getElementById('loadingState').style.display = 'none';
        
    } catch (error) {
        console.error('Load data error:', error);
        const { showError, showEmptyState } = await import('./ui.js');
        showError('Failed to load data: ' + error.message);
        document.getElementById('loadingState').style.display = 'none';
        showEmptyState('Failed to load data');
    }
}

export async function loadComments(owner, repo, number) {
    try {
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments`, token);
        const comments = await response.json();
        
        // Fetch reactions for each comment in parallel
        const commentsWithReactions = await Promise.all(comments.map(async (comment) => {
            try {
                const reactionsResponse = await githubAPI(`/repos/${owner}/${repo}/issues/comments/${comment.id}/reactions`, token);
                const reactions = await reactionsResponse.json();
                return { ...comment, reactions };
            } catch (error) {
                console.warn(`Failed to load reactions for comment ${comment.id}:`, error);
                return { ...comment, reactions: [] };
            }
        }));
        
        appState.comments = commentsWithReactions;
    } catch (error) {
        console.error('Failed to load comments:', error);
        appState.comments = [];
    }
}

export async function loadIssueReactions(owner, repo, number) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/reactions`, token);
        return await response.json();
    } catch (error) {
        console.error('Failed to load issue reactions:', error);
        return [];
    }
}

export async function addReaction(owner, repo, id, content, isComment = false) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const endpoint = isComment 
            ? `/repos/${owner}/${repo}/issues/comments/${id}/reactions`
            : `/repos/${owner}/${repo}/issues/${id}/reactions`;
        
        const response = await fetch(`https://api.github.com${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token || appState.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to add reaction: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Failed to add reaction:', error);
        throw error;
    }
}

export async function removeReaction(owner, repo, reactionId, isComment = false) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/reactions/${reactionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token || appState.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        
        if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to remove reaction: ${response.status}`);
        }
        
        return true;
    } catch (error) {
        console.error('Failed to remove reaction:', error);
        throw error;
    }
}

export async function addComment(commentText, owner, repo, number) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`;
    console.log('Posting comment to:', url);
    
    // Get the appropriate token for this repository
    const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
    console.log(`Using token for repo ${owner}/${repo}:`, token ? 'Found' : 'Not found, using default');
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token || appState.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': 'GitHub-Manager-PWA'
        },
        body: JSON.stringify({ body: commentText })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Comment API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            url: url
        });
        
        // Provide more detailed error messages based on status code
        if (response.status === 403) {
            if (errorData.message?.includes('Resource not accessible by integration')) {
                throw new Error('Your token doesn\'t have permission to comment on this repository. Please ensure your token has "Issues" and "Pull requests" write access.');
            } else if (errorData.message?.includes('Must have admin rights')) {
                throw new Error('You need admin rights to perform this action.');
            } else {
                // Enhanced error message for organization repositories
                const isOrgRepo = owner !== appState.user?.login;
                const orgGuidance = isOrgRepo ? 
                    `\n\n🏢 For organization repositories (${owner}):\n• You may need to add a separate organization token\n• Check if the organization allows your token type\n• Fine-grained PATs may need org approval\n• Try using a Classic PAT if fine-grained doesn't work` : '';
                
                throw new Error(`Permission denied (403): ${errorData.message || 'Resource not accessible by personal access token'}\n\nℹ️ Required permissions:\n• Issues: Read and Write\n• Pull requests: Read and Write${orgGuidance}\n\nComment URL: ${url}`);
            }
        } else if (response.status === 404) {
            throw new Error('Issue or repository not found. Please check if the repository exists and your token has access to it.');
        } else if (response.status === 401) {
            throw new Error('Authentication failed. Please check your token is valid and not expired.');
        } else if (response.status === 422) {
            throw new Error(`Invalid request: ${errorData.message || 'Please check the comment content.'}`);
        } else {
            throw new Error(errorData.message || `Failed to add comment (${response.status})`);
        }
    }
    
    return response.json();
}