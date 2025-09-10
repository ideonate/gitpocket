// UI Rendering and Interaction Functions
import { appState, saveAppStateToStorage } from './state.js';
import { loadComments, addComment as apiAddComment, loadData, loadIssueReactions, addReaction, removeReaction, fetchLastComment, refreshSingleRepository, mergePullRequest, closePullRequest, createIssue, closeIssue } from './api.js';
import { tokenManager } from './tokenManager.js';
import { githubAPI } from './github-client.js';

// Cache for last commenter data
const lastCommenterCache = new Map();
let lastCacheRefreshTime = 0;

// IntersectionObserver for lazy loading last commenter data
let lastCommenterObserver = null;

// Helper function to format dates in a concise format
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const currentYear = now.getFullYear();
    const dateYear = date.getFullYear();
    
    // Format: "9 Sep" or "9 Sep 23" if not current year
    const day = date.getDate();
    const month = date.toLocaleDateString('en', { month: 'short' });
    const year = dateYear !== currentYear ? String(dateYear).slice(-2) : '';
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const dateStr = year ? `${day} ${month} ${year}` : `${day} ${month}`;
    return `${dateStr} ${time}`;
}

// Initialize the IntersectionObserver for lazy loading
function initLastCommenterObserver() {
    if (lastCommenterObserver) {
        lastCommenterObserver.disconnect();
    }
    
    lastCommenterObserver = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const element = entry.target;
                const itemId = element.dataset.itemId;
                const itemNumber = element.dataset.itemNumber;
                const repoName = element.dataset.repoName;
                const itemAuthor = element.dataset.itemAuthor;
                
                // Check if we already have the data cached
                const cacheKey = `${repoName}#${itemNumber}`;
                // Force re-fetch if cache is older than 5 seconds after a refresh
                const cacheAge = Date.now() - lastCacheRefreshTime;
                const forceRefresh = cacheAge < 5000; // Within 5 seconds of a refresh
                
                if (lastCommenterCache.has(cacheKey) && !forceRefresh) {
                    updateLastCommenterIndicator(element, lastCommenterCache.get(cacheKey));
                    lastCommenterObserver.unobserve(element);
                    continue;
                }
                
                // Fetch last comment data
                if (repoName && itemNumber) {
                    const [owner, repo] = repoName.split('/');
                    const lastComment = await fetchLastComment(owner, repo, itemNumber, itemAuthor);
                    
                    // Cache the result
                    lastCommenterCache.set(cacheKey, lastComment);
                    
                    // Update the UI
                    updateLastCommenterIndicator(element, lastComment);
                    
                    // Stop observing this element
                    lastCommenterObserver.unobserve(element);
                }
            }
        }
    }, {
        rootMargin: '50px' // Start loading before item comes into view
    });
}

// Update the UI with last commenter indicator
function updateLastCommenterIndicator(cardElement, lastCommentData) {
    const indicatorContainer = cardElement.querySelector('.last-commenter-indicator');
    if (!indicatorContainer) return;
    
    const currentUser = appState.user?.login;
    
    // Remove any existing last-commenter class
    cardElement.classList.remove('user-last-commenter');
    
    if (!lastCommentData || !lastCommentData.user) {
        // This shouldn't happen now since we always return the author
        indicatorContainer.innerHTML = '<span style="color: #999; font-size: 12px;">No data</span>';
    } else if (lastCommentData.user === currentUser) {
        // Current user was last to comment (or is the author with no comments)
        if (lastCommentData.isAuthorOnly) {
            // Author with no comments - use pen icon
            indicatorContainer.innerHTML = '<span style="color: #4caf50; font-size: 12px;" title="You created this">✍️ You</span>';
        } else {
            // Current user commented last
            indicatorContainer.innerHTML = '<span style="color: #4caf50; font-size: 12px;" title="You commented last">✓ You</span>';
        }
        // Add class to grey out the background
        cardElement.classList.add('user-last-commenter');
    } else {
        // Someone else was last to comment (or is the author with no comments)
        if (lastCommentData.isAuthorOnly) {
            // Author with no comments - use pen icon
            indicatorContainer.innerHTML = `<span style="color: #ff9800; font-size: 12px;" title="${lastCommentData.user} created this">✍️ ${lastCommentData.user}</span>`;
        } else {
            // Someone else commented last - use speech bubble icon
            indicatorContainer.innerHTML = `<span style="color: #ff9800; font-size: 12px;" title="${lastCommentData.user} commented last">💬 ${lastCommentData.user}</span>`;
        }
    }
}

