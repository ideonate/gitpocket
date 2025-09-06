// UI Rendering and Interaction Functions
import { appState } from './state.js';
import { loadComments, addComment as apiAddComment } from './api.js';

// Utility Functions
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function showError(message) {
    showMessage(message, 'error');
}

export function showSuccess(message) {
    showMessage(message, 'success');
}

export function showMessage(message, type) {
    const toast = document.getElementById('messageToast');
    toast.textContent = message;
    toast.className = `message ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

export function showEmptyState(message) {
    document.getElementById('issuesContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div>${message}</div>
        </div>
    `;
    document.getElementById('prsContent').innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div>${message}</div>
        </div>
    `;
}

// Rendering Functions
export function renderIssues() {
    const container = document.getElementById('issuesContent');
    
    if (appState.issues.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🐛</div>
                <div>No issues found</div>
                <div style="font-size: 14px; margin-top: 8px; color: #999;">
                    Check your repository permissions
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.issues.map(issue => {
        // Use repository_name if available, otherwise extract from URL
        const repoName = issue.repository_name || (issue.repository_url ? issue.repository_url.split('/').slice(-2).join('/') : 'Unknown');
        
        return `
            <div class="issue-card" onclick="window.showIssueDetail('${issue.id}')">
                <div class="card-header">
                    <div>
                        <div class="issue-number">#${issue.number}</div>
                        <div style="font-size: 11px; color: #999; margin-top: 2px;">${repoName}</div>
                    </div>
                    <div class="status-badge status-${issue.state}">
                        ${issue.state === 'open' ? '🐛' : '✅'} ${issue.state.toUpperCase()}
                    </div>
                </div>
                <div class="card-title">${escapeHtml(issue.title)}</div>
                ${issue.body ? `<div class="card-body">${escapeHtml(issue.body.substring(0, 100))}${issue.body.length > 100 ? '...' : ''}</div>` : ''}
                <div class="card-footer">
                    <div>by ${issue.user.login}</div>
                    <div>💬 ${issue.comments}</div>
                </div>
            </div>
        `;
    }).join('');
}

export function renderPullRequests() {
    const container = document.getElementById('prsContent');
    
    if (appState.pullRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <div>No pull requests found</div>
                <div style="font-size: 14px; margin-top: 8px; color: #999;">
                    Check your repository permissions
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.pullRequests.map(pr => {
        // Use repository_name if available, otherwise extract from URL
        const repoName = pr.repository_name || (pr.repository_url ? pr.repository_url.split('/').slice(-2).join('/') : 'Unknown');
        
        return `
            <div class="pr-card" onclick="window.showPRDetail('${pr.id}')">
                <div class="card-header">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="issue-number">#${pr.number}</div>
                            ${pr.draft ? '<div class="status-badge status-draft">DRAFT</div>' : ''}
                        </div>
                        <div style="font-size: 11px; color: #999; margin-top: 2px;">${repoName}</div>
                    </div>
                    <div class="status-badge status-${pr.state}">
                        🔄 ${pr.state.toUpperCase()}
                    </div>
                </div>
                <div class="card-title">${escapeHtml(pr.title)}</div>
                ${pr.body ? `<div class="card-body">${escapeHtml(pr.body.substring(0, 100))}${pr.body.length > 100 ? '...' : ''}</div>` : ''}
                <div class="card-footer">
                    <div>by ${pr.user.login}</div>
                    <div>Updated ${new Date(pr.updated_at).toLocaleDateString()}</div>
                </div>
            </div>
        `;
    }).join('');
}

export function renderDetail(item) {
    const content = document.getElementById('detailContent');
    
    content.innerHTML = `
        <div class="detail-card">
            <div class="card-header">
                <div class="status-badge status-${item.state}">
                    ${item.state === 'open' ? (item.pull_request ? '🔄' : '🐛') : '✅'} ${item.state.toUpperCase()}
                </div>
                <div style="font-size: 12px; color: #999;">
                    Created ${new Date(item.created_at).toLocaleDateString()}
                </div>
            </div>
            <div class="detail-title">${escapeHtml(item.title)}</div>
            <div class="detail-meta">by ${item.user.login}</div>
            ${item.body ? `<div class="detail-body">${escapeHtml(item.body)}</div>` : '<div class="detail-body" style="color: #999; font-style: italic;">No description provided</div>'}
        </div>
        
        ${appState.comments.map(comment => `
            <div class="comment-card">
                <div class="comment-header">
                    <div class="comment-author">${comment.user.login}</div>
                    <div class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</div>
                </div>
                <div class="comment-body">${escapeHtml(comment.body)}</div>
            </div>
        `).join('')}
        
        ${appState.comments.length === 0 ? '<div style="text-align: center; color: #999; padding: 32px;">No comments yet</div>' : ''}
    `;
}

// Detail Views
export async function showIssueDetail(id) {
    try {
        const issue = appState.issues.find(i => i.id == id);
        if (!issue) return;
        
        appState.currentItem = issue;
        document.getElementById('detailTitle').textContent = `Issue #${issue.number}`;
        
        // Extract owner and repo from repository_name or repository_url
        const [owner, repo] = issue.repository_name ? issue.repository_name.split('/') : issue.repository_url.split('/').slice(-2);
        
        // Load comments
        await loadComments(owner, repo, issue.number);
        
        renderDetail(issue);
        showDetail();
    } catch (error) {
        console.error('Error showing issue detail:', error);
        showError('Failed to load issue details');
    }
}

export async function showPRDetail(id) {
    try {
        const pr = appState.pullRequests.find(p => p.id == id);
        if (!pr) return;
        
        appState.currentItem = pr;
        document.getElementById('detailTitle').textContent = `PR #${pr.number}`;
        
        // Extract owner and repo from repository_name or repository_url
        const [owner, repo] = pr.repository_name ? pr.repository_name.split('/') : pr.repository_url.split('/').slice(-2);
        
        // Load comments
        await loadComments(owner, repo, pr.number);
        
        renderDetail(pr);
        showDetail();
    } catch (error) {
        console.error('Error showing PR detail:', error);
        showError('Failed to load PR details');
    }
}

// UI Controls
export function showTab(index) {
    appState.currentTab = index;
    
    // Update tab appearance
    document.querySelectorAll('.tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    // Show/hide content
    document.getElementById('issuesContent').style.display = index === 0 ? 'block' : 'none';
    document.getElementById('prsContent').style.display = index === 1 ? 'block' : 'none';
}

export function showDetail() {
    document.getElementById('detailScreen').classList.add('active');
    document.getElementById('bottomInput').classList.add('active');
}

export function hideDetail() {
    document.getElementById('detailScreen').classList.remove('active');
    document.getElementById('bottomInput').classList.remove('active');
    appState.currentItem = null;
}

export async function addComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    
    if (!text || !appState.currentItem) return;
    
    // Extract owner and repo from repository_name or repository_url
    const [owner, repo] = appState.currentItem.repository_name ? 
        appState.currentItem.repository_name.split('/') : 
        appState.currentItem.repository_url.split('/').slice(-2);
    
    try {
        await apiAddComment(text, owner, repo, appState.currentItem.number);
        
        input.value = '';
        document.getElementById('sendBtn').disabled = true;
        showSuccess('Comment added!');
        
        // Reload comments
        await loadComments(owner, repo, appState.currentItem.number);
        renderDetail(appState.currentItem);
        
    } catch (error) {
        console.error('Add comment error:', error);
        showError('Failed to add comment: ' + error.message);
    }
}