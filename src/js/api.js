// GitHub API Helper Functions
import { appState } from './state.js';
import { tokenManager } from './tokenManager.js';
import { githubAPI, githubAPIPaginated } from './github-client.js';

// Cache management functions
export function clearRepoCache() {
    try {
        localStorage.removeItem('gitpocket_repos_cache');
        console.log('[Cache] Repository cache cleared');
    } catch (e) {
        console.warn('[Cache] Failed to clear repository cache:', e);
    }
}


export async function fetchUserOrganizations() {
    try {
        // Use personal token for user-level API calls
        const personalToken = tokenManager.getPersonalToken();
        const token = personalToken ? personalToken.token : null;
        const orgsResponse = await githubAPI('/user/orgs', token);
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
            // Use personal token for user-level API calls
            const personalToken = tokenManager.getPersonalToken();
            const token = personalToken ? personalToken.token : null;
            const userResponse = await githubAPI('/user', token);
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
                console.log(`[DEBUG] Fetching repos with ${tokenLabel} token: ${token}`);
                // Use /user/repos for all tokens to get both public and private repos accessible to the token
                const endpoint = tokenInfo.orgName ? `/orgs/${tokenLabel}/repos?type=all&sort=updated` : '/user/repos?type=all&sort=updated';
                const repos = await githubAPIPaginated(endpoint, token);
                
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
                console.error(`Failed to fetch repos with ${tokenLabel} token:`, error);
                // Store error state for this token for UI display
                if (tokenInfo.orgName) {
                    const stored = tokenManager.getOrgToken(tokenInfo.orgName);
                    if (stored) {
                        stored.lastError = error.message;
                        stored.lastErrorTime = new Date().toISOString();
                        tokenManager.setOrgToken(tokenInfo.orgName, stored);
                    }
                }
            }
        }

        /*
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
                console.error('Failed to fetch repos with affiliation approach:', error);
                // Store error state for personal token
                const stored = tokenManager.getPersonalToken();
                if (stored) {
                    stored.lastError = error.message;
                    stored.lastErrorTime = new Date().toISOString();
                    tokenManager.setPersonalToken(stored);
                }
            }
        }
        
        console.log(`[DEBUG] Total repos from affiliation spidering: ${allDiscoveredRepos.length}`);
        console.log(`[DEBUG] Discovered organizations: ${Array.from(discoveredOrgs).join(', ')}`);
        
        // 2. Spider through discovered organizations to find more repos 
        // Skip organizations we already fetched with org-specific tokens in step 1
        const existingRepoIds = new Set(allDiscoveredRepos.map(repo => repo.id));
        const orgsAlreadyFetched = new Set(allTokens.filter(t => t.orgName).map(t => t.orgName));
        const orgsToSpider = Array.from(discoveredOrgs).filter(orgName => !orgsAlreadyFetched.has(orgName));
        
        // Only attempt to spider organizations we haven't already fetched
        const orgsWithTokens = orgsToSpider.filter(orgName => tokenManager.getOrgToken(orgName));
        const orgsWithoutTokens = orgsToSpider.filter(orgName => !tokenManager.getOrgToken(orgName));
        
        if (orgsWithoutTokens.length > 0) {
            console.log(`[DEBUG] Skipping org spidering for ${orgsWithoutTokens.length} orgs without specific PATs: ${orgsWithoutTokens.join(', ')} (personal PAT already found all accessible repos)`);
        }
        
        if (orgsAlreadyFetched.size > 0) {
            console.log(`[DEBUG] Already fetched ${orgsAlreadyFetched.size} orgs with their specific tokens: ${Array.from(orgsAlreadyFetched).join(', ')}`);
        }
        
        if (orgsWithTokens.length === 0) {
            console.log(`[DEBUG] No additional organizations to spider`);
        }
        
        for (const orgName of orgsWithTokens) {
            try {
                const orgToken = tokenManager.getOrgToken(orgName);
                const token = orgToken.token;
                
                console.log(`[DEBUG] Spidering additional organization: ${orgName} (with org-specific PAT)`);
                
                // Use /user/repos with the org token to get both public and private repos
                const orgRepos = await githubAPIPaginated('/user/repos?sort=updated', token);
                
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
                console.error(`Failed to spider organization ${orgName}:`, error);
                // Store error state for this org token
                const stored = tokenManager.getOrgToken(orgName);
                if (stored) {
                    stored.lastError = `Failed to fetch org repos: ${error.message}`;
                    stored.lastErrorTime = new Date().toISOString();
                    tokenManager.setOrgToken(orgName, stored);
                }
            }
        } */
        
        console.log(`[DEBUG] Total repos after organization spidering: ${allDiscoveredRepos.length}`);
        
        // 3. Deduplicate repositories by ID
        const deduplicatedRepos = Array.from(new Map(allDiscoveredRepos.map(repo => [repo.id, repo])).values());
        console.log(`[DEBUG] Unique repositories after deduplication: ${deduplicatedRepos.length}`);

        /*
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
                    console.error(`Failed to spider additional org ${org.login}:`, error);
                    // Store error state if we have a token for this org
                    const stored = tokenManager.getOrgToken(org.login);
                    if (stored) {
                        stored.lastError = `Failed to fetch org repos: ${error.message}`;
                        stored.lastErrorTime = new Date().toISOString();
                        tokenManager.setOrgToken(org.login, stored);
                    }
                }
            }
        }
        */
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