// Clear the last commenter cache
export function clearLastCommenterCache() {
    lastCommenterCache.clear();
    lastCacheRefreshTime = Date.now();
}

// Clear last commenter cache for a specific repository, optionally excluding a specific issue/PR
export function clearLastCommenterCacheForRepo(repoName, excludeNumber = null) {
    const keysToDelete = [];
    for (const [key, value] of lastCommenterCache.entries()) {
        // Key format is "owner/repo#number"
        if (key.startsWith(repoName + '#')) {
            const issueNumber = key.split('#')[1];
            if (excludeNumber === null || issueNumber !== excludeNumber.toString()) {
                keysToDelete.push(key);
            }
        }
    }
    keysToDelete.forEach(key => lastCommenterCache.delete(key));
}

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

// Toggle all comments visibility
export function toggleAllComments() {
    const comments = document.querySelectorAll('.comment-content');
    const toggles = document.querySelectorAll('.comment-toggle');
    const btn = document.getElementById('toggleAllCommentsBtn');
    
    // Check if any comments are currently visible
    const anyVisible = Array.from(comments).some(comment => comment.style.display !== 'none');
    
    if (anyVisible) {
        // Collapse all comments
        comments.forEach(comment => {
            comment.style.display = 'none';
        });
        toggles.forEach(toggle => {
            toggle.textContent = '▶';
        });
        if (btn) {
            btn.textContent = 'Expand All';
        }
    } else {
        // Expand all comments
        comments.forEach(comment => {
            comment.style.display = 'block';
        });
        toggles.forEach(toggle => {
            toggle.textContent = '▼';
        });
        if (btn) {
            btn.textContent = 'Collapse All';
        }
    }
}

