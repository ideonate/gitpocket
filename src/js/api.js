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

export async function loadData() {
    document.getElementById('loadingState').style.display = 'block';
    
    try {
        // First get list of repositories the user has access to
        const reposResponse = await githubAPI('/user/repos?per_page=100&type=all&sort=updated');
        const repos = await reposResponse.json();
        
        if (repos.length === 0) {
            appState.issues = [];
            appState.pullRequests = [];
            document.getElementById('issuesCount').textContent = '0';
            document.getElementById('prsCount').textContent = '0';
            
            // Import rendering functions dynamically to avoid circular dependencies
            const { renderIssues, renderPullRequests } = await import('./ui.js');
            renderIssues();
            renderPullRequests();
            document.getElementById('loadingState').style.display = 'none';
            return;
        }
        
        // Load issues and PRs from all repositories
        const allIssues = [];
        const allPRs = [];
        
        // Batch load issues and PRs from repositories
        const repoPromises = repos.slice(0, 20).map(async (repo) => { // Limit to top 20 repos to avoid rate limiting
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
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`, {
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
        throw new Error(errorData.message || 'Failed to add comment');
    }
    
    return response.json();
}