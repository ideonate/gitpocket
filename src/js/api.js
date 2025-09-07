// GitHub API Helper Functions
import { appState } from './state.js';

export async function githubAPI(endpoint) {
    const response = await fetch(`https://api.github.com${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${appState.token}`,
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
        // Get all repositories the user has access to (not just owned)
        // Note: Cannot use both 'type' and 'affiliation' parameters together per GitHub API
        const userReposResponse = await githubAPI('/user/repos?per_page=100&sort=updated&affiliation=owner%2Ccollaborator%2Corganization_member');
        const userRepos = await userReposResponse.json();
        
        // Get organizations
        const orgs = await fetchUserOrganizations();
        
        // Fetch repositories for each organization
        const orgRepoPromises = orgs.map(async (org) => {
            try {
                const orgReposResponse = await githubAPI(`/orgs/${org.login}/repos?per_page=100&sort=updated`);
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
                const [issuesRes, prsRes] = await Promise.all([
                    githubAPI(`/repos/${repo.full_name}/issues?state=all&per_page=30`),
                    githubAPI(`/repos/${repo.full_name}/pulls?state=all&per_page=30`)
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
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments`);
        appState.comments = await response.json();
    } catch (error) {
        console.error('Failed to load comments:', error);
        appState.comments = [];
    }
}

export async function addComment(commentText, owner, repo, number) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`;
    console.log('Posting comment to:', url);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appState.token}`,
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
                throw new Error(`Permission denied (403): ${errorData.message || 'Please check your token permissions for Issues and Pull requests write access.'}`);
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