// Format comment text with basic markdown support and newlines
export function formatComment(text) {
    if (!text) return '';
    
    // First, extract and protect code blocks and inline code BEFORE escaping HTML
    const codeBlocks = [];
    const inlineCode = [];
    
    // Extract code blocks first (before HTML escaping)
    let formatted = text.replace(/```([^`]*)```/g, (match, code) => {
        // Escape HTML within code blocks to prevent XSS
        const escapedCode = escapeHtml(code);
        codeBlocks.push(`<pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code>${escapedCode}</code></pre>`);
        return `CODEBLOCKPLACEHOLDER${codeBlocks.length - 1}CODEBLOCKPLACEHOLDER`;
    });
    
    // Extract inline code (before HTML escaping)
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
        // Escape HTML within inline code to prevent XSS
        const escapedCode = escapeHtml(code);
        inlineCode.push(`<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${escapedCode}</code>`);
        return `INLINECODEPLACEHOLDER${inlineCode.length - 1}INLINECODEPLACEHOLDER`;
    });
    
    // Now escape HTML for the rest of the content
    formatted = escapeHtml(formatted);
    
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
    
    // Restore code blocks and inline code (using global replace to handle any edge cases)
    codeBlocks.forEach((block, i) => {
        const placeholder = `CODEBLOCKPLACEHOLDER${i}CODEBLOCKPLACEHOLDER`;
        while (formatted.includes(placeholder)) {
            formatted = formatted.replace(placeholder, block);
        }
    });
    
    inlineCode.forEach((code, i) => {
        const placeholder = `INLINECODEPLACEHOLDER${i}INLINECODEPLACEHOLDER`;
        while (formatted.includes(placeholder)) {
            formatted = formatted.replace(placeholder, code);
        }
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
            <div class="issue-card" 
                 onclick="window.showIssueDetail('${issue.id}')" 
                 data-item-id="${issue.id}"
                 data-item-number="${issue.number}"
                 data-repo-name="${repoName}"
                 data-item-author="${issue.user.login}">
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
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>by ${issue.user.login}</span>
                        <span class="last-commenter-indicator" style="flex-shrink: 0;">⏳</span>
                    </div>
                    <div>💬 ${issue.comments}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Initialize observer if not already done
    if (!lastCommenterObserver) {
        initLastCommenterObserver();
    }
    
    // Start observing all issue cards
    setTimeout(() => {
        const cards = container.querySelectorAll('.issue-card');
        cards.forEach(card => {
            lastCommenterObserver.observe(card);
        });
    }, 100);
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
            <div class="pr-card" 
                 onclick="window.showPRDetail('${pr.id}')" 
                 data-item-id="${pr.id}"
                 data-item-number="${pr.number}"
                 data-repo-name="${repoName}"
                 data-item-author="${pr.user.login}">
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
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>by ${pr.user.login}</span>
                        <span class="last-commenter-indicator" style="flex-shrink: 0;">⏳</span>
                    </div>
                    <div>Updated ${formatDate(pr.updated_at)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Initialize observer if not already done
    if (!lastCommenterObserver) {
        initLastCommenterObserver();
    }
    
    // Start observing all PR cards
    setTimeout(() => {
        const cards = container.querySelectorAll('.pr-card');
        cards.forEach(card => {
            lastCommenterObserver.observe(card);
        });
    }, 100);
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
                    Created ${formatDate(item.created_at)}
                </div>
            </div>
            <div class="detail-title">${escapeHtml(item.title)}</div>
            <div class="detail-meta" style="display: flex; justify-content: space-between; align-items: center;">
                <span>by ${item.user.login}</span>
                <span>
                    Assignees: 
                    ${item.assignees && item.assignees.length > 0 
                        ? item.assignees.map(a => a.login).join(', ')
                        : '<span style="color: #999;">none</span>'
                    }
                    <span onclick="window.showAssigneeModal()" style="cursor: pointer; margin-left: 8px; color: #999; font-size: 14px;" title="Edit assignees">✏️</span>
                </span>
            </div>
            
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
        
        <div style="margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #6750a4; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: #6750a4; font-size: 18px; font-weight: 600;">
                💬 Comments (${appState.comments.length})
            </h3>
            ${appState.comments.length > 0 ? `
                <button onclick="window.toggleAllComments()" 
                        style="background: none; border: 1px solid #6750a4; color: #6750a4; padding: 4px 12px; border-radius: 16px; cursor: pointer; font-size: 12px; font-weight: 500;"
                        id="toggleAllCommentsBtn">
                    Collapse All
                </button>
            ` : ''}
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
                    <div class="comment-date">${formatDate(comment.created_at)}</div>
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
        
        
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        
        // Get PR details including mergeable status
        const prDetailsResponse = await githubAPI(`/repos/${owner}/${repo}/pulls/${pr.number}`, token);
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
    
    // Save the current tab to storage
    saveAppStateToStorage();
    
    // Apply the current state filter and re-render to ensure filtered content is shown
    if (appState.stateFilter && appState.stateFilter !== 'all') {
        filterDataByState();
        if (index === 0) {
            renderIssues();
        } else {
            renderPullRequests();
        }
        updateCounts();
    }
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
    const preview = document.getElementById('commentPreview');
    const toggleButton = document.getElementById('commentPreviewToggle');
    const sendBtn = document.getElementById('modalSendBtn');
    
    // Reset to edit mode
    if (preview && textarea) {
        textarea.style.display = 'block';
        preview.style.display = 'none';
    }
    
    // Reset toggle button appearance if it exists
    if (toggleButton) {
        toggleButton.style.opacity = '0.6';
        toggleButton.style.backgroundColor = 'white';
        toggleButton.querySelectorAll('svg rect').forEach(rect => {
            rect.setAttribute('stroke', '#666');
        });
    }
    
    modal.classList.remove('active');
    textarea.value = '';
    sendBtn.textContent = 'Send';
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
        
        // Update the cache to reflect that the current user is now the last commenter
        const cacheKey = `${appState.currentItem.repository_name}#${appState.currentItem.number}`;
        const currentUser = appState.user?.login;
        if (currentUser) {
            lastCommenterCache.set(cacheKey, {
                user: currentUser,
                created_at: new Date().toISOString(),
                isAuthorOnly: false
            });
        }
        
        // Refresh only this repository's data to keep the list updated
        await refreshSingleRepository(appState.currentItem.repository_name, appState.currentItem.number);
        
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
        
        
        await mergePullRequest(owner, repo, pr.number, mergeMethod);
        showSuccess(`Pull request #${pr.number} merged successfully!`);
        
        // Refresh only this repository's data to keep the list updated
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
        
        
        await closePullRequest(owner, repo, pr.number);
        showSuccess(`Pull request #${pr.number} closed successfully!`);
        
        // Update the current item state
        pr.state = 'closed';
        
        // Refresh only this repository's data to keep the list updated
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
        
        // Clear last commenter cache
        clearLastCommenterCache();
        
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
            <div style="position: relative;">
                <textarea id="newIssueBody" placeholder="Describe the issue..." style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; min-height: 150px; font-size: 16px; resize: vertical;"></textarea>
                <div id="newIssuePreview" style="display: none; width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; min-height: 150px; font-size: 16px; background: #f9f9f9; overflow-y: auto; max-height: 400px;"></div>
            </div>
            <input type="text" id="newIssueAssignee" list="${datalistId}" placeholder="Assignee username (optional)" style="width: 100%; padding: 12px; margin-top: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
            ${datalistHtml}
            <div class="comment-modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <button type="button" id="previewToggle" onclick="window.toggleIssuePreview()" title="Toggle preview" style="width: 36px; height: 28px; padding: 0; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s, background-color 0.2s;">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="4" width="16" height="12" stroke="#666" stroke-width="1.5" rx="1"/>
                        <path d="M6 11L8.5 8.5L11 11L14 7" stroke="#666" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="6.5" cy="7.5" r="1" fill="#666"/>
                    </svg>
                </button>
                <div style="display: flex; gap: 8px;">
                    <button class="comment-modal-btn comment-modal-cancel" onclick="this.closest('.comment-modal').remove()">Cancel</button>
                    <button class="comment-modal-btn comment-modal-send" onclick="window.submitNewIssue('${owner}', '${repo}', this)">Create Issue</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus on title input
    document.getElementById('newIssueTitle').focus();
}

