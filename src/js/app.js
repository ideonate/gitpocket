// Main Application Entry Point
import { appState } from './state.js';
import { authenticate, logout, checkExistingAuth } from './auth.js';
import { loadData } from './api.js';
import { showTab, hideDetail, openCommentModal, closeCommentModal, updateSendButton, sendComment, showIssueDetail, showPRDetail, mergePR, closePR, applyFilter, clearFilter, toggleFilterPanel, toggleRepoGroup, selectFilter, refreshDetail, createNewIssue, submitNewIssue, toggleIssueState, toggleComment, handleReaction, showReactionPicker, pickReaction, showSuccess } from './ui.js';
import { registerServiceWorker, setupInstallPrompt, installApp, hideInstallPrompt } from './pwa.js';
import { showTokenManagementUI } from './authUI.js';
import { tokenManager } from './tokenManager.js';

// Export functions that need to be available globally
export function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    loadData();
}

export async function refreshData() {
    try {
        await loadData();
        showSuccess('Refreshed successfully!');
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

export function showProfile() {
    // Create a profile dialog with token management options
    const dialog = document.createElement('div');
    dialog.className = 'profile-dialog-container';
    
    // Get token statistics
    const allTokens = tokenManager.getAllTokens();
    const personalToken = tokenManager.getPersonalToken();
    const orgTokenCount = allTokens.filter(t => t.type === 'organization').length;
    
    dialog.innerHTML = `
        <div class="profile-dialog">
            <div class="profile-header">
                <h2>👤 Profile</h2>
                <button class="close-btn" onclick="this.closest('.profile-dialog-container').remove()">✕</button>
            </div>
            
            <div class="profile-body">
                <div class="profile-info">
                    <div class="profile-user">
                        <strong>Signed in as:</strong> ${appState.user?.login || 'Unknown'}
                    </div>
                    
                    <div class="token-summary">
                        <h3>Token Status</h3>
                        <div class="token-stats">
                            ${personalToken ? 
                                `<div class="token-stat">✅ Personal token active</div>` : 
                                `<div class="token-stat warning">⚠️ No personal token</div>`
                            }
                            <div class="token-stat">${orgTokenCount} organization token${orgTokenCount !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="profile-btn primary" onclick="showTokenManagementUI(); this.closest('.profile-dialog-container').remove()">
                        🔐 Manage Tokens
                    </button>
                    
                    <button class="profile-btn secondary" onclick="if(confirm('Sign out from GitPocket?')) { logout(); }">
                        🚪 Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .profile-dialog-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        
        .profile-dialog {
            background: white;
            border-radius: 12px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .profile-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .profile-header h2 {
            margin: 0;
            font-size: 20px;
            color: #333;
        }
        
        .profile-body {
            padding: 20px;
        }
        
        .profile-info {
            margin-bottom: 20px;
        }
        
        .profile-user {
            font-size: 16px;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .token-summary h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .token-stats {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .token-stat {
            font-size: 14px;
            color: #333;
        }
        
        .token-stat.warning {
            color: #ff9800;
        }
        
        .profile-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .profile-btn {
            padding: 12px;
            border-radius: 8px;
            border: none;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .profile-btn.primary {
            background: #6750a4;
            color: white;
        }
        
        .profile-btn.primary:hover {
            background: #5a40a0;
        }
        
        .profile-btn.secondary {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
        }
        
        .profile-btn.secondary:hover {
            background: #e8e8e8;
        }
        
        @media (prefers-color-scheme: dark) {
            .profile-dialog {
                background: #1e1e1e;
            }
            
            .profile-header h2 {
                color: #e0e0e0;
            }
            
            .profile-header,
            .profile-user {
                border-color: #333;
            }
            
            .token-stat {
                color: #e0e0e0;
            }
            
            .profile-btn.secondary {
                background: #2a2a2a;
                color: #e0e0e0;
                border-color: #555;
            }
            
            .profile-btn.secondary:hover {
                background: #333;
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(dialog);
    
    // Make showTokenManagementUI available globally
    window.showTokenManagementUI = showTokenManagementUI;
}

// Initialize app
export function initApp() {
    try {
        // Check for existing auth
        if (checkExistingAuth()) {
            showMainApp();
            return;
        }
        
        // Show the new auth screen
        import('./authUI.js').then(({ showAuthScreen }) => {
            showAuthScreen();
        });
        
        // Modal backdrop click to close
        const commentModal = document.getElementById('commentModal');
        if (commentModal) {
            commentModal.addEventListener('click', (e) => {
                if (e.target === commentModal) {
                    closeCommentModal();
                }
            });
        }
        
    } catch (error) {
        console.error('Init error:', error);
        // Show a fallback error message
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 32px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h2 style="margin-bottom: 16px;">App Initialization Error</h2>
                <p style="margin-bottom: 24px; color: #666; line-height: 1.4;">
                    The app encountered an error during startup. This might be due to browser compatibility issues.
                </p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #6750a4; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Retry
                </button>
                <div style="margin-top: 24px; font-size: 14px; color: #999;">
                    Try using Chrome, Safari, or Firefox for the best experience.
                </div>
            </div>
        `;
    }
}

// Make functions available globally for onclick handlers
window.authenticate = authenticate;
window.showTab = showTab;
window.hideDetail = hideDetail;
window.openCommentModal = openCommentModal;
window.closeCommentModal = closeCommentModal;
window.updateSendButton = updateSendButton;
window.sendComment = sendComment;
window.refreshData = refreshData;
window.showProfile = showProfile;
window.showIssueDetail = showIssueDetail;
window.showPRDetail = showPRDetail;
window.mergePR = mergePR;
window.closePR = closePR;
window.installApp = installApp;
window.hideInstallPrompt = hideInstallPrompt;
window.applyFilter = applyFilter;
window.clearFilter = clearFilter;
window.toggleFilterPanel = toggleFilterPanel;
window.toggleRepoGroup = toggleRepoGroup;
window.selectFilter = selectFilter;
window.refreshDetail = refreshDetail;
window.createNewIssue = createNewIssue;
window.submitNewIssue = submitNewIssue;
window.toggleIssueState = toggleIssueState;
window.toggleComment = toggleComment;
window.handleReaction = handleReaction;
window.showReactionPicker = showReactionPicker;
window.pickReaction = pickReaction;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    setupInstallPrompt();
    initApp();
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});