export async function refreshSingleRepository(repoFullName, excludeCacheNumber = null) {
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
        
        // Clear last commenter cache before re-rendering
        const { renderIssues, renderPullRequests, clearLastCommenterCacheForRepo, clearLastCommenterCache } = await import('./ui.js');
        // If no excludeCacheNumber, it's a full refresh from the refresh button - clear entire cache
        if (excludeCacheNumber === null) {
            clearLastCommenterCache();
        } else {
            // Selective clear for when we're updating after a comment
            clearLastCommenterCacheForRepo(repoFullName, excludeCacheNumber);
        }
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
            appState.workflowRuns = [];
            document.getElementById('issuesCount').textContent = '0';
            document.getElementById('prsCount').textContent = '0';
            document.getElementById('actionsCount').textContent = '0';

            // Import rendering functions dynamically to avoid circular dependencies
            const { renderIssues, renderPullRequests, renderWorkflowRuns, populateFilterDropdown, clearLastCommenterCache } = await import('./ui.js');
            clearLastCommenterCache();
            renderIssues();
            renderPullRequests();
            renderWorkflowRuns();
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
            if (filterRepo === '__private__') {
                // Filter to show only private repositories
                reposToLoad = repos.filter(repo => repo.private === true);
            } else if (filterRepo === '__public__') {
                // Filter to show only public repositories
                reposToLoad = repos.filter(repo => repo.private === false);
            } else if (filterRepo.includes('/')) {
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
        
        // Load workflow runs from the same repositories
        const allWorkflowRuns = [];

        const workflowPromises = reposToLoad.map(async (repo) => {
            try {
                const runs = await fetchWorkflowRuns(repo.owner.login, repo.name);
                allWorkflowRuns.push(...runs);
            } catch (error) {
                console.warn(`Failed to load workflow runs from ${repo.full_name}:`, error);
            }
        });

        await Promise.all(workflowPromises);

        // Sort workflow runs by created date
        const sortedWorkflowRuns = allWorkflowRuns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Store unfiltered data
        appState.unfilteredIssues = sortedIssues;
        appState.unfilteredPullRequests = sortedPRs;
        appState.unfilteredWorkflowRuns = sortedWorkflowRuns;

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

        // Workflow runs don't have state filter for now
        appState.workflowRuns = sortedWorkflowRuns;

        document.getElementById('issuesCount').textContent = appState.issues.length;
        document.getElementById('prsCount').textContent = appState.pullRequests.length;
        document.getElementById('actionsCount').textContent = appState.workflowRuns.length;

        // Import rendering functions dynamically to avoid circular dependencies
        const { renderIssues, renderPullRequests, renderWorkflowRuns, clearLastCommenterCache } = await import('./ui.js');
        clearLastCommenterCache();
        renderIssues();
        renderPullRequests();
        renderWorkflowRuns();
        
        document.getElementById('loadingState').style.display = 'none';
        
    } catch (error) {
        console.error('Load data error:', error);
        const { showError, showEmptyState } = await import('./ui.js');
        showError('Failed to load data: ' + error.message);
        document.getElementById('loadingState').style.display = 'none';
        showEmptyState('Failed to load data');
    }
}

