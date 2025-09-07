// Main Application Entry Point
import { appState } from './state.js';
import { authenticate, logout, checkExistingAuth } from './auth.js';
import { loadData } from './api.js';
import { showTab, hideDetail, openCommentModal, closeCommentModal, updateSendButton, sendComment, showIssueDetail, showPRDetail, mergePR, closePR, applyFilter, clearFilter, toggleFilterPanel, toggleRepoGroup, selectFilter } from './ui.js';
import { registerServiceWorker, setupInstallPrompt, installApp, hideInstallPrompt } from './pwa.js';

// Export functions that need to be available globally
export function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    loadData();
}

export function refreshData() {
    loadData();
}

export function showProfile() {
    const tokenInfo = appState.tokenScopes || localStorage.getItem('github_token_scopes') || 'Unknown token type';
    
    let permissionGuidance = '';
    if (tokenInfo.includes('Fine-grained')) {
        permissionGuidance = '\n✅ Fine-grained PAT detected\n\nRequired permissions for full functionality:\n• Issues: Read and Write\n• Pull requests: Read and Write\n• Metadata: Read\n\n⚠️ For organization repos:\n• Org must allow fine-grained PATs\n• You may need approval from org owners\n• Check: github.com/settings/personal-access-tokens';
    } else if (tokenInfo.includes('Classic')) {
        permissionGuidance = '\n✅ Classic PAT detected\n\nRequired scopes for full functionality:\n• repo (for private repos)\n• public_repo (for public repos only)\n\nYour scopes: ' + (tokenInfo.split(':')[1] || 'Unknown');
    } else {
        permissionGuidance = '\n⚠️ Token type could not be determined\n\nIf you\'re having issues (403 errors):\n1. Check token permissions at GitHub\n2. For org repos, ensure org allows your token type\n3. Consider regenerating token with correct permissions';
    }
    
    const message = `Signed in as ${appState.user.login}${permissionGuidance}\n\nSign out?`;
    
    if (confirm(message)) {
        logout();
    }
}

// Initialize app
export function initApp() {
    try {
        // Check for existing auth
        if (checkExistingAuth()) {
            showMainApp();
            return;
        }
        
        // Show auth screen
        const authScreen = document.getElementById('authScreen');
        if (authScreen) {
            authScreen.style.display = 'flex';
        }
        
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