// Toggle between edit and preview mode for new issue
export function toggleIssuePreview() {
    const textarea = document.getElementById('newIssueBody');
    const preview = document.getElementById('newIssuePreview');
    const toggleButton = document.getElementById('previewToggle');
    
    // Check current state
    const isPreviewMode = preview.style.display === 'block';
    
    if (!isPreviewMode) {
        // Switch to preview mode
        const bodyText = textarea.value.trim();
        if (bodyText) {
            preview.innerHTML = formatComment(bodyText);
        } else {
            preview.innerHTML = '<span style="color: #999; font-style: italic;">Nothing to preview</span>';
        }
        textarea.style.display = 'none';
        preview.style.display = 'block';
        
        // Highlight the toggle button
        toggleButton.style.opacity = '1';
        toggleButton.style.backgroundColor = '#6750a4';
        toggleButton.querySelectorAll('svg rect').forEach(rect => {
            rect.setAttribute('stroke', 'white');
        });
    } else {
        // Switch back to edit mode
        textarea.style.display = 'block';
        preview.style.display = 'none';
        
        // Reset toggle button appearance
        toggleButton.style.opacity = '0.6';
        toggleButton.style.backgroundColor = 'white';
        toggleButton.querySelectorAll('svg rect').forEach(rect => {
            rect.setAttribute('stroke', '#666');
        });
    }
}