// Fetch a single issue with fresh data
export async function fetchIssue(owner, repo, number) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}`, token);
        const issue = await response.json();

        // Add repository_name for consistency
        issue.repository_name = `${owner}/${repo}`;

        return issue;
    } catch (error) {
        console.error('Error fetching issue:', error);
        throw error;
    }
}

// Fetch a single PR with fresh data
export async function fetchPullRequest(owner, repo, number) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/pulls/${number}`, token);
        const pr = await response.json();

        // Add repository_name for consistency
        pr.repository_name = `${owner}/${repo}`;

        return pr;
    } catch (error) {
        console.error('Error fetching pull request:', error);
        throw error;
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

// Fetch only the last comment for an issue/PR (for lazy loading indicator)
export async function fetchLastComment(owner, repo, number, author) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=1&sort=created&direction=desc`, token);
        const comments = await response.json();
        
        if (comments && comments.length > 0) {
            return {
                user: comments[0].user.login,
                created_at: comments[0].created_at,
                isAuthorOnly: false
            };
        }
        // If no comments, treat the author as the last commenter
        if (author) {
            return {
                user: author,
                created_at: null,
                isAuthorOnly: true
            };
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch last comment for #${number}:`, error);
        return null;
    }
}

export async function addReaction(owner, repo, id, content, isComment = false) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        if (!token) {
            throw new Error('No authentication token available for this repository. Please add a token.');
        }
        const endpoint = isComment 
            ? `/repos/${owner}/${repo}/issues/comments/${id}/reactions`
            : `/repos/${owner}/${repo}/issues/${id}/reactions`;
        
        const response = await githubAPI(endpoint, token, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Failed to add reaction:', error);
        throw error;
    }
}

export async function removeReaction(owner, repo, reactionId, isComment = false) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        if (!token) {
            throw new Error('No authentication token available for this repository. Please add a token.');
        }
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/reactions/${reactionId}`, token, {
            method: 'DELETE'
        });
        
        return true;
    } catch (error) {
        console.error('Failed to remove reaction:', error);
        throw error;
    }
}

export async function addComment(commentText, owner, repo, number) {
    console.log('Posting comment to:', `/repos/${owner}/${repo}/issues/${number}/comments`);
    
    // Get the appropriate token for this repository
    const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
    console.log(`Using token for repo ${owner}/${repo}:`, token ? 'Found' : 'Not found');
    
    if (!token) {
        throw new Error('No authentication token available for this repository. Please add a token.');
    }
    
    try {
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments`, token, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: commentText })
        });
        
        return response.json();
    } catch (error) {
        // Provide more detailed error messages based on error content
        if (error.message?.includes('403') || error.message?.includes('Permission denied')) {
            if (error.message?.includes('Resource not accessible by integration')) {
                throw new Error('Your token doesn\'t have permission to comment on this repository. Please ensure your token has "Issues" and "Pull requests" write access.');
            } else if (error.message?.includes('Must have admin rights')) {
                throw new Error('You need admin rights to perform this action.');
            } else {
                // Enhanced error message for organization repositories
                const isOrgRepo = owner !== appState.user?.login;
                const orgGuidance = isOrgRepo ? 
                    `\n\n🏢 For organization repositories (${owner}):\n• You may need to add a separate organization token\n• Check if the organization allows your token type\n• Fine-grained PATs may need org approval\n• Try using a Classic PAT if fine-grained doesn't work` : '';
                
                throw new Error(`Permission denied (403): ${error.message || 'Resource not accessible by personal access token'}\n\nℹ️ Required permissions:\n• Issues: Read and Write\n• Pull requests: Read and Write${orgGuidance}`);
            }
        } else if (error.message?.includes('404')) {
            throw new Error('Issue or repository not found. Please check if the repository exists and your token has access to it.');
        } else if (error.message?.includes('401')) {
            throw new Error('Authentication failed. Please check your token is valid and not expired.');
        } else if (error.message?.includes('422')) {
            throw new Error(`Invalid request: ${error.message || 'Please check the comment content.'}`);
        } else {
            throw new Error(error.message || 'Failed to add comment');
        }
    }
}

