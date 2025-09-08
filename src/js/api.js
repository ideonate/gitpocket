// GitHub API Helper Functions
import { appState } from './state.js';
import { tokenManager } from './tokenManager.js';

export async function githubAPI(endpoint, token = null) {
    // Use provided token or fall back to appState.token
    const authToken = token || appState.token;
    
    const response = await fetch(`https://api.github.com${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GitHub-Manager-PWA'
        }
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    return response;
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

export async function fetchAllRepositories() {
    try {
        // Get all repositories the user has access to (public and private)
        // Using type=all to include all accessible repositories
        const userReposResponse = await githubAPI('/user/repos?type=all&per_page=100&sort=updated');
        const userRepos = await userReposResponse.json();
        
        // Get organizations
        const orgs = await fetchUserOrganizations();
        
        // Fetch repositories for each organization
        const orgRepoPromises = orgs.map(async (org) => {
            try {
                // Use org-specific token if available
                const orgToken = tokenManager.getOrgToken(org.login);
                const token = orgToken ? orgToken.token : null;
                const orgReposResponse = await githubAPI(`/orgs/${org.login}/repos?per_page=100&sort=updated`, token);
                const orgRepos = await orgReposResponse.json();
                return orgRepos.map(repo => ({...repo, org: org.login}));
            } catch (error) {
                console.warn(`Failed to fetch repos for org ${org.login}:`, error);
                return [];
            }
        });
        
        const orgReposArrays = await Promise.all(orgRepoPromises);
        const orgRepos = orgReposArrays.flat();
        
        // Combine and deduplicate repositories
        const allRepos = [...userRepos, ...orgRepos];
        const uniqueRepos = Array.from(new Map(allRepos.map(repo => [repo.id, repo])).values());
        
        // Sort by updated date
        return uniqueRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    } catch (error) {
        console.error('Failed to fetch repositories:', error);
        return [];
    }
}

export async function loadData(filterRepo = null) {
    document.getElementById('loadingState').style.display = 'block';
    
    try {
        // Get all repositories
        const repos = await fetchAllRepositories();
        
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
        const repoPromises = reposToLoad.slice(0, 30).map(async (repo) => { // Increased limit to 30 repos
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
        appState.issues = allIssues.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        appState.pullRequests = allPRs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
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