// Toggle between edit and preview mode for comment
export function toggleCommentPreview() {
    const textarea = document.getElementById('commentTextarea');
    const preview = document.getElementById('commentPreview');
    const toggleButton = document.getElementById('commentPreviewToggle');
    
    // Check current state
    const isPreviewMode = preview.style.display === 'block';
    
    if (!isPreviewMode) {
        // Switch to preview mode
        const commentText = textarea.value.trim();
        if (commentText) {
            preview.innerHTML = formatComment(commentText);
        } else {
            preview.innerHTML = '<span style="color: #999; font-style: italic;">Nothing to preview</span>';
        }
        textarea.style.display = 'none';
        preview.style.display = 'block';
        
        // Highlight the toggle button
        toggleButton.style.opacity = '1';
        toggleButton.style.backgroundColor = '#6750a4';
        toggleButton.querySelectorAll('svg rect').forEach(rect => {
            rect.setAttribute('stroke', 'white');
        });
    } else {
        // Switch back to edit mode
        textarea.style.display = 'block';
        preview.style.display = 'none';
        
        // Reset toggle button appearance
        toggleButton.style.opacity = '0.6';
        toggleButton.style.backgroundColor = 'white';
        toggleButton.querySelectorAll('svg rect').forEach(rect => {
            rect.setAttribute('stroke', '#666');
        });
    }
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
        
        
        const newIssue = await createIssue(owner, repo, issueData);
        
        showSuccess(`Issue #${newIssue.number} created successfully!`);
        
        // Close the modal
        button.closest('.comment-modal').remove();
        
        // Refresh only this repository's data to include the new issue
        await refreshSingleRepository(`${owner}/${repo}`);
        
    } catch (error) {
        console.error('Error creating issue:', error);
        showError('Failed to create issue: ' + error.message);
        button.disabled = false;
        button.textContent = 'Create Issue';
    }
}