export async function mergePullRequest(owner, repo, number, mergeMethod = 'merge') {
    const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
    
    if (!token) {
        throw new Error('No authentication token available for this repository. Please add a token.');
    }
    
    const response = await githubAPI(`/repos/${owner}/${repo}/pulls/${number}/merge`, token, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            merge_method: mergeMethod
        })
    });
    
    return response.json();
}

export async function closePullRequest(owner, repo, number) {
    const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
    
    if (!token) {
        throw new Error('No authentication token available for this repository. Please add a token.');
    }
    
    const response = await githubAPI(`/repos/${owner}/${repo}/pulls/${number}`, token, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            state: 'closed'
        })
    });
    
    return response.json();
}

export async function createIssue(owner, repo, issueData) {
    const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
    
    if (!token) {
        throw new Error('No authentication token available for this repository. Please add a token.');
    }
    
    const response = await githubAPI(`/repos/${owner}/${repo}/issues`, token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
    });
    
    return response.json();
}

export async function closeIssue(owner, repo, number, newState = 'closed') {
    const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
    
    if (!token) {
        throw new Error('No authentication token available for this repository. Please add a token.');
    }
    
    const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}`, token, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            state: newState
        })
    });
    
    return response.json();
}

export async function validateToken(token, tokenType = 'unknown', orgName = null) {
    try {
        const response = await githubAPI('/user', token);
        const user = await response.json();
        
        // Check token scopes/type
        const classicScopes = response.headers.get('x-oauth-scopes') || '';
        const acceptedPermissions = response.headers.get('x-accepted-github-permissions') || '';
        
        let tokenInfo = '';
        if (classicScopes) {
            tokenInfo = `Classic PAT with scopes: ${classicScopes}`;
        } else if (acceptedPermissions) {
            tokenInfo = 'Fine-grained PAT (permissions not exposed by API)';
        } else {
            tokenInfo = `${tokenType} PAT`;
        }
        
        // Test repository access
        let repoCount = 0;
        let repoAccessError = null;
        try {
            const repoResponse = await githubAPI('/user/repos?per_page=1', token);
            
            // Get the total count from the Link header if available
            // This is an optimization: by requesting per_page=1, we can extract the total
            // count from the "last" page number in the Link header without fetching all repos
            const linkHeader = repoResponse.headers.get('Link');
            if (linkHeader) {
                const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
                if (lastPageMatch) {
                    repoCount = parseInt(lastPageMatch[1]);
                } else {
                    // No last page, means we have 1 page or less
                    const repos = await repoResponse.json();
                    repoCount = repos.length;
                }
            } else {
                const repos = await repoResponse.json();
                repoCount = repos.length;
            }
        } catch (error) {
            repoAccessError = `Error checking repository access: ${error.message}`;
        }
        
        return {
            valid: true,
            user: user,
            scopes: tokenInfo,
            token: token,
            repoCount: repoCount,
            repoAccessError: repoAccessError
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

// Fetch workflow runs for a repository
export async function fetchWorkflowRuns(owner, repo) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/actions/runs?per_page=30`, token);
        const data = await response.json();

        // Add repository info to each run
        if (data.workflow_runs) {
            data.workflow_runs.forEach(run => {
                run.repository_name = `${owner}/${repo}`;
            });
        }

        return data.workflow_runs || [];
    } catch (error) {
        console.warn(`Failed to fetch workflow runs from ${owner}/${repo}:`, error);
        return [];
    }
}

