// UI Rendering and Interaction Functions
import { appState } from './state.js';
import { loadComments, addComment as apiAddComment, loadData, loadIssueReactions, addReaction, removeReaction } from './api.js';
import { tokenManager } from './tokenManager.js';

// Utility Functions
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to get emoji for reaction content
export function getReactionEmoji(content) {
    const emojiMap = {
        '+1': '👍',
        '-1': '👎',
        'laugh': '😄',
        'confused': '😕',
        'heart': '❤️',
        'hooray': '🎉',
        'rocket': '🚀',
        'eyes': '👀'
    };
    return emojiMap[content] || content;
}

// Toggle comment visibility
export function toggleComment(commentId) {
    const content = document.getElementById(`content-${commentId}`);
    const toggle = document.getElementById(`toggle-${commentId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▼';
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
    }
}

// Format comment text with basic markdown support and newlines
export function formatComment(text) {
    if (!text) return '';
    
    // First escape HTML to prevent XSS
    let formatted = escapeHtml(text);
    
    // Temporarily replace code blocks to protect them from other formatting
    const codeBlocks = [];
    formatted = formatted.replace(/```([^`]*)```/g, (match, code) => {
        codeBlocks.push(`<pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code>${code}</code></pre>`);
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    
    // Protect inline code
    const inlineCode = [];
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
        inlineCode.push(`<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${code}</code>`);
        return `__INLINE_CODE_${inlineCode.length - 1}__`;
    });
    
    // Headings (support h1-h6)
    formatted = formatted.replace(/^######\s+(.+)$/gm, '<h6 style="font-size: 0.85em; font-weight: 600; margin: 16px 0 8px 0;">$1</h6>');
    formatted = formatted.replace(/^#####\s+(.+)$/gm, '<h5 style="font-size: 0.9em; font-weight: 600; margin: 16px 0 8px 0;">$1</h5>');
    formatted = formatted.replace(/^####\s+(.+)$/gm, '<h4 style="font-size: 1em; font-weight: 600; margin: 16px 0 8px 0;">$1</h4>');
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 style="font-size: 1.17em; font-weight: 600; margin: 16px 0 8px 0;">$1</h3>');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 style="font-size: 1.5em; font-weight: 600; margin: 16px 0 8px 0;">$1</h2>');
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1 style="font-size: 2em; font-weight: 600; margin: 16px 0 8px 0;">$1</h1>');
    
    // Horizontal rule
    formatted = formatted.replace(/^---+$/gm, '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;">');
    formatted = formatted.replace(/^\*\*\*+$/gm, '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;">');
    
    // Blockquotes
    formatted = formatted.replace(/^&gt;\s+(.+)$/gm, '<blockquote style="border-left: 4px solid #ddd; margin: 8px 0; padding-left: 16px; color: #666;">$1</blockquote>');
    
    // Unordered lists
    formatted = formatted.replace(/^[\*\-]\s+(.+)$/gm, '<li style="margin: 4px 0;">$1</li>');
    // Wrap consecutive list items in ul
    formatted = formatted.replace(/(<li[^>]*>.*?<\/li>(\s*<br>)*)+/g, (match) => {
        return `<ul style="margin: 8px 0; padding-left: 24px;">${match}</ul>`;
    });
    
    // Ordered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin: 4px 0;">$1</li>');
    // Note: For simplicity, we're not distinguishing between ul and ol in the wrapping
    
    // Bold text (must come before italic to handle **text**)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic text (now handles both * and _)
    formatted = formatted.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    
    // Strikethrough
    formatted = formatted.replace(/~~([^~]+)~~/g, '<del style="text-decoration: line-through;">$1</del>');
    
    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #6750a4; text-decoration: underline;">$1</a>');
    
    // Auto-link URLs
    formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color: #6750a4; text-decoration: underline;">$1</a>');
    
    // Restore code blocks and inline code
    codeBlocks.forEach((block, i) => {
        formatted = formatted.replace(`__CODE_BLOCK_${i}__`, block);
    });
    
    inlineCode.forEach((code, i) => {
        formatted = formatted.replace(`__INLINE_CODE_${i}__`, code);
    });
    
    // Preserve newlines by converting them to <br> (but not inside block elements)
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Clean up multiple consecutive <br> tags that might appear after block elements
    formatted = formatted.replace(/(<\/(?:h[1-6]|blockquote|ul|pre)>)<br>/g, '$1');
    
    return formatted;
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
    const isPR = !!item.pull_request || !!item.head; // Check if it's a PR
    
    // Group reactions by type
    const reactionGroups = {};
    if (item.reactions && item.reactions.length > 0) {
        item.reactions.forEach(reaction => {
            if (!reactionGroups[reaction.content]) {
                reactionGroups[reaction.content] = [];
            }
            reactionGroups[reaction.content].push(reaction);
        });
    }
    
    content.innerHTML = `
        <div class="detail-card">
            <div class="card-header">
                <div class="status-badge status-${item.state}">
                    ${item.state === 'open' ? (isPR ? '🔄' : '🐛') : '✅'} ${item.state.toUpperCase()}
                </div>
                <div style="font-size: 12px; color: #999;">
                    Created ${new Date(item.created_at).toLocaleDateString()}
                </div>
            </div>
            <div class="detail-title">${escapeHtml(item.title)}</div>
            <div class="detail-meta">by ${item.user.login}</div>
            ${item.body ? `<div class="detail-body">${formatComment(item.body)}</div>` : '<div class="detail-body" style="color: #999; font-style: italic;">No description provided</div>'}
            
            <!-- Reactions Section -->
            <div class="reactions-container" style="margin-top: 12px;">
                <div class="reactions-list" id="issueReactions">
                    ${Object.entries(reactionGroups).map(([emoji, reactions]) => `
                        <button class="reaction-badge ${reactions.some(r => r.user.login === appState.user?.login) ? 'user-reacted' : ''}" 
                                onclick="window.handleReaction('${emoji}', ${item.number}, false)"
                                title="${reactions.map(r => r.user.login).join(', ')}">
                            ${getReactionEmoji(emoji)} ${reactions.length}
                        </button>
                    `).join('')}
                    <button class="reaction-add-btn" onclick="window.showReactionPicker(${item.number}, false)" title="Add reaction">+</button>
                </div>
            </div>
            
            ${isPR ? `
                <div id="prActions" style="margin-top: 16px;">
                    <!-- PR actions will be inserted here -->
                </div>
            ` : `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
                    <button onclick="window.toggleIssueState()" style="padding: 10px 20px; background: ${item.state === 'open' ? '#666' : '#2e7d32'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">
                        ${item.state === 'open' ? '🔒 Close Issue' : '🔓 Reopen Issue'}
                    </button>
                </div>
            `}
        </div>
        
        <div style="margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #6750a4;">
            <h3 style="margin: 0; color: #6750a4; font-size: 18px; font-weight: 600;">
                💬 Comments (${appState.comments.length})
            </h3>
        </div>
        
        ${appState.comments.map(comment => {
            // Group reactions by type
            const reactionGroups = {};
            if (comment.reactions && comment.reactions.length > 0) {
                comment.reactions.forEach(reaction => {
                    if (!reactionGroups[reaction.content]) {
                        reactionGroups[reaction.content] = [];
                    }
                    reactionGroups[reaction.content].push(reaction);
                });
            }
            
            return `
            <div class="comment-card" data-comment-id="${comment.id}">
                <div class="comment-header" onclick="window.toggleComment(${comment.id})" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="comment-toggle" id="toggle-${comment.id}">▼</span>
                        <div class="comment-author">${comment.user.login}</div>
                    </div>
                    <div class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</div>
                </div>
                <div class="comment-content" id="content-${comment.id}">
                    <div class="comment-body">${formatComment(comment.body)}</div>
                    
                    <!-- Reactions for comment -->
                    <div class="reactions-container" style="margin-top: 8px;">
                        <div class="reactions-list">
                            ${Object.entries(reactionGroups).map(([emoji, reactions]) => `
                                <button class="reaction-badge ${reactions.some(r => r.user.login === appState.user?.login) ? 'user-reacted' : ''}" 
                                        onclick="window.handleReaction('${emoji}', ${comment.id}, true)"
                                        title="${reactions.map(r => r.user.login).join(', ')}">
                                    ${getReactionEmoji(emoji)} ${reactions.length}
                                </button>
                            `).join('')}
                            <button class="reaction-add-btn" onclick="window.showReactionPicker(${comment.id}, true)" title="Add reaction">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('')}
        
        ${appState.comments.length === 0 ? '<div style="text-align: center; color: #999; padding: 32px; background: #f5f5f5; border-radius: 12px; margin: 16px 0;"><p style="margin: 0 0 8px 0;">No comments yet</p><p style="margin: 0; font-size: 14px;">Be the first to comment using the input field below! 👇</p></div>' : ''}
    `;
    
    // If it's a PR, fetch and display merge status and actions
    if (isPR) {
        renderPRActions(item);
    }
}

// PR Actions and Merge Functionality
async function renderPRActions(pr) {
    const actionsDiv = document.getElementById('prActions');
    if (!actionsDiv) return;
    
    try {
        // Extract owner and repo
        const [owner, repo] = pr.repository_name ? 
            pr.repository_name.split('/') : 
            pr.repository_url.split('/').slice(-2);
        
        // Import the API functions we'll need
        const { githubAPI } = await import('./api.js');
        
        // Get PR details including mergeable status
        const prDetailsResponse = await githubAPI(`/repos/${owner}/${repo}/pulls/${pr.number}`);
        const prDetails = await prDetailsResponse.json();
        
        // Store PR details for later use
        appState.currentPRDetails = prDetails;
        
        // Build the actions HTML
        let actionsHTML = '<div style="border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 16px;">';
        
        // Show merge status
        if (prDetails.state === 'open') {
            actionsHTML += '<div style="margin-bottom: 16px;">';
            
            // Mergeable status
            if (prDetails.mergeable === true) {
                actionsHTML += '<div style="color: #2e7d32; font-weight: 500; margin-bottom: 8px;">✅ Ready to merge</div>';
            } else if (prDetails.mergeable === false) {
                actionsHTML += '<div style="color: #c62828; font-weight: 500; margin-bottom: 8px;">❌ Cannot merge - conflicts detected</div>';
            } else {
                actionsHTML += '<div style="color: #666; font-weight: 500; margin-bottom: 8px;">⏳ Checking merge status...</div>';
            }
            
            // Show merge options if mergeable
            if (prDetails.mergeable === true) {
                actionsHTML += `
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
                        <button onclick="window.mergePR('merge')" style="padding: 8px 16px; background: #2e7d32; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            Merge
                        </button>
                        <button onclick="window.mergePR('squash')" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            Squash & Merge
                        </button>
                        <button onclick="window.mergePR('rebase')" style="padding: 8px 16px; background: #7b1fa2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            Rebase & Merge
                        </button>
                    </div>
                `;
            }
            
            // Close PR button
            actionsHTML += `
                <button onclick="window.closePR()" style="margin-top: 12px; padding: 8px 16px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    Close Pull Request
                </button>
            `;
            
            actionsHTML += '</div>';
        } else {
            actionsHTML += '<div style="color: #666;">This pull request is closed.</div>';
        }
        
        actionsHTML += '</div>';
        
        actionsDiv.innerHTML = actionsHTML;
    } catch (error) {
        console.error('Error loading PR actions:', error);
        actionsDiv.innerHTML = '<div style="color: #c62828; padding: 8px;">Failed to load PR actions</div>';
    }
}

// Detail Views
export async function showIssueDetail(id) {
    try {
        const issue = appState.issues.find(i => i.id == id);
        if (!issue) return;
        
        appState.currentItem = issue;
        appState.currentItemType = 'issue';
        document.getElementById('detailTitle').textContent = `Issue #${issue.number}`;
        
        // Show new issue button for issues only
        document.getElementById('newIssueBtn').style.display = 'flex';
        
        // Extract owner and repo from repository_name or repository_url
        const [owner, repo] = issue.repository_name ? issue.repository_name.split('/') : issue.repository_url.split('/').slice(-2);
        
        // Load comments and reactions in parallel
        const [comments, reactions] = await Promise.all([
            loadComments(owner, repo, issue.number),
            loadIssueReactions(owner, repo, issue.number)
        ]);
        
        // Add reactions to the issue object
        issue.reactions = reactions;
        
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
        appState.currentItemType = 'pr';
        document.getElementById('detailTitle').textContent = `PR #${pr.number}`;
        
        // Hide new issue button for PRs
        document.getElementById('newIssueBtn').style.display = 'none';
        
        // Extract owner and repo from repository_name or repository_url
        const [owner, repo] = pr.repository_name ? pr.repository_name.split('/') : pr.repository_url.split('/').slice(-2);
        
        // Load comments and reactions in parallel
        const [comments, reactions] = await Promise.all([
            loadComments(owner, repo, pr.number),
            loadIssueReactions(owner, repo, pr.number)
        ]);
        
        // Add reactions to the PR object
        pr.reactions = reactions;
        
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

// Comment Modal Functions
export function openCommentModal() {
    const modal = document.getElementById('commentModal');
    const textarea = document.getElementById('commentTextarea');
    
    modal.classList.add('active');
    textarea.focus();
    
    // Clear any previous content
    textarea.value = '';
    updateSendButton();
}

export function closeCommentModal() {
    const modal = document.getElementById('commentModal');
    const textarea = document.getElementById('commentTextarea');
    
    modal.classList.remove('active');
    textarea.value = '';
    updateSendButton();
}

export function updateSendButton() {
    const textarea = document.getElementById('commentTextarea');
    const sendBtn = document.getElementById('modalSendBtn');
    
    sendBtn.disabled = !textarea.value.trim();
}

export async function sendComment() {
    const textarea = document.getElementById('commentTextarea');
    const text = textarea.value.trim();
    
    if (!text || !appState.currentItem) return;
    
    // Extract owner and repo from repository_name or repository_url
    const [owner, repo] = appState.currentItem.repository_name ? 
        appState.currentItem.repository_name.split('/') : 
        appState.currentItem.repository_url.split('/').slice(-2);
    
    // Disable send button while sending
    const sendBtn = document.getElementById('modalSendBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        await apiAddComment(text, owner, repo, appState.currentItem.number);
        
        // Close modal
        closeCommentModal();
        showSuccess('Comment added!');
        
        // Refresh only this repository's data to keep the list updated
        const { refreshSingleRepository } = await import('./api.js');
        await refreshSingleRepository(appState.currentItem.repository_name);
        
        // Reload comments
        await loadComments(owner, repo, appState.currentItem.number);
        renderDetail(appState.currentItem);
        
    } catch (error) {
        console.error('Add comment error:', error);
        showError('Failed to add comment: ' + error.message);
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

export async function mergePR(mergeMethod) {
    if (!appState.currentPRDetails) {
        showError('PR details not loaded');
        return;
    }
    
    const pr = appState.currentPRDetails;
    const [owner, repo] = pr.base.repo.full_name.split('/');
    
    const confirmMessage = `Are you sure you want to ${mergeMethod === 'squash' ? 'squash and merge' : mergeMethod === 'rebase' ? 'rebase and merge' : 'merge'} PR #${pr.number}?`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
        // Show loading state
        const actionsDiv = document.getElementById('prActions');
        if (actionsDiv) {
            actionsDiv.innerHTML = '<div style="padding: 16px; text-align: center;">Merging pull request...</div>';
        }
        
        const { githubAPI } = await import('./api.js');
        
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}/merge`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token || appState.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'User-Agent': 'GitHub-Manager-PWA'
            },
            body: JSON.stringify({
                merge_method: mergeMethod
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to merge PR');
        }
        
        showSuccess(`Pull request #${pr.number} merged successfully!`);
        
        // Refresh only this repository's data to keep the list updated
        const { refreshSingleRepository } = await import('./api.js');
        await refreshSingleRepository(pr.base.repo.full_name);
        
        // Refresh the PR details
        setTimeout(() => {
            window.showPRDetail(appState.currentItem.id);
        }, 500);
        
    } catch (error) {
        console.error('Merge error:', error);
        showError('Failed to merge PR: ' + error.message);
        // Refresh to show current state
        renderPRActions(appState.currentItem);
    }
}

export async function closePR() {
    if (!appState.currentItem) {
        showError('No PR selected');
        return;
    }
    
    const pr = appState.currentItem;
    const [owner, repo] = pr.repository_name ? 
        pr.repository_name.split('/') : 
        pr.repository_url.split('/').slice(-2);
    
    if (!confirm(`Are you sure you want to close PR #${pr.number}?`)) return;
    
    try {
        // Show loading state
        const actionsDiv = document.getElementById('prActions');
        if (actionsDiv) {
            actionsDiv.innerHTML = '<div style="padding: 16px; text-align: center;">Closing pull request...</div>';
        }
        
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token || appState.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'User-Agent': 'GitHub-Manager-PWA'
            },
            body: JSON.stringify({
                state: 'closed'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to close PR');
        }
        
        showSuccess(`Pull request #${pr.number} closed successfully!`);
        
        // Update the current item state
        pr.state = 'closed';
        
        // Refresh only this repository's data to keep the list updated
        const { refreshSingleRepository } = await import('./api.js');
        await refreshSingleRepository(pr.repository_name);
        
        // Refresh the PR details
        setTimeout(() => {
            window.showPRDetail(pr.id);
        }, 500);
        
    } catch (error) {
        console.error('Close PR error:', error);
        showError('Failed to close PR: ' + error.message);
        // Refresh to show current state
        renderPRActions(pr);
    }
}

// Refresh detail view
export async function refreshDetail() {
    if (!appState.currentItem) {
        showError('No item to refresh');
        return;
    }
    
    try {
        // Show loading feedback
        showSuccess('Refreshing...');
        
        if (appState.currentItemType === 'issue') {
            await showIssueDetail(appState.currentItem.id);
        } else if (appState.currentItemType === 'pr') {
            await showPRDetail(appState.currentItem.id);
        }
        
        showSuccess('Refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing detail:', error);
        showError('Failed to refresh');
    }
}

// Create new issue
export function createNewIssue() {
    if (!appState.currentItem) {
        showError('No repository selected');
        return;
    }
    
    // Extract owner and repo from current issue
    const [owner, repo] = appState.currentItem.repository_name ? 
        appState.currentItem.repository_name.split('/') : 
        appState.currentItem.repository_url.split('/').slice(-2);
    
    // Get suggested assignees from the current repository context
    // Filter to only show usernames from issues/PRs in the same repository
    const repoFullName = `${owner}/${repo}`;
    const repoSpecificUsernames = new Set();
    
    // Collect usernames from issues and PRs of the same repository
    [...appState.unfilteredIssues || [], ...appState.unfilteredPullRequests || []].forEach(item => {
        if (item.repository_name === repoFullName) {
            // Add the creator username
            if (item.user && item.user.login) {
                repoSpecificUsernames.add(item.user.login);
            }
            // Add assignee usernames
            if (item.assignees && Array.isArray(item.assignees)) {
                item.assignees.forEach(assignee => {
                    if (assignee.login) {
                        repoSpecificUsernames.add(assignee.login);
                    }
                });
            }
            // Add single assignee if present
            if (item.assignee && item.assignee.login) {
                repoSpecificUsernames.add(item.assignee.login);
            }
        }
    });
    
    // Use repo-specific usernames if available, otherwise fall back to all suggestions
    const suggestedUsernames = repoSpecificUsernames.size > 0 ? 
        Array.from(repoSpecificUsernames).sort() : 
        Array.from(appState.suggestedAssignees).sort();
    
    // Create datalist for assignee suggestions
    const datalistId = 'assigneeSuggestions';
    const datalistHtml = suggestedUsernames.length > 0 ? `
        <datalist id="${datalistId}">
            ${suggestedUsernames.map(username => `<option value="${username}">`).join('')}
        </datalist>
    ` : '';
    
    // Create new issue form
    const modal = document.createElement('div');
    modal.className = 'comment-modal active';
    modal.innerHTML = `
        <div class="comment-modal-content">
            <div class="comment-modal-header">
                <h3>New Issue in ${owner}/${repo}</h3>
                <button class="comment-modal-close" onclick="this.closest('.comment-modal').remove()">×</button>
            </div>
            <input type="text" id="newIssueTitle" placeholder="Issue title" style="width: 100%; padding: 12px; margin-bottom: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
            <textarea id="newIssueBody" placeholder="Describe the issue..." style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; min-height: 150px; font-size: 16px; resize: vertical;"></textarea>
            <input type="text" id="newIssueAssignee" list="${datalistId}" placeholder="Assignee username (optional)" style="width: 100%; padding: 12px; margin-top: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
            ${datalistHtml}
            <div class="comment-modal-footer">
                <button class="comment-modal-btn comment-modal-cancel" onclick="this.closest('.comment-modal').remove()">Cancel</button>
                <button class="comment-modal-btn comment-modal-send" onclick="window.submitNewIssue('${owner}', '${repo}', this)">Create Issue</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus on title input
    document.getElementById('newIssueTitle').focus();
}

// Submit new issue
export async function submitNewIssue(owner, repo, button) {
    const title = document.getElementById('newIssueTitle').value.trim();
    const body = document.getElementById('newIssueBody').value.trim();
    const assignee = document.getElementById('newIssueAssignee').value.trim();
    
    if (!title) {
        showError('Please enter an issue title');
        return;
    }
    
    button.disabled = true;
    button.textContent = 'Creating...';
    
    try {
        const issueData = {
            title: title,
            body: body || ''
        };
        
        if (assignee) {
            issueData.assignees = [assignee];
        }
        
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token || appState.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'User-Agent': 'GitHub-Manager-PWA'
            },
            body: JSON.stringify(issueData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create issue');
        }
        
        const newIssue = await response.json();
        
        showSuccess(`Issue #${newIssue.number} created successfully!`);
        
        // Close the modal
        button.closest('.comment-modal').remove();
        
        // Refresh only this repository's data to include the new issue
        const { refreshSingleRepository } = await import('./api.js');
        await refreshSingleRepository(`${owner}/${repo}`);
        
    } catch (error) {
        console.error('Error creating issue:', error);
        showError('Failed to create issue: ' + error.message);
        button.disabled = false;
        button.textContent = 'Create Issue';
    }
}

// Close or reopen issue
export async function toggleIssueState() {
    if (!appState.currentItem || appState.currentItemType !== 'issue') {
        showError('No issue selected');
        return;
    }
    
    const issue = appState.currentItem;
    const [owner, repo] = issue.repository_name ? 
        issue.repository_name.split('/') : 
        issue.repository_url.split('/').slice(-2);
    
    const newState = issue.state === 'open' ? 'closed' : 'open';
    const action = newState === 'closed' ? 'close' : 'reopen';
    
    if (!confirm(`Are you sure you want to ${action} issue #${issue.number}?`)) return;
    
    try {
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token || appState.token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'User-Agent': 'GitHub-Manager-PWA'
            },
            body: JSON.stringify({
                state: newState
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to ${action} issue`);
        }
        
        showSuccess(`Issue #${issue.number} ${newState === 'closed' ? 'closed' : 'reopened'} successfully!`);
        
        // Update the current item state
        issue.state = newState;
        
        // Refresh only this repository's data to keep the list updated
        const { refreshSingleRepository } = await import('./api.js');
        await refreshSingleRepository(issue.repository_name);
        
        // Refresh the issue details
        setTimeout(() => {
            window.showIssueDetail(issue.id);
        }, 500);
        
    } catch (error) {
        console.error(`Error ${action} issue:`, error);
        showError(`Failed to ${action} issue: ` + error.message);
    }
}

// Filter Functions
export function populateFilterDropdown(repositories) {
    const filterBar = document.getElementById('filterBar');
    const filterPanelContent = document.getElementById('filterPanelContent');
    
    if (!repositories || repositories.length === 0) {
        filterBar.style.display = 'none';
        return;
    }
    
    // Show filter bar
    filterBar.style.display = 'flex';
    
    // Group repositories by organization/user
    const grouped = {};
    const userLogin = appState.user?.login || 'Personal';
    
    repositories.forEach(repo => {
        const owner = repo.owner.login;
        const org = repo.org || (owner === userLogin ? 'Personal' : owner);
        
        if (!grouped[org]) {
            grouped[org] = [];
        }
        grouped[org].push(repo);
    });
    
    // Build filter panel HTML
    let panelHTML = '';
    
    // Add "All repositories" option
    panelHTML += `<button class="filter-option-all ${!appState.currentFilter ? 'selected' : ''}" onclick="selectFilter('')">All repositories</button>`;
    
    // Sort organizations alphabetically, with Personal first
    const sortedOrgs = Object.keys(grouped).sort((a, b) => {
        if (a === 'Personal') return -1;
        if (b === 'Personal') return 1;
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    
    // Store collapsed state
    if (!appState.collapsedGroups) {
        appState.collapsedGroups = new Set();
    }
    
    sortedOrgs.forEach(org => {
        const repos = grouped[org];
        const orgLabel = org === 'Personal' ? '👤 Personal' : `🏢 ${org}`;
        const orgValue = org === 'Personal' ? userLogin : org;
        const isCollapsed = appState.collapsedGroups.has(org);
        
        panelHTML += `<div class="repo-group">`;
        
        // Group header
        panelHTML += `<button class="repo-group-header" onclick="toggleRepoGroup('${org}')">`;
        panelHTML += `<span class="repo-group-arrow ${isCollapsed ? 'collapsed' : ''}">▼</span>`;
        panelHTML += `<span>${orgLabel}</span>`;
        panelHTML += `<span class="repo-group-count">${repos.length} repos</span>`;
        panelHTML += `</button>`;
        
        // Group items container
        panelHTML += `<div class="repo-group-items ${isCollapsed ? 'collapsed' : ''}" id="group-${org.replace(/[^a-zA-Z0-9]/g, '-')}">`;
        
        // Add "All org repos" option
        const isOrgSelected = appState.currentFilter === orgValue;
        panelHTML += `<button class="repo-item ${isOrgSelected ? 'selected' : ''}" onclick="selectFilter('${orgValue}')">`;
        panelHTML += `All ${org} repos`;
        panelHTML += `</button>`;
        
        // Add individual repository options
        repos.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        repos.forEach(repo => {
            const isSelected = appState.currentFilter === repo.full_name;
            panelHTML += `<button class="repo-item ${isSelected ? 'selected' : ''}" onclick="selectFilter('${repo.full_name}')">`;
            panelHTML += `📁 ${repo.name}`;
            panelHTML += `</button>`;
        });
        
        panelHTML += `</div>`; // repo-group-items
        panelHTML += `</div>`; // repo-group
    });
    
    filterPanelContent.innerHTML = panelHTML;
    
    // Update filter selection display
    updateFilterDisplay();
}

export async function applyFilter(filterValue) {
    appState.currentFilter = filterValue;
    
    // Close the filter panel
    document.getElementById('filterPanel').style.display = 'none';
    document.querySelector('.filter-arrow').classList.remove('open');
    
    // Update filter display
    updateFilterDisplay();
    
    // Reload data with filter
    await loadData(filterValue || null);
}

export async function clearFilter() {
    appState.currentFilter = null;
    
    // Update UI
    updateFilterDisplay();
    document.getElementById('filterClearBtn').style.display = 'none';
    
    // Close panel if open
    document.getElementById('filterPanel').style.display = 'none';
    document.querySelector('.filter-arrow').classList.remove('open');
    
    // Reload all data
    await loadData(null);
}

export function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    const arrow = document.querySelector('.filter-arrow');
    
    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'flex';
        arrow.classList.add('open');
    } else {
        panel.style.display = 'none';
        arrow.classList.remove('open');
    }
}

export function toggleRepoGroup(groupName) {
    const groupElement = document.getElementById(`group-${groupName.replace(/[^a-zA-Z0-9]/g, '-')}`);
    const arrow = event.currentTarget.querySelector('.repo-group-arrow');
    
    if (!appState.collapsedGroups) {
        appState.collapsedGroups = new Set();
    }
    
    if (groupElement.classList.contains('collapsed')) {
        groupElement.classList.remove('collapsed');
        arrow.classList.remove('collapsed');
        appState.collapsedGroups.delete(groupName);
    } else {
        groupElement.classList.add('collapsed');
        arrow.classList.add('collapsed');
        appState.collapsedGroups.add(groupName);
    }
}

export async function selectFilter(filterValue) {
    await applyFilter(filterValue);
}

export async function cycleStateFilter() {
    // Define the cycle order: all -> open -> closed -> all
    const states = ['all', 'open', 'closed'];
    const currentState = appState.stateFilter || 'all';
    const currentIndex = states.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % states.length;
    const nextState = states[nextIndex];
    
    // Update the button text and state
    const button = document.getElementById('stateCycleBtn');
    if (button) {
        // Capitalize first letter for display
        const displayText = nextState === 'all' ? 'All' : 
                          nextState === 'open' ? 'Open' : 'Closed';
        button.textContent = displayText;
        button.dataset.state = nextState;
    }
    
    // Call the existing setStateFilter with the new state
    await setStateFilter(nextState);
}

export async function setStateFilter(state) {
    // Update the state filter in app state
    appState.stateFilter = state;
    
    // Update the cycle button if it exists
    const cycleBtn = document.getElementById('stateCycleBtn');
    if (cycleBtn) {
        const displayText = state === 'all' ? 'All' : 
                          state === 'open' ? 'Open' : 'Closed';
        cycleBtn.textContent = displayText;
        cycleBtn.dataset.state = state;
    }
    
    // Filter the existing data without reloading from API
    filterDataByState();
    
    // Re-render the current view
    if (appState.currentTab === 0) {
        renderIssues();
    } else {
        renderPullRequests();
    }
    
    // Update counts
    updateCounts();
}

function filterDataByState() {
    // Store the unfiltered data if not already stored
    if (!appState.unfilteredIssues) {
        appState.unfilteredIssues = [...appState.issues];
    }
    if (!appState.unfilteredPullRequests) {
        appState.unfilteredPullRequests = [...appState.pullRequests];
    }
    
    // Filter based on state
    if (appState.stateFilter === 'all') {
        appState.issues = [...appState.unfilteredIssues];
        appState.pullRequests = [...appState.unfilteredPullRequests];
    } else if (appState.stateFilter === 'open') {
        appState.issues = appState.unfilteredIssues.filter(issue => issue.state === 'open');
        appState.pullRequests = appState.unfilteredPullRequests.filter(pr => pr.state === 'open');
    } else if (appState.stateFilter === 'closed') {
        appState.issues = appState.unfilteredIssues.filter(issue => issue.state === 'closed');
        appState.pullRequests = appState.unfilteredPullRequests.filter(pr => pr.state === 'closed');
    }
}

function updateCounts() {
    document.getElementById('issuesCount').textContent = appState.issues.length;
    document.getElementById('prsCount').textContent = appState.pullRequests.length;
}

function updateFilterDisplay() {
    const filterSelection = document.getElementById('filterSelection');
    const filterClearBtn = document.getElementById('filterClearBtn');
    
    if (appState.currentFilter) {
        // Show clear button
        filterClearBtn.style.display = 'block';
        
        // Update display text
        if (appState.currentFilter.includes('/')) {
            // It's a specific repo
            const repoName = appState.currentFilter.split('/')[1];
            filterSelection.textContent = `📁 ${repoName}`;
        } else {
            // It's an org/user
            const label = appState.currentFilter === appState.user?.login ? 'Personal' : appState.currentFilter;
            filterSelection.textContent = `${label} repos`;
        }
    } else {
        filterClearBtn.style.display = 'none';
        filterSelection.textContent = 'All repositories';
    }
}

// Reaction handling functions
export async function handleReaction(emoji, id, isComment) {
    try {
        const item = isComment 
            ? appState.comments.find(c => c.id === id)
            : appState.currentItem;
            
        if (!item) return;
        
        const [owner, repo] = item.repository_name 
            ? item.repository_name.split('/')
            : (item.repository_url || appState.currentItem.repository_url || appState.currentItem.repository_name).split('/').slice(-2);
        
        // Check if user already reacted with this emoji
        const userReaction = item.reactions?.find(r => 
            r.user.login === appState.user?.login && r.content === emoji
        );
        
        if (userReaction) {
            // Remove reaction
            await removeReaction(owner, repo, userReaction.id, isComment);
            showSuccess('Reaction removed');
        } else {
            // Add reaction
            await addReaction(owner, repo, id, emoji, isComment);
            showSuccess('Reaction added');
        }
        
        // Reload the detail view to update reactions
        await refreshDetail();
    } catch (error) {
        showError('Failed to update reaction');
        console.error(error);
    }
}

export function showReactionPicker(id, isComment) {
    // Create reaction picker popup
    const picker = document.createElement('div');
    picker.className = 'reaction-picker-overlay';
    picker.innerHTML = `
        <div class="reaction-picker">
            <button onclick="window.pickReaction('+1', ${id}, ${isComment})">👍</button>
            <button onclick="window.pickReaction('-1', ${id}, ${isComment})">👎</button>
            <button onclick="window.pickReaction('laugh', ${id}, ${isComment})">😄</button>
            <button onclick="window.pickReaction('confused', ${id}, ${isComment})">😕</button>
            <button onclick="window.pickReaction('heart', ${id}, ${isComment})">❤️</button>
            <button onclick="window.pickReaction('hooray', ${id}, ${isComment})">🎉</button>
            <button onclick="window.pickReaction('rocket', ${id}, ${isComment})">🚀</button>
            <button onclick="window.pickReaction('eyes', ${id}, ${isComment})">👀</button>
        </div>
    `;
    
    // Close picker when clicking outside
    picker.onclick = (e) => {
        if (e.target === picker) {
            picker.remove();
        }
    };
    
    document.body.appendChild(picker);
}

export async function pickReaction(emoji, id, isComment) {
    // Remove picker
    document.querySelector('.reaction-picker-overlay')?.remove();
    
    // Add the reaction
    await handleReaction(emoji, id, isComment);
}