// Show assignee modal
export async function showAssigneeModal() {
    if (!appState.currentItem) {
        showError('No item selected');
        return;
    }
    
    const item = appState.currentItem;
    const isPR = appState.currentItemType === 'pr';
    const [owner, repo] = item.repository_name ? 
        item.repository_name.split('/') : 
        item.repository_url.split('/').slice(-2);
    
    // Collect repository-specific usernames
    const repoFullName = `${owner}/${repo}`;
    const repoSpecificUsernames = new Set();
    
    // Collect usernames from issues and PRs of the same repository
    [...appState.unfilteredIssues || [], ...appState.unfilteredPullRequests || []].forEach(i => {
        if (i.repository_name === repoFullName) {
            // Add the creator username
            if (i.user && i.user.login) {
                repoSpecificUsernames.add(i.user.login);
            }
            // Add assignee usernames
            if (i.assignees && Array.isArray(i.assignees)) {
                i.assignees.forEach(assignee => {
                    if (assignee.login) {
                        repoSpecificUsernames.add(assignee.login);
                    }
                });
            }
            // Add single assignee if present
            if (i.assignee && i.assignee.login) {
                repoSpecificUsernames.add(i.assignee.login);
            }
        }
    });
    
    // Use repo-specific usernames if available, otherwise fall back to all suggestions
    const suggestedUsernames = repoSpecificUsernames.size > 0 ? 
        Array.from(repoSpecificUsernames).sort() : 
        Array.from(appState.suggestedAssignees).sort();
    
    // Get current assignees
    const currentAssignees = item.assignees ? item.assignees.map(a => a.login) : [];
    
    // Create assignee modal
    const modal = document.createElement('div');
    modal.className = 'comment-modal active';
    modal.innerHTML = `
        <div class="comment-modal-content">
            <div class="comment-modal-header">
                <h3>Edit Assignees for ${isPR ? 'PR' : 'Issue'} #${item.number}</h3>
                <button class="comment-modal-close" onclick="this.closest('.comment-modal').remove()">×</button>
            </div>
            <div style="padding: 16px 0;">
                <p style="margin-bottom: 12px; color: #666;">Select assignees (you can select multiple):</p>
                <div id="assigneesList" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 8px;">
                    ${suggestedUsernames.length > 0 
                        ? suggestedUsernames.map(username => `
                            <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; hover: background: #f5f5f5;">
                                <input type="checkbox" value="${username}" ${currentAssignees.includes(username) ? 'checked' : ''} style="margin-right: 8px;">
                                <span>${username}</span>
                            </label>
                        `).join('')
                        : '<p style="text-align: center; color: #999;">No suggested users found</p>'
                    }
                </div>
                <input type="text" id="customAssignee" placeholder="Or enter a username manually" style="width: 100%; padding: 12px; margin-top: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
            </div>
            <div class="comment-modal-footer">
                <button class="comment-modal-btn comment-modal-cancel" onclick="this.closest('.comment-modal').remove()">Cancel</button>
                <button class="comment-modal-btn comment-modal-send" onclick="window.updateAssignees(this)">Update Assignees</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Update assignees
export async function updateAssignees(button) {
    if (!appState.currentItem) {
        showError('No item selected');
        return;
    }
    
    const item = appState.currentItem;
    const isPR = appState.currentItemType === 'pr';
    const [owner, repo] = item.repository_name ? 
        item.repository_name.split('/') : 
        item.repository_url.split('/').slice(-2);
    
    // Get selected assignees
    const checkboxes = document.querySelectorAll('#assigneesList input[type="checkbox"]:checked');
    const assignees = Array.from(checkboxes).map(cb => cb.value);
    
    // Add custom assignee if provided
    const customAssignee = document.getElementById('customAssignee').value.trim();
    if (customAssignee && !assignees.includes(customAssignee)) {
        assignees.push(customAssignee);
    }
    
    button.disabled = true;
    button.textContent = 'Updating...';
    
    try {
        // Import tokenManager
        
        // Get the appropriate token for this repository
        const token = tokenManager.getTokenForRepo(`${owner}/${repo}`);
        
        const endpoint = isPR 
            ? `/repos/${owner}/${repo}/issues/${item.number}`  // PRs use the issues endpoint for assignees
            : `/repos/${owner}/${repo}/issues/${item.number}`;
        
        const response = await githubAPI(endpoint, token, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assignees: assignees
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update assignees');
        }
        
        const updatedItem = await response.json();
        
        showSuccess('Assignees updated successfully!');
        
        // Update the current item
        item.assignees = updatedItem.assignees;
        
        // Close the modal
        button.closest('.comment-modal').remove();
        
        // Refresh the detail view
        if (isPR) {
            window.showPRDetail(item.id);
        } else {
            window.showIssueDetail(item.id);
        }
        
    } catch (error) {
        console.error('Error updating assignees:', error);
        showError('Failed to update assignees: ' + error.message);
        button.disabled = false;
        button.textContent = 'Update Assignees';
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
        
        await closeIssue(owner, repo, issue.number, newState);
        showSuccess(`Issue #${issue.number} ${newState === 'closed' ? 'closed' : 'reopened'} successfully!`);
        
        // Update the current item state
        issue.state = newState;
        
        // Refresh only this repository's data to keep the list updated
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
    
    // Add "All Private" and "All Public" options
    panelHTML += `<button class="filter-option-all ${appState.currentFilter === '__private__' ? 'selected' : ''}" onclick="selectFilter('__private__')">All Private</button>`;
    panelHTML += `<button class="filter-option-all ${appState.currentFilter === '__public__' ? 'selected' : ''}" onclick="selectFilter('__public__')">All Public</button>`;
    
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
    
    // Save filter state to storage
    saveAppStateToStorage();
    
    // Close the filter panel
    document.getElementById('filterPanel').style.display = 'none';
    document.querySelector('.filter-arrow').classList.remove('open');
    
    // Update filter display
    updateFilterDisplay();
    
    // Clear last commenter cache and reload data with filter
    clearLastCommenterCache();
    await loadData(filterValue || null);
}

export async function clearFilter() {
    appState.currentFilter = null;
    
    // Save cleared filter state to storage
    saveAppStateToStorage();
    
    // Update UI
    updateFilterDisplay();
    document.getElementById('filterClearBtn').style.display = 'none';
    
    // Close panel if open
    document.getElementById('filterPanel').style.display = 'none';
    document.querySelector('.filter-arrow').classList.remove('open');
    
    // Clear last commenter cache and reload all data
    clearLastCommenterCache();
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
    
    // Save the collapsed state to localStorage
    saveAppStateToStorage();
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
    
    // Save state filter to storage
    saveAppStateToStorage();
    
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
        if (appState.currentFilter === '__private__') {
            filterSelection.textContent = 'All Private';
        } else if (appState.currentFilter === '__public__') {
            filterSelection.textContent = 'All Public';
        } else if (appState.currentFilter.includes('/')) {
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