// Load workflow runs from all repositories
export async function loadWorkflowRuns(filterRepo = null, forceRefresh = false) {
    try {
        // Get all repositories
        const repos = appState.allRepositories || await fetchAllRepositories(forceRefresh);

        if (repos.length === 0) {
            return [];
        }

        // Filter repositories if filterRepo is specified
        let reposToLoad = repos;
        if (filterRepo) {
            if (filterRepo === '__private__') {
                reposToLoad = repos.filter(repo => repo.private === true);
            } else if (filterRepo === '__public__') {
                reposToLoad = repos.filter(repo => repo.private === false);
            } else if (filterRepo.includes('/')) {
                reposToLoad = repos.filter(repo => repo.full_name === filterRepo);
            } else {
                reposToLoad = repos.filter(repo => {
                    const owner = repo.owner.login;
                    return owner === filterRepo || repo.org === filterRepo;
                });
            }
        }

        // Load workflow runs from filtered repositories
        const allRuns = [];

        const repoPromises = reposToLoad.map(async (repo) => {
            try {
                const runs = await fetchWorkflowRuns(repo.owner.login, repo.name);
                allRuns.push(...runs);
            } catch (error) {
                console.warn(`Failed to load workflow runs from ${repo.full_name}:`, error);
            }
        });

        await Promise.all(repoPromises);

        // Sort by created_at date (most recent first)
        const sortedRuns = allRuns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return sortedRuns;
    } catch (error) {
        console.error('Load workflow runs error:', error);
        return [];
    }
}

// Fetch workflow details to check if it supports workflow_dispatch
export async function fetchWorkflow(owner, repo, workflowId) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/actions/workflows/${workflowId}`, token);
        const workflow = await response.json();
        return workflow;
    } catch (error) {
        console.warn(`Failed to fetch workflow ${workflowId} from ${owner}/${repo}:`, error);
        throw error;
    }
}

// Fetch workflow file content to check for workflow_dispatch trigger
export async function checkWorkflowDispatchSupport(owner, repo, workflowPath) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        const response = await githubAPI(`/repos/${owner}/${repo}/contents/${workflowPath}`, token);
        const data = await response.json();

        // Decode the base64 content
        const content = atob(data.content);

        // Check if workflow_dispatch is configured as a trigger
        // It needs to be in the 'on:' section, not just mentioned anywhere in the file
        // Look for patterns like:
        //   on: workflow_dispatch
        //   on: [workflow_dispatch, ...]
        //   on:
        //     workflow_dispatch:
        const onSectionRegex = /^on:\s*$/m;
        const onInlineRegex = /^on:\s*(\[.*workflow_dispatch.*\]|workflow_dispatch)/m;
        const workflowDispatchTriggerRegex = /^\s{2,}workflow_dispatch:/m;

        // Check if there's an 'on:' section
        const onMatch = content.match(onSectionRegex);
        if (onMatch) {
            // Multi-line 'on:' section - check if workflow_dispatch is listed as a trigger
            const onIndex = onMatch.index;
            const afterOn = content.substring(onIndex);

            // workflow_dispatch should be indented under 'on:'
            if (workflowDispatchTriggerRegex.test(afterOn)) {
                return true;
            }
        }

        // Check for inline 'on:' definition
        if (onInlineRegex.test(content)) {
            return true;
        }

        return false;
    } catch (error) {
        console.warn(`Failed to check workflow_dispatch support for ${workflowPath}:`, error);
        return false;
    }
}

// Trigger a workflow dispatch event
export async function triggerWorkflowDispatch(owner, repo, workflowId, ref, inputs = {}) {
    try {
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);

        if (!token) {
            throw new Error('No authentication token available for this repository. Please add a token.');
        }

        const response = await githubAPI(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, token, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: ref,
                inputs: inputs
            })
        });

        // The API returns 204 No Content on success
        if (response.status === 204) {
            return { success: true };
        } else {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.error('Failed to trigger workflow dispatch:', error);
        throw error;
    }
}
